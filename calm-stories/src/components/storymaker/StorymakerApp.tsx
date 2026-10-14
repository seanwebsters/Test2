"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { ConceptProposal, ConversationMessage, DirectionProposal } from "@/lib/types";
import { ConfirmProvider, useConfirm } from "@/components/ui/Dialog";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { Icon } from "@/components/ui/Icon";
import { SceneArt } from "@/components/art/SceneArt";
import { cx } from "@/lib/util";
import { api, runTool, type ToolOutcome, type Workspace } from "./api";
import { ChatPanel } from "./ChatPanel";
import { SECTIONS, SectionPanel, type Act, type Section } from "./SectionPanels";

export interface SeriesOption {
  id: string;
  title: string;
  status: string;
}

export function StorymakerApp(props: { initialSeriesId: string | null; series: SeriesOption[] }) {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <Inner {...props} />
      </ConfirmProvider>
    </ToastProvider>
  );
}

const SECTION_SET = new Set(SECTIONS.map((s) => s.id));

function Inner({ initialSeriesId, series }: { initialSeriesId: string | null; series: SeriesOption[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const confirm = useConfirm();
  const [seriesId, setSeriesId] = useState<string | null>(initialSeriesId);
  const [ws, setWs] = useState<Workspace | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [section, setSection] = useState<Section>((params?.get("section") as Section) && SECTION_SET.has(params?.get("section") as Section) ? (params!.get("section") as Section) : "overview");
  const [focusId, setFocusId] = useState<string | undefined>(params?.get("episode") ?? undefined);
  const [resolved, setResolved] = useState<Record<string, "confirm" | "cancel">>({});
  const [mobilePanel, setMobilePanel] = useState<"nav" | "chat" | "preview">("chat");
  const [engine, setEngine] = useState<{ provider: string; model: string; simulated: boolean } | null>(null);

  const loadWs = useCallback(async (id: string | null) => {
    if (!id) {
      setWs(null);
      return;
    }
    try {
      const w = await api<Workspace>(`/api/storymaker/series/${id}`);
      setWs(w);
      setEngine({ provider: w.engine.provider, model: w.engine.model, simulated: w.engine.simulated });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't load the series", "error");
    }
  }, [toast]);

  const loadConversation = useCallback(async (id: string | null) => {
    const c = await api<{ messages: ConversationMessage[]; pending_tool_call_ids: string[] }>(`/api/storymaker/conversation${id ? `?series_id=${id}` : ""}`);
    setMessages(c.messages);
    // Confirmation cards that are no longer pending were already handled.
    const pending = new Set(c.pending_tool_call_ids);
    const done: Record<string, "confirm" | "cancel"> = {};
    for (const m of c.messages) for (const card of m.cards ?? []) if (card.type === "confirmation" && !pending.has(card.tool_call_id)) done[card.tool_call_id] = "confirm";
    setResolved(done);
  }, []);

  useEffect(() => {
    void loadWs(seriesId);
    void loadConversation(seriesId);
  }, [seriesId, loadWs, loadConversation]);

  const switchSeries = (id: string | null) => {
    setSeriesId(id);
    setSection("overview");
    setFocusId(undefined);
    router.replace(id ? `/create?series=${id}` : "/create", { scroll: false });
  };

  const applyOutcome = useCallback(
    async (o: ToolOutcome) => {
      if (o.status === "executed") {
        const newSeries = o.result.series_id;
        if (o.result.focus) {
          setSection(o.result.focus.section as Section);
          setFocusId(o.result.focus.id);
        }
        if (newSeries && newSeries !== seriesId) {
          setSeriesId(newSeries);
          router.replace(`/create?series=${newSeries}`, { scroll: false });
          router.refresh();
        } else await loadWs(seriesId);
      }
    },
    [seriesId, loadWs, router],
  );

  /** Direct UI action → tool. The click (plus any dialog) is the creator's confirmation. */
  const act: Act = useCallback(
    async (tool, input, opts) => {
      if (opts?.confirm && !(await confirm(opts.confirm))) return false;
      try {
        const o = await runTool(tool, input, seriesId, true);
        if (o.status === "executed") {
          if (!opts?.quiet) toast(o.result.summary + (o.result.meta?.simulated ? " (simulated)" : ""));
          if (o.result.cards?.length) setMessages((m) => [...m, { id: `local-${Date.now()}`, role: "assistant", content: o.result.summary, cards: o.result.cards, created_at: new Date().toISOString() }]);
        }
        await applyOutcome(o);
        return true;
      } catch (e) {
        toast(e instanceof Error ? e.message : "Something went wrong", "error");
        return false;
      }
    },
    [seriesId, toast, confirm, applyOutcome],
  );

  const send = async (text: string) => {
    setSending(true);
    setMessages((m) => [...m, { id: `pending-${Date.now()}`, role: "user", content: text, created_at: new Date().toISOString() }]);
    try {
      const res = await api<{ series_id: string | null; messages: ConversationMessage[]; focus: { section: string; id?: string } | null; engine: { provider: string; model: string; simulated: boolean } }>("/api/storymaker/chat", {
        method: "POST",
        body: JSON.stringify({ series_id: seriesId, message: text }),
      });
      setEngine(res.engine);
      setMessages((m) => [...m.filter((x) => !x.id.startsWith("pending-")), ...res.messages]);
      if (res.focus) {
        setSection(res.focus.section as Section);
        setFocusId(res.focus.id);
        setMobilePanel((p) => (p === "chat" ? p : "preview"));
      }
      if (res.series_id && res.series_id !== seriesId) {
        setSeriesId(res.series_id);
        router.replace(`/create?series=${res.series_id}`, { scroll: false });
        router.refresh();
      } else await loadWs(seriesId);
    } catch (e) {
      setMessages((m) => m.filter((x) => !x.id.startsWith("pending-")));
      toast(e instanceof Error ? e.message : "Message failed", "error");
    } finally {
      setSending(false);
    }
  };

  const createFromConcept = async (p: ConceptProposal) => {
    const { follow_up_questions: _q, ...input } = p;
    const o = await runTool("create_series", input, null, true).catch((e: Error) => {
      toast(e.message, "error");
      return null;
    });
    if (!o || o.status !== "executed") return;
    toast(o.result.summary);
    // Carry the concept conversation over to the new series.
    setMessages((m) => [...m, { id: `local-${Date.now()}`, role: "assistant", content: o.result.summary, cards: o.result.cards, created_at: new Date().toISOString() }]);
    await applyOutcome(o);
  };

  const resolve = async (id: string, action: "confirm" | "cancel") => {
    setSending(true);
    try {
      const o = await api<ToolOutcome | { status: "cancelled" }>(`/api/storymaker/tool-calls/${id}`, { method: "POST", body: JSON.stringify({ action }) });
      setResolved((r) => ({ ...r, [id]: action }));
      if (o.status === "executed") {
        setMessages((m) => [...m, { id: `local-${Date.now()}`, role: "assistant", content: o.result.summary + (o.result.meta?.simulated ? " _(Simulated – no writing model is configured.)_" : ""), cards: o.result.cards, created_at: new Date().toISOString() }]);
        await applyOutcome(o);
      } else if (o.status === "cancelled") {
        setMessages((m) => [...m, { id: `local-${Date.now()}`, role: "assistant", content: "Okay – I've left that alone.", created_at: new Date().toISOString() }]);
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't complete that", "error");
    } finally {
      setSending(false);
    }
  };

  const acceptDirection = async (p: DirectionProposal, write: boolean) => {
    const o = await runTool("create_episode", { title: p.episode_title, summary: p.summary }, seriesId, true).catch((e: Error) => {
      toast(e.message, "error");
      return null;
    });
    if (!o || o.status !== "executed") return;
    await applyOutcome(o);
    const ep = o.result.data as { id: string } | undefined;
    if (write && ep) await act("write_episode", { episode_id: ep.id });
    else toast(o.result.summary);
  };

  const count = (s: Section): number | null => {
    if (!ws) return null;
    switch (s) {
      case "characters": return ws.characters.length;
      case "relationships": return ws.relationships.length;
      case "seasons": return ws.seasons.length;
      case "episodes": return ws.episodes.length;
      case "script": return ws.episodes.filter((e) => e.has_script).length;
      case "audio": return ws.episodes.filter((e) => e.audio && e.audio.kind !== "sample").length;
      default: return null;
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem-var(--player-h))] flex-col pt-16">
      <div className="flex items-center gap-2 border-b border-white/5 px-3 py-2 lg:hidden" role="tablist" aria-label="Storymaker panels">
        {(["nav", "chat", "preview"] as const).map((p) => (
          <button key={p} role="tab" aria-selected={mobilePanel === p} onClick={() => setMobilePanel(p)} className={cx("flex-1 rounded-full py-1.5 text-sm", mobilePanel === p ? "bg-white text-night" : "text-mist")}>
            {p === "nav" ? "Series" : p === "chat" ? "Assistant" : "Preview"}
          </button>
        ))}
      </div>
      <div className="grid min-h-0 flex-1 lg:grid-cols-[260px_minmax(0,1fr)_440px]">
        {/* Left: navigator */}
        <aside aria-label="Series navigator" className={cx("min-h-0 overflow-y-auto border-r border-white/5 bg-night-2/40 p-4", mobilePanel !== "nav" && "hidden lg:block")}>
          <label htmlFor="series-switch" className="label">Series</label>
          <select id="series-switch" className="input mb-4 py-2 text-sm" value={seriesId ?? ""} onChange={(e) => switchSeries(e.target.value || null)}>
            <option value="">＋ Start something new</option>
            {series.map((s) => <option key={s.id} value={s.id}>{s.title}{s.status !== "published" ? ` (${s.status})` : ""}</option>)}
          </select>
          {ws ? (
            <>
              <div className="mb-4 flex items-center gap-3">
                <span className="h-14 w-11 shrink-0 overflow-hidden rounded-xl ring-1 ring-white/10"><SceneArt spec={ws.series.artwork} className="h-full w-full" /></span>
                <div className="min-w-0">
                  <div className="truncate font-serif text-lg leading-tight">{ws.series.title}</div>
                  <div className="text-[11px] uppercase tracking-wider text-mist">{ws.series.status}</div>
                </div>
              </div>
              <nav aria-label="Series sections">
                <ul className="space-y-0.5">
                  {SECTIONS.map((s) => (
                    <li key={s.id}>
                      <button
                        onClick={() => {
                          setSection(s.id);
                          setMobilePanel("preview");
                        }}
                        aria-current={section === s.id ? "true" : undefined}
                        className={cx("flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition", section === s.id ? "bg-white/10 text-white" : "text-mist hover:bg-white/5 hover:text-white")}
                      >
                        {s.label}
                        {count(s.id) !== null && <span className="text-xs text-mist">{count(s.id)}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="mt-6 space-y-2 border-t border-white/5 pt-4 text-xs">
                <Link href={`/studio/series/${ws.series.id}`} className="flex items-center gap-2 text-mist hover:text-white"><Icon name="settings" size={14} /> Manage in Studio</Link>
                {ws.series.status === "published" && <Link href={`/series/${ws.series.slug}`} className="flex items-center gap-2 text-mist hover:text-white"><Icon name="compass" size={14} /> Public page</Link>}
              </div>
            </>
          ) : (
            <p className="text-sm text-mist">Describe an idea to the assistant and Storymaker will shape it into a series you can edit section by section.</p>
          )}
        </aside>

        {/* Centre: assistant */}
        <div className={cx("min-h-0", mobilePanel !== "chat" && "hidden lg:block")}>
          <ChatPanel
            messages={messages}
            sending={sending}
            onSend={send}
            onCreateFromConcept={createFromConcept}
            onResolve={resolve}
            onAcceptDirection={acceptDirection}
            resolved={resolved}
            engine={engine}
          />
        </div>

        {/* Right: live preview */}
        <aside aria-label="Live preview" className={cx("min-h-0 overflow-y-auto border-l border-white/5 bg-night-2/40 p-5", mobilePanel !== "preview" && "hidden lg:block")}>
          {ws ? (
            <SectionPanel ws={ws} section={section} focusId={focusId} act={act} setSection={setSection} setFocus={setFocusId} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="relative mb-6 aspect-[3/4] w-48 overflow-hidden rounded-3xl ring-1 ring-white/10">
                <SceneArt spec={{ scene: "forest", palette: ["#0d1630", "#2f3a62", "#ffc1d9", "#fff1c9"], seed: 99 }} className="h-full w-full" />
              </div>
              <p className="headline text-2xl">Your series will appear here</p>
              <p className="mt-2 max-w-xs text-sm text-mist">Artwork, world, characters, outlines, scripts and audio – updating live as you work.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

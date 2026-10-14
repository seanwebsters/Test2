"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ArtworkSpec, ContinuityReport, ScriptSettings, ScriptVersion } from "@/lib/types";
import { sleepSuitability } from "@/lib/story/checks";
import { SceneArt } from "@/components/art/SceneArt";
import { Icon } from "@/components/ui/Icon";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { ConfirmProvider, useConfirm } from "@/components/ui/Dialog";
import { ScriptSettingsForm, StatusPill } from "@/components/storymaker/SectionPanels";
import { api, runTool } from "@/components/storymaker/api";
import { cx, relativeTime, wordCount } from "@/lib/util";

const ACTIONS: { id: string; label: string }[] = [
  { id: "rewrite", label: "Rewrite" },
  { id: "expand", label: "Expand" },
  { id: "shorten", label: "Shorten" },
  { id: "atmospheric", label: "More atmospheric" },
  { id: "dialogue", label: "Improve dialogue" },
  { id: "sensory", label: "Add sensory detail" },
  { id: "relaxing", label: "More relaxing" },
  { id: "ending", label: "Change the ending" },
  { id: "continuity", label: "Improve continuity" },
];

type Props = {
  series: { id: string; title: string; artwork: ArtworkSpec };
  episode: { id: string; number: number; title: string; summary: string; status: string };
  initial: { content: string; versionId: string | null; simulated: boolean };
  settings: ScriptSettings | null;
  versions: Omit<ScriptVersion, "content">[];
  engine: { simulated: boolean; label: string };
};

export function ScriptEditor(props: Props) {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <Editor {...props} />
      </ConfirmProvider>
    </ToastProvider>
  );
}

function Editor({ series, episode, initial, settings: initialSettings, versions: initialVersions, engine }: Props) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const ref = useRef<HTMLTextAreaElement>(null);
  const [content, setContent] = useState(initial.content);
  const [saved, setSaved] = useState(initial.content);
  const [versions, setVersions] = useState(initialVersions);
  const [sel, setSel] = useState<{ start: number; end: number } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [custom, setCustom] = useState("");
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [continuity, setContinuity] = useState<ContinuityReport | null>(null);
  const [settings, setSettings] = useState<ScriptSettings>(
    initialSettings ?? { duration_minutes: 30, mood: "dreamy", perspective: "third", style: "lyrical", dialogue: "light", romance: "gentle", pacing: "slow" },
  );
  const locked = ["in_review", "approved", "published"].includes(episode.status);
  const dirty = content !== saved;
  const words = wordCount(content);
  const sleep = useMemo(() => (content ? sleepSuitability(content) : null), [content]);

  const reload = useCallback(async () => {
    const d = await api<{ current: ScriptVersion | null; versions: Omit<ScriptVersion, "content">[] }>(`/api/storymaker/episodes/${episode.id}/script`);
    setContent(d.current?.content ?? "");
    setSaved(d.current?.content ?? "");
    setVersions(d.versions);
  }, [episode.id]);

  const save = useCallback(async () => {
    if (!dirty || locked) return true;
    setBusy("save");
    try {
      await runTool("save_script", { episode_id: episode.id, content }, series.id);
      await reload();
      toast("Saved as a new version.");
      return true;
    } catch (e) {
      toast(e instanceof Error ? e.message : "Save failed", "error");
      return false;
    } finally {
      setBusy(null);
    }
  }, [dirty, locked, episode.id, content, series.id, reload, toast]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        void save();
      }
    };
    const onUnload = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [save, dirty]);

  const trackSelection = () => {
    const el = ref.current;
    if (!el) return;
    setSel(el.selectionEnd > el.selectionStart ? { start: el.selectionStart, end: el.selectionEnd } : null);
  };

  const rewrite = async (instruction: string) => {
    if (!(await save())) return;
    const range = instruction === "ending" && !sel ? {} : sel ? { start: sel.start, end: sel.end } : null;
    if (range === null) {
      toast("Select a passage in the script first.", "error");
      return;
    }
    setBusy(instruction);
    try {
      const o = await runTool("rewrite_script_section", { episode_id: episode.id, instruction, ...range, custom: custom || undefined }, series.id);
      if (o.status === "executed") {
        toast(o.result.summary + (o.result.meta?.simulated ? " (simulated)" : ""));
        await reload();
        const d = o.result.data as { start: number; end: number } | undefined;
        if (d) requestAnimationFrame(() => { ref.current?.focus(); ref.current?.setSelectionRange(d.start, d.end); setSel(d); });
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "Rewrite failed", "error");
    } finally {
      setBusy(null);
    }
  };

  const insert = (text: string) => {
    const el = ref.current;
    if (!el) return;
    const s = el.selectionStart;
    const e = el.selectionEnd;
    const next = content.slice(0, s) + text + content.slice(e);
    setContent(next);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + text.length, s + text.length); });
  };
  const wrap = (mark: string) => {
    const el = ref.current;
    if (!el || el.selectionEnd <= el.selectionStart) return;
    const s = el.selectionStart;
    const e = el.selectionEnd;
    setContent(content.slice(0, s) + mark + content.slice(s, e) + mark + content.slice(e));
  };

  const writeEpisode = async () => {
    if (content && !(await confirm({ title: "Rewrite the whole episode?", body: "A new version will be written from the Story Bible. Your current text stays in the version history.", confirmLabel: "Write new version" }))) return;
    setBusy("write");
    try {
      const o = await runTool("write_episode", { episode_id: episode.id, settings }, series.id);
      if (o.status === "executed") {
        toast(o.result.summary);
        const card = o.result.cards?.find((c) => c.type === "continuity");
        if (card && card.type === "continuity") setContinuity(card.report);
        await reload();
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "Writing failed", "error");
    } finally {
      setBusy(null);
    }
  };

  const check = async () => {
    if (!(await save())) return;
    setBusy("continuity");
    try {
      const o = await runTool("check_story_continuity", { episode_id: episode.id }, series.id);
      if (o.status === "executed") setContinuity(o.result.data as ContinuityReport);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Check failed", "error");
    } finally {
      setBusy(null);
    }
  };

  const restore = async (v: Omit<ScriptVersion, "content">) => {
    if (dirty && !(await confirm({ title: "Discard unsaved changes?", body: "Restoring will replace your unsaved edits.", danger: true, confirmLabel: "Restore anyway" }))) return;
    await runTool("restore_script_version", { version_id: v.id }, series.id);
    await reload();
    toast(`Restored version ${v.version}.`);
  };

  const approve = async () => {
    if (!(await save())) return;
    try {
      const o = await runTool("approve_script", { episode_id: episode.id }, series.id);
      if (o.status === "executed") toast(o.result.summary);
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't approve", "error");
    }
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-16 pt-24 sm:px-8">
      <nav aria-label="Breadcrumb" className="text-xs text-mist">
        <Link href="/studio" className="hover:text-white">Studio</Link> ›{" "}
        <Link href={`/studio/series/${series.id}`} className="hover:text-white">{series.title}</Link> › Episode {episode.number}
      </nav>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <span className="h-16 w-12 overflow-hidden rounded-xl ring-1 ring-white/10"><SceneArt spec={series.artwork} className="h-full w-full" /></span>
        <div className="min-w-0 flex-1">
          <h1 className="headline text-4xl leading-none">{episode.title}</h1>
          <p className="mt-1 text-sm text-mist">{episode.summary.split("\n")[0]}</p>
        </div>
        <StatusPill status={episode.status} />
        <Link href={`/create?series=${series.id}&section=script&episode=${episode.id}`} className="btn-ghost btn-sm"><Icon name="sparkle" size={14} /> Storymaker</Link>
        {!locked && content && <Link href={`/studio/production?episode=${episode.id}`} className="btn-primary btn-sm"><Icon name="wave" size={14} /> Produce Audio</Link>}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center gap-1 border-b border-white/5 px-3 py-2 text-sm">
            <div role="tablist" className="mr-2 flex rounded-full bg-white/5 p-0.5">
              {(["edit", "preview"] as const).map((m) => (
                <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={cx("rounded-full px-3 py-1 text-xs capitalize", mode === m ? "bg-white text-night" : "text-mist")}>{m}</button>
              ))}
            </div>
            {!locked && mode === "edit" && (
              <>
                <button className="rounded-lg px-2 py-1 text-mist hover:bg-white/5 hover:text-white" onClick={() => wrap("*")} title="Emphasis (narrator stresses the words)"><em>Emphasis</em></button>
                <button className="rounded-lg px-2 py-1 text-mist hover:bg-white/5 hover:text-white" onClick={() => insert(" [pause] ")} title="Insert a breathing pause for narration">Pause</button>
                <button className="rounded-lg px-2 py-1 text-mist hover:bg-white/5 hover:text-white" onClick={() => insert("\n\n---\n\n")} title="Section break (new narration section)">Section break</button>
              </>
            )}
            <span className="ml-auto text-xs text-mist">
              {words.toLocaleString()} words · ~{Math.round(words / 110)} min narrated {dirty ? "· unsaved" : "· saved"}
            </span>
            {!locked && (
              <button className="btn-primary btn-sm ml-2" disabled={!dirty || busy === "save"} onClick={() => save()}>{busy === "save" ? "Saving…" : "Save"}</button>
            )}
          </div>
          {initial.simulated && content === initial.content && (
            <p className="bg-amber-300/10 px-5 py-2 text-xs text-amber-100">This draft was produced by the simulator (no writing model configured).</p>
          )}
          {locked && <p className="bg-white/5 px-5 py-2 text-xs text-mist">This episode is {episode.status.replace("_", " ")} – the script is read-only.</p>}
          {mode === "edit" ? (
            <textarea
              ref={ref}
              value={content}
              readOnly={locked}
              onChange={(e) => setContent(e.target.value)}
              onSelect={trackSelection}
              onKeyUp={trackSelection}
              onMouseUp={trackSelection}
              aria-label="Episode script"
              placeholder="No script yet – use “Write Episode” on the right, or start typing."
              className="block h-[68vh] w-full resize-none bg-transparent px-6 py-5 font-serif text-[1.15rem] leading-[1.8] text-white/90 focus:outline-none"
            />
          ) : (
            <article className="h-[68vh] overflow-y-auto px-8 py-6 font-serif text-[1.2rem] leading-[1.85] text-white/90">
              {content.split(/\n\s*\n/).map((p, i) =>
                p.trim() === "---" ? (
                  <hr key={i} className="my-8 border-white/10" />
                ) : (
                  <p key={i} className="mb-5">
                    {p.split(/(\*[^*]+\*|\[pause\])/g).map((part, j) =>
                      part === "[pause]" ? <span key={j} className="mx-1 rounded bg-lavender/15 px-1.5 font-sans text-[10px] uppercase tracking-wider text-lavender">pause</span> : part.startsWith("*") ? <em key={j}>{part.slice(1, -1)}</em> : part,
                    )}
                  </p>
                ),
              )}
            </article>
          )}
        </div>

        <aside className="space-y-5">
          <section className="card p-4" aria-labelledby="ai-h">
            <div className="flex items-center justify-between">
              <h2 id="ai-h" className="font-medium">Ask Storymaker</h2>
              <span className={cx("text-[10px] uppercase tracking-wider", engine.simulated ? "text-amber-200" : "text-emerald-200")}>{engine.label}</span>
            </div>
            <p className="mt-1 text-xs text-mist">{sel ? `${(sel.end - sel.start).toLocaleString()} characters selected.` : "Select a passage in the script, then choose an action."}</p>
            <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Optional note, e.g. “more about the snow”" aria-label="Instruction note" className="input mt-3 py-1.5 text-sm" />
            <div className="mt-3 grid grid-cols-2 gap-1.5">
              {ACTIONS.map((a) => (
                <button
                  key={a.id}
                  disabled={locked || !content || busy !== null || (!sel && a.id !== "ending")}
                  onClick={() => rewrite(a.id)}
                  className="rounded-xl border border-white/10 px-2 py-1.5 text-xs hover:border-lavender/50 hover:bg-lavender/10 disabled:opacity-40"
                >
                  {busy === a.id ? "Working…" : a.label}
                </button>
              ))}
            </div>
          </section>

          <section className="card space-y-3 p-4" aria-labelledby="set-h">
            <h2 id="set-h" className="font-medium">Episode settings</h2>
            <ScriptSettingsForm value={settings} onChange={setSettings} />
            <div className="flex flex-wrap gap-2">
              <button className="btn-accent btn-sm" disabled={locked || busy !== null} onClick={writeEpisode}><Icon name="sparkle" size={14} /> {busy === "write" ? "Writing…" : content ? "Write new version" : "Write Episode"}</button>
              <button className="btn-ghost btn-sm" disabled={!content || busy !== null} onClick={check}>{busy === "continuity" ? "Checking…" : "Check continuity"}</button>
              {!locked && content && <button className="btn-ghost btn-sm" onClick={approve}>Approve script</button>}
            </div>
          </section>

          {continuity && (
            <section className="card p-4" aria-labelledby="cont-h">
              <h2 id="cont-h" className="font-medium">Continuity</h2>
              <p className="mt-1 text-xs text-mist">{continuity.summary}</p>
              <ul className="mt-2 space-y-1.5">
                {continuity.issues.map((i, k) => (
                  <li key={k} className={cx("rounded-xl px-3 py-2 text-xs", i.severity === "conflict" ? "bg-rose-400/10" : i.severity === "warn" ? "bg-amber-300/10" : "bg-white/5")}>
                    {i.message}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {sleep && (
            <section className="card p-4" aria-labelledby="sleep-h">
              <div className="flex items-center justify-between">
                <h2 id="sleep-h" className="font-medium">Sleep suitability</h2>
                <span className={cx("font-serif text-2xl", sleep.score >= 80 ? "text-emerald-200" : sleep.score >= 60 ? "text-amber-200" : "text-rose-200")}>{sleep.score}</span>
              </div>
              <ul className="mt-2 space-y-1 text-xs">
                {sleep.issues.map((i, k) => (
                  <li key={k} className={i.severity === "pass" ? "text-mist" : "text-amber-100"}>{i.severity === "pass" ? "✓" : "!"} {i.message}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="card p-4" aria-labelledby="ver-h">
            <h2 id="ver-h" className="font-medium">Versions</h2>
            <ul className="mt-2 max-h-72 space-y-1.5 overflow-y-auto text-xs">
              {versions.map((v, i) => (
                <li key={v.id} className="flex items-start justify-between gap-2 rounded-xl bg-white/[0.03] px-3 py-2">
                  <span>
                    <strong>v{v.version}</strong> · {v.source.replace("_", " ")}{v.simulated ? " (sim)" : ""} · {relativeTime(v.created_at)}
                    <span className="block text-mist">{v.note} · {v.word_count.toLocaleString()} words</span>
                  </span>
                  {i === 0 ? <span className="text-mist">current</span> : !locked && <button className="text-lavender hover:underline" onClick={() => restore(v)}>Restore</button>}
                </li>
              ))}
              {versions.length === 0 && <li className="text-mist">No versions yet.</li>}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

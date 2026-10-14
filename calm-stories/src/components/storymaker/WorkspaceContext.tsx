"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { WorkspaceSnapshot } from "@/lib/storymaker/service";
import type { AiConversation } from "@/lib/types";

export const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "world", label: "World Bible" },
  { id: "characters", label: "Characters" },
  { id: "relationships", label: "Relationships" },
  { id: "seasons", label: "Seasons" },
  { id: "episodes", label: "Episodes" },
  { id: "scripts", label: "Scripts" },
  { id: "audio", label: "Audio" },
  { id: "cover", label: "Cover Artwork" },
  { id: "publishing", label: "Publishing" },
] as const;
export type SectionId = (typeof SECTIONS)[number]["id"];

export interface WriterBadge {
  provider: string;
  model: string;
  simulated: boolean;
}

interface PendingConfirm {
  tool_call_id: string;
  reason: string;
  tool: string;
}

export interface ActResult {
  ok: boolean;
  summary?: string;
  data?: unknown;
  error?: string;
}

interface Ctx {
  snapshot: WorkspaceSnapshot | null;
  conversation: AiConversation | null;
  writer: WriterBadge;
  section: SectionId;
  setSection: (s: SectionId) => void;
  episodeId: string | null;
  openEpisode: (id: string | null, section?: SectionId) => void;
  busy: string | null;
  toast: string | null;
  notify: (msg: string | null) => void;
  refresh: () => Promise<void>;
  send: (message: string) => Promise<void>;
  act: (tool: string, input: unknown, opts?: { label?: string; quiet?: boolean }) => Promise<ActResult>;
  resolve: (callId: string, decision: "confirm" | "cancel") => Promise<void>;
  confirm: PendingConfirm | null;
  setConfirm: (c: PendingConfirm | null) => void;
  api: <T>(url: string, init?: RequestInit) => Promise<T>;
}

const WorkspaceCtx = createContext<Ctx | null>(null);

export function useWorkspace(): Ctx {
  const v = useContext(WorkspaceCtx);
  if (!v) throw new Error("useWorkspace outside provider");
  return v;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: Record<string, unknown>,
  ) {
    super(message);
  }
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new ApiError(typeof body.error === "string" ? body.error : `Request failed (${res.status})`, res.status, body);
  return body as T;
}

export function WorkspaceProvider({
  initialSnapshot,
  initialConversation,
  initialEpisodeId,
  writer,
  children,
}: {
  initialSnapshot: WorkspaceSnapshot | null;
  initialConversation: AiConversation | null;
  /** Opens this episode's script on load (links from Creator Studio). */
  initialEpisodeId?: string | null;
  writer: WriterBadge;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [conversation, setConversation] = useState(initialConversation);
  const startEpisode = initialSnapshot?.episodes.find((e) => e.id === initialEpisodeId)?.id ?? null;
  const [section, setSection] = useState<SectionId>(startEpisode ? "scripts" : "overview");
  const [episodeId, setEpisodeId] = useState<string | null>(startEpisode ?? initialSnapshot?.episodes[0]?.id ?? null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);
  const seriesRef = useRef<string | null>(initialSnapshot?.series.id ?? null);
  const convRef = useRef<string | null>(initialConversation?.id ?? null);
  convRef.current = conversation?.id ?? convRef.current;

  const loadSeries = useCallback(async (id: string) => {
    const snap = await api<WorkspaceSnapshot>(`/api/storymaker/series/${id}`);
    setSnapshot(snap);
    return snap;
  }, []);

  const refresh = useCallback(async () => {
    if (seriesRef.current) await loadSeries(seriesRef.current);
    const q = seriesRef.current ? `?seriesId=${encodeURIComponent(seriesRef.current)}` : "";
    const { conversation: c } = await api<{ conversation: AiConversation | null }>(`/api/storymaker/conversation${q}`);
    if (c) setConversation(c);
  }, [loadSeries]);

  const switchSeries = useCallback(
    async (id: string) => {
      if (seriesRef.current === id) return;
      seriesRef.current = id;
      const snap = await loadSeries(id);
      setEpisodeId(snap.episodes[0]?.id ?? null);
      router.replace(`/create?series=${encodeURIComponent(id)}`, { scroll: false });
    },
    [loadSeries, router],
  );

  const send = useCallback(
    async (message: string) => {
      const optimistic = { id: `tmp-${Date.now()}`, role: "user" as const, content: message, created_at: new Date().toISOString() };
      setConversation((c) => (c ? { ...c, messages: [...c.messages, optimistic] } : { id: "pending", user_id: "", series_id: seriesRef.current, messages: [optimistic], created_at: optimistic.created_at, updated_at: optimistic.created_at }));
      setBusy("Thinking…");
      try {
        const out = await api<{ conversation: AiConversation; seriesId: string | null }>("/api/storymaker/chat", {
          method: "POST",
          body: JSON.stringify({ message, seriesId: seriesRef.current, conversationId: convRef.current }),
        });
        setConversation(out.conversation);
        convRef.current = out.conversation.id;
        if (out.seriesId && out.seriesId !== seriesRef.current) await switchSeries(out.seriesId);
        else if (seriesRef.current) await loadSeries(seriesRef.current);
      } catch (err) {
        setToast(err instanceof Error ? err.message : "Something went wrong");
        setConversation((c) => (c ? { ...c, messages: c.messages.filter((m) => m.id !== optimistic.id) } : c));
      } finally {
        setBusy(null);
      }
    },
    [loadSeries, switchSeries],
  );

  const act = useCallback(
    async (tool: string, input: unknown, opts: { label?: string; quiet?: boolean } = {}): Promise<ActResult> => {
      setBusy(opts.label ?? "Working…");
      try {
        const out = await api<{ summary: string; data: unknown; seriesId: string | null; conversationId: string | null }>("/api/storymaker/action", {
          method: "POST",
          body: JSON.stringify({ tool, input, seriesId: seriesRef.current, conversationId: convRef.current, log: !opts.quiet }),
        });
        if (out.seriesId && out.seriesId !== seriesRef.current) {
          await switchSeries(out.seriesId);
        }
        await refresh();
        if (!opts.quiet) setToast(out.summary);
        return { ok: true, summary: out.summary, data: out.data };
      } catch (err) {
        if (err instanceof ApiError && err.status === 409 && err.body.confirmation) {
          setConfirm(err.body.confirmation as PendingConfirm);
          return { ok: false, error: "Awaiting confirmation" };
        }
        const message = err instanceof Error ? err.message : "Something went wrong";
        setToast(message);
        return { ok: false, error: message };
      } finally {
        setBusy(null);
      }
    },
    [refresh, switchSeries],
  );

  const resolve = useCallback(
    async (callId: string, decision: "confirm" | "cancel") => {
      setBusy(decision === "confirm" ? "Working…" : null);
      try {
        const out = await api<{ summary?: string | null; seriesId?: string | null }>(`/api/storymaker/tool-calls/${callId}`, { method: "POST", body: JSON.stringify({ decision }) });
        setConfirm(null);
        await refresh();
        if (out.summary) setToast(out.summary);
      } catch (err) {
        setConfirm(null);
        await refresh();
        setToast(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setBusy(null);
      }
    },
    [refresh],
  );

  const openEpisode = useCallback((id: string | null, s?: SectionId) => {
    setEpisodeId(id);
    if (s) setSection(s);
  }, []);

  const value = useMemo<Ctx>(
    () => ({ snapshot, conversation, writer, section, setSection, episodeId, openEpisode, busy, toast, notify: setToast, refresh, send, act, resolve, confirm, setConfirm, api }),
    [snapshot, conversation, writer, section, episodeId, openEpisode, busy, toast, refresh, send, act, resolve, confirm],
  );
  return <WorkspaceCtx.Provider value={value}>{children}</WorkspaceCtx.Provider>;
}

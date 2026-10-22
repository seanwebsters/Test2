"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Art, SegmentKind, TranscriptLine } from "@/lib/types";
import { useApp, ApiError } from "@/components/providers/AppState";
import { BrowserVoice, estimateLines } from "./browser-voice";

export interface PlayItem {
  id: string;
  kind: "catalog" | "ai";
  title: string;
  n: number;
  seriesTitle: string;
  seriesHref: string;
  art: Art;
  seed: string;
  duration: number;
  /** AI series only */
  lines?: TranscriptLine[];
  segments?: { kind: SegmentKind; text: string }[];
  insights?: string[];
  challenge?: { question: string; options: string[] } | null;
  audio?: boolean;
}

export type Gate = { item: PlayItem; reason: "locked" | "daily_limit" | "upcoming" | "no_audio" };
export type SleepMode = { mode: "off" } | { mode: "timer"; endsAt: number; minutes: number } | { mode: "episode" };

interface PlayerCtx {
  current: PlayItem | null;
  queue: PlayItem[];
  playing: boolean;
  loading: boolean;
  position: number;
  duration: number;
  rate: number;
  sleep: SleepMode;
  lines: TranscriptLine[];
  insights: string[];
  challenge: { question: string; options: string[] } | null;
  expanded: boolean;
  ended: boolean;
  gate: Gate | null;
  usingBrowserVoice: boolean;
  play: (item: PlayItem, opts?: { queue?: PlayItem[]; from?: number }) => Promise<void>;
  toggle: () => void;
  pause: () => void;
  seek: (t: number) => void;
  skip: (d: number) => void;
  next: () => void;
  setRate: (r: number) => void;
  setSleep: (s: SleepMode) => void;
  setExpanded: (v: boolean) => void;
  addToQueue: (item: PlayItem, front?: boolean) => void;
  removeFromQueue: (id: string) => void;
  clearGate: () => void;
}

const Ctx = createContext<PlayerCtx | null>(null);
const STORAGE = "kh_player_v1";
const RATES = [0.75, 1, 1.25, 1.5, 2];
export { RATES };

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { api, state, toast } = useApp();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const voiceRef = useRef<BrowserVoice | null>(null);
  const [current, setCurrent] = useState<PlayItem | null>(null);
  const [queue, setQueue] = useState<PlayItem[]>([]);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRateState] = useState(1);
  const [sleep, setSleepState] = useState<SleepMode>({ mode: "off" });
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [challenge, setChallenge] = useState<PlayerCtx["challenge"]>(null);
  const [expanded, setExpanded] = useState(false);
  const [ended, setEnded] = useState(false);
  const [gate, setGate] = useState<Gate | null>(null);
  const [usingBrowserVoice, setUsingBrowserVoice] = useState(false);
  const lastPing = useRef(0);
  const currentRef = useRef<PlayItem | null>(null);
  const positionRef = useRef(0);
  const restored = useRef(false);
  const progressRef = useRef(state?.progress);
  progressRef.current = state?.progress;
  currentRef.current = current;
  positionRef.current = position;

  // ── progress reporting
  const report = useCallback(
    async (completed = false) => {
      const item = currentRef.current;
      if (!item) return;
      lastPing.current = Date.now();
      const body = { episodeId: item.id, position: Math.round(positionRef.current * 10) / 10, completed };
      try {
        await api(item.kind === "ai" ? "/api/ai/progress" : "/api/progress", { body });
      } catch (e) {
        if (e instanceof ApiError && e.status === 403) audioRef.current?.pause();
      }
    },
    [api],
  );

  const load = useCallback(
    async (item: PlayItem, from?: number, autoplay = true) => {
      setLoading(true);
      setEnded(false);
      setGate(null);
      voiceRef.current?.stop();
      setUsingBrowserVoice(false);
      let src: string | null = null;
      let ls: TranscriptLine[] = [];
      let ins: string[] = [];
      let ch: PlayerCtx["challenge"] = null;
      try {
        if (item.kind === "catalog") {
          const detail = await api<{ access: { ok: boolean; reason: Gate["reason"] }; lines?: TranscriptLine[]; insights?: string[]; challenge?: PlayerCtx["challenge"] }>(`/api/episodes/${item.id}`);
          if (!detail.access.ok) {
            setGate({ item, reason: detail.access.reason });
            setLoading(false);
            return false;
          }
          src = `/api/episodes/${item.id}/audio`;
          ls = detail.lines ?? [];
          ins = detail.insights ?? [];
          ch = detail.challenge ?? null;
        } else {
          ls = item.lines ?? (item.segments ? estimateLines(item.segments) : []);
          ins = item.insights ?? [];
          ch = item.challenge ?? null;
          src = item.audio ? `/api/ai/audio/${item.id}` : null;
        }
      } catch (e) {
        toast({ title: "Couldn't load that episode", body: e instanceof Error ? e.message : undefined, tone: "coral" });
        setLoading(false);
        return false;
      }
      setCurrent(item);
      setLines(ls);
      setInsights(ins);
      setChallenge(ch);
      setDuration(item.duration);
      const prev = progressRef.current?.[item.id];
      const start = from ?? (prev && !prev.completed && prev.position < item.duration - 5 ? prev.position : 0);
      setPosition(start);
      const audio = audioRef.current!;
      if (src) {
        audio.src = src;
        audio.playbackRate = rate;
        audio.currentTime = start;
        if (autoplay) {
          try {
            await audio.play();
          } catch {
            /* autoplay blocked: the user can press play */
          }
        }
      } else {
        audio.removeAttribute("src");
        setUsingBrowserVoice(true);
        const voice = new BrowserVoice(ls, {
          onTime: (t) => setPosition(t),
          onEnd: () => onEndedRef.current(),
          onState: (p) => setPlaying(p),
        });
        voiceRef.current = voice;
        voice.setRate(rate);
        if (autoplay) voice.play(start);
      }
      setLoading(false);
      return true;
    },
    [api, rate, toast],
  );

  const play = useCallback(
    async (item: PlayItem, opts?: { queue?: PlayItem[]; from?: number }) => {
      if (currentRef.current && currentRef.current.id !== item.id && positionRef.current > 3) await report(false);
      const ok = await load(item, opts?.from);
      if (ok && opts?.queue) setQueue(opts.queue.filter((q) => q.id !== item.id));
    },
    [load, report],
  );

  const next = useCallback(() => {
    setQueue((q) => {
      const [head, ...rest] = q;
      if (head) void load(head);
      return rest;
    });
  }, [load]);

  const onEnded = useCallback(async () => {
    setPlaying(false);
    setEnded(true);
    setPosition(currentRef.current?.duration ?? positionRef.current);
    positionRef.current = currentRef.current?.duration ?? positionRef.current;
    await report(true);
    if (sleepRef.current.mode === "episode") {
      setSleepState({ mode: "off" });
      return;
    }
  }, [report]);
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;
  const sleepRef = useRef(sleep);
  sleepRef.current = sleep;

  // ── audio element wiring
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;
    const onTime = () => {
      setPosition(audio.currentTime);
      if (Date.now() - lastPing.current > 10000 && !audio.paused) void reportRef.current(false);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => {
      setPlaying(false);
      if (!audio.ended && currentRef.current) void reportRef.current(false);
    };
    const onMeta = () => Number.isFinite(audio.duration) && setDuration(audio.duration);
    const onEnd = () => onEndedRef.current();
    const onError = () => {
      if (audio.src) toast({ title: "Playback stopped", body: "The audio couldn't be loaded.", tone: "coral" });
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("error", onError);
    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("error", onError);
    };
  }, [toast]);
  const reportRef = useRef(report);
  reportRef.current = report;

  // Browser-voice progress pings
  useEffect(() => {
    if (!usingBrowserVoice || !playing) return;
    const t = setInterval(() => void reportRef.current(false), 10000);
    return () => clearInterval(t);
  }, [usingBrowserVoice, playing]);

  const toggle = useCallback(() => {
    if (!currentRef.current) return;
    if (usingBrowserVoice) {
      const v = voiceRef.current!;
      if (v.playing) v.pause();
      else v.play(ended ? 0 : positionRef.current);
      setEnded(false);
      return;
    }
    const audio = audioRef.current!;
    if (!audio.src) {
      void load(currentRef.current, positionRef.current);
      return;
    }
    if (audio.paused) {
      if (ended) audio.currentTime = 0;
      setEnded(false);
      void audio.play();
    } else audio.pause();
  }, [usingBrowserVoice, ended, load]);

  const pause = useCallback(() => {
    if (usingBrowserVoice) voiceRef.current?.pause();
    else audioRef.current?.pause();
  }, [usingBrowserVoice]);

  const seek = useCallback(
    (t: number) => {
      const d = currentRef.current?.duration ?? duration;
      const clamped = Math.max(0, Math.min(d - 0.2, t));
      setPosition(clamped);
      setEnded(false);
      if (usingBrowserVoice) voiceRef.current?.seek(clamped);
      else if (audioRef.current?.src) audioRef.current.currentTime = clamped;
    },
    [duration, usingBrowserVoice],
  );
  const skip = useCallback((d: number) => seek(positionRef.current + d), [seek]);

  const setRate = useCallback((r: number) => {
    setRateState(r);
    if (audioRef.current) audioRef.current.playbackRate = r;
    voiceRef.current?.setRate(r);
  }, []);

  // ── sleep timer with a gentle fade
  const setSleep = useCallback((s: SleepMode) => setSleepState(s), []);
  useEffect(() => {
    if (sleep.mode !== "timer") return;
    const audio = audioRef.current!;
    const tick = setInterval(() => {
      const left = sleep.endsAt - Date.now();
      if (left <= 0) {
        pause();
        audio.volume = 1;
        setSleepState({ mode: "off" });
        toast({ title: "Sleep timer", body: "Paused. Sweet dreams, curious mind.", tone: "lavender", icon: "moon" });
      } else if (left < 10000) audio.volume = Math.max(0.05, left / 10000);
    }, 500);
    return () => {
      clearInterval(tick);
      audio.volume = 1;
    };
  }, [sleep, pause, toast]);

  const addToQueue = useCallback(
    (item: PlayItem, front = false) => {
      setQueue((q) => {
        const rest = q.filter((x) => x.id !== item.id);
        return front ? [item, ...rest] : [...rest, item];
      });
      toast({ title: front ? "Playing next" : "Added to queue", body: item.title, tone: "plain", icon: "list" });
    },
    [toast],
  );
  const removeFromQueue = useCallback((id: string) => setQueue((q) => q.filter((x) => x.id !== id)), []);

  // ── Media Session (lock screen / headphones)
  useEffect(() => {
    if (!("mediaSession" in navigator) || !current) return;
    navigator.mediaSession.metadata = new MediaMetadata({ title: current.title, artist: current.seriesTitle, album: "KNOWHOW" });
    navigator.mediaSession.setActionHandler("play", () => toggle());
    navigator.mediaSession.setActionHandler("pause", () => pause());
    navigator.mediaSession.setActionHandler("seekbackward", () => skip(-15));
    navigator.mediaSession.setActionHandler("seekforward", () => skip(15));
    navigator.mediaSession.setActionHandler("nexttrack", queue.length ? () => next() : null);
  }, [current, toggle, pause, skip, next, queue.length]);

  // ── persistence across reloads (paused, with position)
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    try {
      const raw = localStorage.getItem(STORAGE);
      if (!raw) return;
      const saved = JSON.parse(raw) as { current: PlayItem; queue: PlayItem[]; position: number; rate: number };
      if (saved.current) {
        setCurrent(saved.current);
        setQueue(saved.queue ?? []);
        setPosition(saved.position ?? 0);
        setDuration(saved.current.duration);
        setRateState(saved.rate ?? 1);
      }
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    if (!current) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE, JSON.stringify({ current, queue, position, rate }));
      } catch {
        /* ignore */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [current, queue, position, rate]);

  // Flush progress when the tab is hidden.
  useEffect(() => {
    const onHide = () => {
      const item = currentRef.current;
      if (document.visibilityState === "hidden" && item && playing) {
        navigator.sendBeacon?.(item.kind === "ai" ? "/api/ai/progress" : "/api/progress", new Blob([JSON.stringify({ episodeId: item.id, position: positionRef.current })], { type: "application/json" }));
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [playing]);

  const value = useMemo<PlayerCtx>(
    () => ({
      current, queue, playing, loading, position, duration, rate, sleep, lines, insights, challenge, expanded, ended, gate, usingBrowserVoice,
      play, toggle, pause, seek, skip, next, setRate, setSleep, setExpanded, addToQueue, removeFromQueue, clearGate: () => setGate(null),
    }),
    [current, queue, playing, loading, position, duration, rate, sleep, lines, insights, challenge, expanded, ended, gate, usingBrowserVoice, play, toggle, pause, seek, skip, next, setRate, setSleep, addToQueue, removeFromQueue],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlayer() {
  const c = useContext(Ctx);
  if (!c) throw new Error("usePlayer outside provider");
  return c;
}

"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { PlayableEpisode } from "@/lib/services/catalog";

export const SPEEDS = [0.75, 0.9, 1, 1.1, 1.25, 1.5] as const;
const FADE_SECONDS = 30;
const SAVE_EVERY_SECONDS = 15;

export type SleepTimer = { kind: "minutes"; minutes: number; endsAt: number } | { kind: "episode" } | null;

export interface PlayerSettings {
  autoplay_next: boolean;
  autoplay_limit: number;
  default_speed: number;
}

interface LoadResponse {
  episode: PlayableEpisode;
  access: { allowed: boolean; reason?: "premium_required" | "not_found" };
  progress: { position_seconds: number; completed: boolean } | null;
  audio_url: string | null;
}

export interface PlayerState {
  episode: PlayableEpisode | null;
  playing: boolean;
  loading: boolean;
  position: number;
  duration: number;
  speed: number;
  volume: number;
  muted: boolean;
  sleepTimer: SleepTimer;
  sleepRemaining: number | null;
  fading: boolean;
  autoplay: boolean;
  gate: PlayableEpisode | null;
  error: string | null;
  expanded: boolean;
}

interface PlayerApi extends PlayerState {
  playEpisode: (id: string, opts?: { startAt?: number; autoplayChain?: boolean }) => Promise<void>;
  toggle: () => void;
  seek: (seconds: number) => void;
  skip: (delta: number) => void;
  next: () => void;
  prev: () => void;
  setSpeed: (s: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  setSleepTimer: (t: number | "episode" | null) => void;
  setAutoplay: (v: boolean) => void;
  dismissGate: () => void;
  setExpanded: (v: boolean) => void;
}

const PlayerContext = createContext<PlayerApi | null>(null);

export function usePlayer(): PlayerApi {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used inside <PlayerProvider>");
  return ctx;
}

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeLocal(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

function anonymousId(): string {
  let id = readLocal<string | null>("cs-anon-id", null);
  if (!id) {
    id = `anon-${Math.random().toString(36).slice(2, 10)}`;
    writeLocal("cs-anon-id", id);
  }
  return id;
}

export function PlayerProvider({
  children,
  signedIn,
  settings,
}: {
  children: ReactNode;
  signedIn: boolean;
  settings: PlayerSettings;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<PlayerState>({
    episode: null,
    playing: false,
    loading: false,
    position: 0,
    duration: 0,
    speed: settings.default_speed,
    volume: 0.9,
    muted: false,
    sleepTimer: null,
    sleepRemaining: null,
    fading: false,
    autoplay: settings.autoplay_next,
    gate: null,
    error: null,
    expanded: false,
  });
  const stateRef = useRef(state);
  stateRef.current = state;
  const autoplayCount = useRef(0);
  const lastSaved = useRef(0);
  const listenedSince = useRef(0);
  const lastTick = useRef<number | null>(null);

  // Restore volume / speed preferences.
  useEffect(() => {
    const prefs = readLocal<{ volume?: number; speed?: number; autoplay?: boolean }>("cs-player-prefs", {});
    setState((s) => ({
      ...s,
      volume: prefs.volume ?? s.volume,
      speed: prefs.speed ?? s.speed,
      autoplay: prefs.autoplay ?? s.autoplay,
    }));
  }, []);

  const persistPrefs = useCallback((patch: Partial<{ volume: number; speed: number; autoplay: boolean }>) => {
    writeLocal("cs-player-prefs", { ...readLocal("cs-player-prefs", {}), ...patch });
  }, []);

  const sendEvent = useCallback((kind: string, ep: PlayableEpisode, position: number, listened: number, beacon = false) => {
    const body = JSON.stringify({ episode_id: ep.id, kind, position_seconds: position, listened_seconds: listened, anonymous_id: anonymousId() });
    if (beacon && navigator.sendBeacon) {
      navigator.sendBeacon("/api/events", new Blob([body], { type: "application/json" }));
      return;
    }
    void fetch("/api/events", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => {});
  }, []);

  const saveProgress = useCallback(
    (beacon = false) => {
      const s = stateRef.current;
      const audio = audioRef.current;
      if (!s.episode || !audio) return;
      const position = audio.currentTime;
      const duration = Number.isFinite(audio.duration) ? audio.duration : s.duration;
      writeLocal(`cs-progress-${s.episode.id}`, { position, duration, at: Date.now() });
      lastSaved.current = position;
      const listened = listenedSince.current;
      listenedSince.current = 0;
      if (listened > 0) sendEvent("progress", s.episode, position, listened, beacon);
      if (!signedIn) return;
      const body = JSON.stringify({ episode_id: s.episode.id, position_seconds: position, duration_seconds: duration });
      if (beacon && navigator.sendBeacon) {
        navigator.sendBeacon("/api/progress", new Blob([body], { type: "application/json" }));
      } else {
        void fetch("/api/progress", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => {});
      }
    },
    [signedIn, sendEvent],
  );

  const applyVolume = useCallback((fadeFactor = 1) => {
    const audio = audioRef.current;
    const s = stateRef.current;
    if (!audio) return;
    audio.volume = s.muted ? 0 : Math.max(0, Math.min(1, s.volume * fadeFactor));
  }, []);

  const playEpisode = useCallback<PlayerApi["playEpisode"]>(
    async (id, opts = {}) => {
      const audio = audioRef.current;
      if (!audio) return;
      if (!opts.autoplayChain) autoplayCount.current = 0;
      const current = stateRef.current;
      if (current.episode?.id === id && audio.src) {
        if (opts.startAt !== undefined) audio.currentTime = opts.startAt;
        await audio.play().catch(() => {});
        return;
      }
      if (current.episode && current.playing) saveProgress();
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const res = await fetch(`/api/episodes/${encodeURIComponent(id)}`, { cache: "no-store" });
        if (!res.ok) throw new Error(res.status === 404 ? "This episode isn't available." : "Couldn't load this episode.");
        const data = (await res.json()) as LoadResponse;
        if (!data.access.allowed || !data.audio_url) {
          setState((s) => ({ ...s, loading: false, gate: data.episode }));
          void fetch("/api/events", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ episode_id: id, kind: "upsell", position_seconds: 0, listened_seconds: 0, anonymous_id: anonymousId() }),
          }).catch(() => {});
          return;
        }
        const local = readLocal<{ position: number; duration: number } | null>(`cs-progress-${id}`, null);
        let start = opts.startAt;
        if (start === undefined) {
          const server = data.progress && !data.progress.completed ? data.progress.position_seconds : null;
          start = server ?? (local && local.position < local.duration - 5 ? local.position : 0);
        }
        audio.src = data.audio_url;
        audio.playbackRate = stateRef.current.speed;
        lastSaved.current = start;
        listenedSince.current = 0;
        setState((s) => ({ ...s, episode: data.episode, position: start ?? 0, duration: 0, loading: false, gate: null }));
        const onReady = () => {
          audio.removeEventListener("loadedmetadata", onReady);
          if (start && start < audio.duration - 2) audio.currentTime = start;
          audio.playbackRate = stateRef.current.speed;
          void audio.play().catch(() => setState((s) => ({ ...s, playing: false })));
        };
        audio.addEventListener("loadedmetadata", onReady);
        audio.load();
      } catch (err) {
        setState((s) => ({ ...s, loading: false, error: err instanceof Error ? err.message : "Playback failed." }));
      }
    },
    [saveProgress],
  );

  // Wire audio element events.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => {
      const now = audio.currentTime;
      if (lastTick.current !== null && !audio.paused) {
        const delta = now - lastTick.current;
        if (delta > 0 && delta < 2) listenedSince.current += delta;
      }
      lastTick.current = now;
      setState((s) => ({ ...s, position: now }));
      if (Math.abs(now - lastSaved.current) >= SAVE_EVERY_SECONDS) saveProgress();
    };
    const onMeta = () => setState((s) => ({ ...s, duration: audio.duration }));
    const onPlay = () => {
      lastTick.current = audio.currentTime;
      setState((s) => ({ ...s, playing: true }));
      const ep = stateRef.current.episode;
      if (ep) sendEvent("play", ep, audio.currentTime, 0);
    };
    const onPause = () => {
      setState((s) => ({ ...s, playing: false }));
      const ep = stateRef.current.episode;
      if (ep && !audio.ended) {
        sendEvent("pause", ep, audio.currentTime, 0);
        saveProgress();
      }
    };
    const onEnded = () => {
      const s = stateRef.current;
      saveProgress();
      if (s.episode) sendEvent("complete", s.episode, audio.currentTime, 0);
      if (s.sleepTimer?.kind === "episode") {
        setState((x) => ({ ...x, sleepTimer: null, playing: false }));
        return;
      }
      if (s.autoplay && s.episode?.next_id && autoplayCount.current < settings.autoplay_limit) {
        autoplayCount.current += 1;
        void playEpisode(s.episode.next_id, { startAt: 0, autoplayChain: true });
      }
    };
    const onError = () => setState((s) => ({ ...s, playing: false, loading: false, error: "The audio couldn't be played." }));
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    const onHide = () => {
      if (document.visibilityState === "hidden") saveProgress(true);
    };
    const onPageHide = () => saveProgress(true);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [playEpisode, saveProgress, sendEvent, settings.autoplay_limit]);

  // Sleep timer with a smooth fade-out over the final 30 seconds.
  useEffect(() => {
    const timer = state.sleepTimer;
    if (!timer || timer.kind !== "minutes") {
      applyVolume(1);
      setState((s) => (s.sleepRemaining === null && !s.fading ? s : { ...s, sleepRemaining: null, fading: false }));
      return;
    }
    const id = window.setInterval(() => {
      const remaining = Math.max(0, (timer.endsAt - Date.now()) / 1000);
      const audio = audioRef.current;
      if (remaining <= FADE_SECONDS) {
        const f = remaining / FADE_SECONDS;
        applyVolume(f * f);
      }
      if (remaining <= 0) {
        audio?.pause();
        window.clearInterval(id);
        setState((s) => ({ ...s, sleepTimer: null, sleepRemaining: null, fading: false }));
        // Restore volume for next time, after the pause has taken effect.
        window.setTimeout(() => applyVolume(1), 300);
        return;
      }
      setState((s) => ({ ...s, sleepRemaining: remaining, fading: remaining <= FADE_SECONDS }));
    }, 250);
    return () => window.clearInterval(id);
  }, [state.sleepTimer, applyVolume]);

  useEffect(() => {
    if (!state.fading) applyVolume(1);
  }, [state.volume, state.muted, state.fading, applyVolume]);

  // Media Session (lock screen / hardware keys).
  useEffect(() => {
    const ep = state.episode;
    if (!ep || !("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({ title: ep.title, artist: ep.creator_name, album: ep.series_title });
    const audio = audioRef.current;
    navigator.mediaSession.setActionHandler("play", () => void audio?.play());
    navigator.mediaSession.setActionHandler("pause", () => audio?.pause());
    navigator.mediaSession.setActionHandler("seekbackward", () => audio && (audio.currentTime = Math.max(0, audio.currentTime - 15)));
    navigator.mediaSession.setActionHandler("seekforward", () => audio && (audio.currentTime = Math.min(audio.duration, audio.currentTime + 30)));
    navigator.mediaSession.setActionHandler("nexttrack", ep.next_id ? () => void playEpisode(ep.next_id!) : null);
    navigator.mediaSession.setActionHandler("previoustrack", ep.prev_id ? () => void playEpisode(ep.prev_id!) : null);
  }, [state.episode, playEpisode]);

  const api = useMemo<PlayerApi>(
    () => ({
      ...state,
      playEpisode,
      toggle: () => {
        const audio = audioRef.current;
        if (!audio || !stateRef.current.episode) return;
        if (audio.paused) {
          autoplayCount.current = 0;
          void audio.play();
        } else audio.pause();
      },
      seek: (seconds) => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.currentTime = Math.max(0, Math.min(seconds, audio.duration || seconds));
        lastTick.current = audio.currentTime;
        setState((s) => ({ ...s, position: audio.currentTime }));
      },
      skip: (delta) => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.currentTime = Math.max(0, Math.min(audio.currentTime + delta, audio.duration || 0));
        lastTick.current = audio.currentTime;
      },
      next: () => {
        const n = stateRef.current.episode?.next_id;
        if (n) void playEpisode(n, { startAt: 0 });
      },
      prev: () => {
        const audio = audioRef.current;
        const p = stateRef.current.episode?.prev_id;
        if (audio && audio.currentTime > 10) audio.currentTime = 0;
        else if (p) void playEpisode(p, { startAt: 0 });
      },
      setSpeed: (speed) => {
        if (audioRef.current) audioRef.current.playbackRate = speed;
        persistPrefs({ speed });
        setState((s) => ({ ...s, speed }));
      },
      setVolume: (volume) => {
        persistPrefs({ volume });
        setState((s) => ({ ...s, volume, muted: false }));
      },
      toggleMute: () => setState((s) => ({ ...s, muted: !s.muted })),
      setSleepTimer: (t) => {
        const ep = stateRef.current.episode;
        if (ep && t !== null) sendEvent("sleep_timer", ep, audioRef.current?.currentTime ?? 0, 0);
        setState((s) => ({
          ...s,
          sleepTimer: t === null ? null : t === "episode" ? { kind: "episode" } : { kind: "minutes", minutes: t, endsAt: Date.now() + t * 60000 },
        }));
      },
      setAutoplay: (autoplay) => {
        persistPrefs({ autoplay });
        setState((s) => ({ ...s, autoplay }));
      },
      dismissGate: () => setState((s) => ({ ...s, gate: null })),
      setExpanded: (expanded) => setState((s) => ({ ...s, expanded })),
    }),
    [state, playEpisode, persistPrefs, sendEvent],
  );

  return (
    <PlayerContext.Provider value={api}>
      {children}
      {/* The single audio element lives in the root layout, so playback survives client-side navigation. */}
      <audio ref={audioRef} preload="metadata" className="hidden" />
    </PlayerContext.Provider>
  );
}

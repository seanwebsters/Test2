"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { PlayerTrack } from "@/lib/services/dto";

export interface PlayerPrefs {
  autoplayNext: boolean;
  autoplayLimit: number;
  defaultSpeed: number;
  defaultSleepMinutes: number | null;
}

interface SleepTimer {
  /** epoch ms when audio should be fully faded, or null for "end of episode". */
  endsAt: number | null;
  mode: "minutes" | "episode";
  minutes?: number;
}

export interface PlayerContextValue {
  track: PlayerTrack | null;
  playing: boolean;
  loading: boolean;
  currentTime: number;
  duration: number;
  speed: number;
  volume: number;
  error: string | null;
  sleep: SleepTimer | null;
  autoplay: boolean;
  autoplayLimitReached: boolean;
  playEpisode: (episodeId: string, opts?: { autoplay?: boolean; fromStart?: boolean }) => Promise<void>;
  toggle: () => void;
  seek: (seconds: number) => void;
  skip: (delta: number) => void;
  next: () => void;
  prev: () => void;
  setSpeed: (s: number) => void;
  setVolume: (v: number) => void;
  setSleepTimer: (minutes: number | "episode" | null) => void;
  setAutoplay: (on: boolean) => void;
  close: () => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used inside <PlayerProvider>");
  return ctx;
}

const FADE_SECONDS = 45;
const SAVE_EVERY_MS = 15000;
const STORAGE_KEY = "calm.player.v1";

function anonymousId(): string {
  try {
    let id = localStorage.getItem("calm.anon");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("calm.anon", id);
    }
    return id;
  } catch {
    return "anon";
  }
}

/**
 * Owns the single <audio> element for the whole app. Mounted in the root
 * layout so playback continues uninterrupted across client-side navigation.
 */
export function PlayerProvider({ children, prefs }: { children: ReactNode; prefs: PlayerPrefs }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [track, setTrack] = useState<PlayerTrack | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeedState] = useState(prefs.defaultSpeed);
  const [volume, setVolumeState] = useState(0.9);
  const [error, setError] = useState<string | null>(null);
  const [sleep, setSleep] = useState<SleepTimer | null>(null);
  const [autoplay, setAutoplayState] = useState(prefs.autoplayNext);
  const [chain, setChain] = useState(0);
  const listenedRef = useRef(0);
  const lastTickRef = useRef<number | null>(null);
  const lastSaveRef = useRef(0);
  const fadingRef = useRef(false);
  const trackRef = useRef<PlayerTrack | null>(null);
  trackRef.current = track;
  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  const report = useCallback((event: "play" | "pause" | "complete" | "progress" | "seek" | "sleep_timer", t?: PlayerTrack | null) => {
    const a = audioRef.current;
    const tr = t ?? trackRef.current;
    if (!a || !tr || !tr.src) return;
    const payload = {
      episodeId: tr.episodeId,
      position: Math.floor(a.currentTime || 0),
      duration: Math.floor(Number.isFinite(a.duration) ? a.duration : 0),
      event,
      listened: Math.floor(listenedRef.current),
      anonymousId: anonymousId(),
    };
    listenedRef.current = 0;
    void fetch("/api/progress", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload), keepalive: true }).catch(() => undefined);
  }, []);

  const playEpisode = useCallback(
    async (episodeId: string, opts: { autoplay?: boolean; fromStart?: boolean } = {}) => {
      const a = audioRef.current;
      if (!a) return;
      if (trackRef.current?.episodeId === episodeId && trackRef.current.src) {
        if (opts.fromStart) a.currentTime = 0;
        if (opts.autoplay !== false) void a.play().catch(() => undefined);
        return;
      }
      if (trackRef.current && !a.paused) report("pause");
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/player/${encodeURIComponent(episodeId)}`);
        if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Could not load episode");
        const t = (await res.json()) as PlayerTrack;
        setTrack(t);
        setCurrentTime(0);
        setDuration(0);
        if (!t.src) {
          a.removeAttribute("src");
          a.load();
          setPlaying(false);
          setError(t.access === "locked" ? "This episode is included with Calm Premium." : "Audio for this episode is not available yet.");
          return;
        }
        a.src = t.src;
        a.playbackRate = speed;
        const start = opts.fromStart ? 0 : t.startAt;
        const onMeta = () => {
          if (start > 0 && start < a.duration - 5) a.currentTime = start;
          a.removeEventListener("loadedmetadata", onMeta);
        };
        a.addEventListener("loadedmetadata", onMeta);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ episodeId: t.episodeId }));
        } catch {}
        if (opts.autoplay !== false) await a.play().catch(() => setError("Tap play to start listening."));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load episode");
      } finally {
        setLoading(false);
      }
    },
    [report, speed],
  );

  // Restore the last episode (paused) after a full page reload.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as { episodeId?: string } | null;
      if (saved?.episodeId) void playEpisode(saved.episodeId, { autoplay: false });
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = useCallback(() => {
    const a = audioRef.current;
    if (!a || !trackRef.current?.src) return;
    if (a.paused) {
      setChain(0);
      void a.play().catch(() => undefined);
    } else a.pause();
  }, []);

  const seek = useCallback(
    (s: number) => {
      const a = audioRef.current;
      if (!a || !Number.isFinite(a.duration)) return;
      a.currentTime = Math.max(0, Math.min(a.duration - 0.5, s));
      setCurrentTime(a.currentTime);
      report("seek");
    },
    [report],
  );

  const skip = useCallback((d: number) => seek((audioRef.current?.currentTime ?? 0) + d), [seek]);
  const next = useCallback(() => {
    const id = trackRef.current?.nextEpisodeId;
    if (id) void playEpisode(id, { fromStart: true });
  }, [playEpisode]);
  const prev = useCallback(() => {
    const a = audioRef.current;
    if (a && a.currentTime > 10) return seek(0);
    const id = trackRef.current?.prevEpisodeId;
    if (id) void playEpisode(id, { fromStart: true });
  }, [playEpisode, seek]);

  const setSpeed = useCallback((s: number) => {
    setSpeedState(s);
    if (audioRef.current) audioRef.current.playbackRate = s;
  }, []);
  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    if (audioRef.current && !fadingRef.current) audioRef.current.volume = v;
  }, []);

  const setSleepTimer = useCallback((m: number | "episode" | null) => {
    fadingRef.current = false;
    if (audioRef.current) audioRef.current.volume = volume;
    if (m === null) setSleep(null);
    else if (m === "episode") setSleep({ endsAt: null, mode: "episode" });
    else setSleep({ endsAt: Date.now() + m * 60000, mode: "minutes", minutes: m });
  }, [volume]);

  useEffect(() => {
    if (prefs.defaultSleepMinutes) setSleepTimer(prefs.defaultSleepMinutes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setAutoplay = useCallback((on: boolean) => {
    setAutoplayState(on);
    setChain(0);
  }, []);

  const close = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      if (!a.paused) report("pause");
      a.pause();
      a.removeAttribute("src");
      a.load();
    }
    setTrack(null);
    setPlaying(false);
    setSleep(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, [report]);

  // Sleep timer: smooth fade over the final FADE_SECONDS, then pause.
  useEffect(() => {
    if (!sleep || sleep.mode !== "minutes" || !sleep.endsAt) return;
    const id = window.setInterval(() => {
      const a = audioRef.current;
      if (!a || !sleep.endsAt) return;
      const remaining = (sleep.endsAt - Date.now()) / 1000;
      if (remaining <= 0) {
        a.pause();
        a.volume = volume;
        fadingRef.current = false;
        report("sleep_timer");
        setSleep(null);
      } else if (remaining < FADE_SECONDS && !a.paused) {
        fadingRef.current = true;
        a.volume = volume * Math.pow(remaining / FADE_SECONDS, 2);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [sleep, volume, report]);

  // Audio element events.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => {
      setCurrentTime(a.currentTime);
      const now = performance.now();
      if (lastTickRef.current !== null && !a.paused) listenedRef.current += Math.min(2, (now - lastTickRef.current) / 1000) * a.playbackRate;
      lastTickRef.current = now;
      if (Date.now() - lastSaveRef.current > SAVE_EVERY_MS && !a.paused) {
        lastSaveRef.current = Date.now();
        report("progress");
      }
      // "End of episode" sleep timer fades the final seconds.
      const t = trackRef.current;
      if (t && Number.isFinite(a.duration)) {
        const left = a.duration - a.currentTime;
        if (left < 12 && !fadingRef.current) {
          // Natural fade-out at the end of every episode avoids abrupt stops.
          a.volume = Math.max(0, volumeRef.current * (left / 12));
        } else if (!fadingRef.current && a.volume !== volumeRef.current) {
          a.volume = volumeRef.current;
        }
      }
    };
    const onPlay = () => {
      setPlaying(true);
      lastTickRef.current = performance.now();
      report("play");
    };
    const onPause = () => {
      setPlaying(false);
      lastTickRef.current = null;
      if (!a.ended) report("pause");
    };
    const onMeta = () => setDuration(a.duration);
    const onWaiting = () => setLoading(true);
    const onPlaying = () => setLoading(false);
    const onError = () => {
      if (a.getAttribute("src")) setError("Playback failed. Check your connection and try again.");
      setLoading(false);
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("waiting", onWaiting);
    a.addEventListener("playing", onPlaying);
    a.addEventListener("error", onError);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("waiting", onWaiting);
      a.removeEventListener("playing", onPlaying);
      a.removeEventListener("error", onError);
    };
  }, [report]);

  // Episode end: mark complete, honour sleep timer and autoplay (with a wellbeing limit).
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onEnded = () => {
      report("complete");
      setPlaying(false);
      a.volume = volumeRef.current;
      if (sleep?.mode === "episode") {
        setSleep(null);
        return;
      }
      const nextId = trackRef.current?.nextEpisodeId;
      if (autoplay && nextId && chain < prefs.autoplayLimit) {
        setChain((c) => c + 1);
        void playEpisode(nextId, { fromStart: true });
      }
    };
    a.addEventListener("ended", onEnded);
    return () => a.removeEventListener("ended", onEnded);
  }, [autoplay, chain, playEpisode, prefs.autoplayLimit, report, sleep]);

  // Lock-screen / hardware media keys.
  useEffect(() => {
    if (!("mediaSession" in navigator) || !track) return;
    navigator.mediaSession.metadata = new MediaMetadata({ title: track.title, artist: track.seriesTitle, album: "Calm Stories" });
    navigator.mediaSession.setActionHandler("play", () => toggle());
    navigator.mediaSession.setActionHandler("pause", () => toggle());
    navigator.mediaSession.setActionHandler("seekbackward", () => skip(-15));
    navigator.mediaSession.setActionHandler("seekforward", () => skip(30));
    navigator.mediaSession.setActionHandler("nexttrack", track.nextEpisodeId ? () => next() : null);
    navigator.mediaSession.setActionHandler("previoustrack", () => prev());
  }, [track, toggle, skip, next, prev]);

  // Save position when the tab is hidden or closed.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden" && audioRef.current && !audioRef.current.paused) report("progress");
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [report]);

  const value = useMemo<PlayerContextValue>(
    () => ({
      track,
      playing,
      loading,
      currentTime,
      duration,
      speed,
      volume,
      error,
      sleep,
      autoplay,
      autoplayLimitReached: autoplay && chain >= prefs.autoplayLimit,
      playEpisode,
      toggle,
      seek,
      skip,
      next,
      prev,
      setSpeed,
      setVolume,
      setSleepTimer,
      setAutoplay,
      close,
    }),
    [track, playing, loading, currentTime, duration, speed, volume, error, sleep, autoplay, chain, prefs.autoplayLimit, playEpisode, toggle, seek, skip, next, prev, setSpeed, setVolume, setSleepTimer, setAutoplay, close],
  );

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <audio ref={audioRef} preload="metadata" className="hidden" />
    </PlayerContext.Provider>
  );
}

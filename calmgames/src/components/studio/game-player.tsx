"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bookmark, Maximize2, Monitor, Pause, Play, RotateCcw, Smartphone, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tip } from "@/components/ui/tooltip";
import { useStudio } from "@/lib/client-store";
import { cn } from "@/lib/utils";

interface Props {
  gameId: string;
  version: number;
  title: string;
  onSave?: () => void;
  saved?: boolean;
}

type GameMessage = { source?: string; type?: string; name?: string; level?: number; data?: Record<string, unknown>; paused?: boolean };

/**
 * The game runs in an iframe sandboxed with only `allow-scripts`: an opaque
 * origin with no cookies, storage or same-origin access to the studio. The
 * player talks to it only through postMessage.
 */
export function GamePlayer({ gameId, version, title, onSave, saved }: Props) {
  const frame = useRef<HTMLIFrameElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const { device, setDevice, sound, setSound } = useStudio();
  const [paused, setPaused] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const session = useRef<string>("");
  const queue = useRef<{ name: string; level?: number; data?: Record<string, unknown> }[]>([]);

  const send = useCallback((msg: Record<string, unknown>) => frame.current?.contentWindow?.postMessage(msg, "*"), []);

  const flush = useCallback(() => {
    if (!queue.current.length || !session.current) return;
    const events = queue.current.splice(0, 100);
    void fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gameId, version, sessionId: session.current, events }), keepalive: true }).catch(() => {});
  }, [gameId, version]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow) return;
      const m = e.data as GameMessage;
      if (m?.source !== "calm-game") return;
      if (m.type === "ready") {
        session.current = `s_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
        setLoaded(true);
        send({ type: "calm:sound", on: sound });
      }
      if (m.type === "state" && typeof m.paused === "boolean") setPaused(m.paused);
      if (m.type === "event" && m.name) {
        // Interactions are counted, not streamed one by one.
        if (m.name === "interaction" && queue.current.filter((q) => q.name === "interaction").length > 20) return;
        queue.current.push({ name: m.name, level: m.level, data: m.data });
        if (m.name !== "interaction") flush();
      }
    };
    window.addEventListener("message", onMessage);
    const timer = setInterval(flush, 4000);
    return () => {
      window.removeEventListener("message", onMessage);
      clearInterval(timer);
      flush();
    };
  }, [flush, send, sound]);

  useEffect(() => {
    setLoaded(false);
    setPaused(false);
  }, [gameId, version, nonce]);

  const togglePause = () => send({ type: paused ? "calm:resume" : "calm:pause" });
  const restart = () => send({ type: "calm:restart" });
  const toggleSound = () => {
    setSound(!sound);
    send({ type: "calm:sound", on: !sound });
  };
  const fullscreen = () => (document.fullscreenElement ? document.exitFullscreen() : wrap.current?.requestFullscreen?.());

  return (
    <div className="flex h-full flex-col">
      <div ref={wrap} className={cn("relative flex flex-1 items-center justify-center overflow-hidden rounded-[28px] bg-gradient-to-b from-ivory-deep to-[#e6ddcf] [&:fullscreen]:rounded-none", device === "mobile" ? "p-6" : "p-0")}>
        <div
          className={cn(
            "relative overflow-hidden bg-midnight/5 transition-all duration-700 ease-[var(--ease-calm)]",
            device === "mobile" ? "aspect-[9/19.5] h-[min(100%,760px)] rounded-[42px] border-[10px] border-midnight shadow-lift" : "h-full w-full rounded-[28px]",
          )}
        >
          <iframe
            key={`${gameId}-${version}-${nonce}`}
            ref={frame}
            src={`/play/${gameId}/${version}`}
            title={`${title} (version ${version})`}
            sandbox="allow-scripts"
            allow="fullscreen; autoplay"
            className="h-full w-full border-0"
            onLoad={() => setTimeout(() => setLoaded(true), 1500)}
          />
          {!loaded && <div className="skeleton absolute inset-0" aria-hidden />}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Tip label={paused ? "Play" : "Pause"}>
            <Button size="icon" variant="secondary" onClick={togglePause} aria-label={paused ? "Play" : "Pause"}>{paused ? <Play /> : <Pause />}</Button>
          </Tip>
          <Tip label="Restart">
            <Button size="icon" variant="secondary" onClick={restart} onDoubleClick={() => setNonce((n) => n + 1)} aria-label="Restart"><RotateCcw /></Button>
          </Tip>
          <Tip label={sound ? "Mute sound" : "Turn sound on"}>
            <Button size="icon" variant="secondary" onClick={toggleSound} aria-label={sound ? "Mute sound" : "Turn sound on"}>{sound ? <Volume2 /> : <VolumeX />}</Button>
          </Tip>
          <Tip label="Fullscreen">
            <Button size="icon" variant="secondary" onClick={fullscreen} aria-label="Fullscreen"><Maximize2 /></Button>
          </Tip>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full bg-ivory-deep p-1" role="group" aria-label="Preview size">
            {(["desktop", "mobile"] as const).map((d) => (
              <button key={d} onClick={() => setDevice(d)} aria-pressed={device === d} className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] transition", device === d ? "bg-paper text-midnight shadow-soft" : "text-ink/60 hover:text-ink")}>
                {d === "desktop" ? <Monitor className="size-3.5" /> : <Smartphone className="size-3.5" />}
                {d === "desktop" ? "Desktop" : "Mobile"}
              </button>
            ))}
          </div>
          {onSave && (
            <Button size="sm" variant={saved ? "soft" : "default"} onClick={onSave}>
              <Bookmark className={cn(saved && "fill-current")} />
              {saved ? "Saved" : "Save version"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

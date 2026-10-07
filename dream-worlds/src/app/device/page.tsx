"use client";

import { useEffect, useRef, useState } from "react";
import { Moon, Play, RotateCcw, Sparkles, Sun, House, Library, Presentation } from "lucide-react";
import { CalmMark } from "@/components/ui/CalmMark";

/**
 * Presenter view: the mobile app running live inside a phone frame,
 * for reviewing the prototype on a laptop or a big screen.
 */
const W = 393;
const H = 852;

const JUMPS = [
  { label: "Home", href: "/", icon: House },
  { label: "Create a Dream", href: "/create", icon: Sparkles },
  { label: "Dream Preview", href: "/dream/orig-midnight-ship", icon: Play },
  { label: "Dream Player", href: "/play/orig-midnight-ship", icon: Moon },
  { label: "Morning", href: "/morning/seed-orig-midnight-ship", icon: Sun },
  { label: "My Dreams", href: "/my-dreams", icon: Library },
];

export default function DevicePage() {
  const frame = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(1);
  const [src, setSrc] = useState("/");

  useEffect(() => {
    const fit = () => setScale(Math.min(1, (window.innerHeight - 48) / (H + 28), (window.innerWidth - 32) / (W + 28)));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const go = (href: string) => {
    setSrc(href);
    if (frame.current) frame.current.src = href;
  };

  return (
    <div className="flex min-h-[100svh] items-center justify-center gap-16 overflow-hidden px-6 py-6">
      <aside className="hidden max-w-sm lg:block">
        <CalmMark className="text-4xl" />
        <h1 className="mt-3 font-display text-5xl font-light leading-[1.05] text-white">
          <span className="text-gradient">Dream Worlds</span>
        </h1>
        <p className="mt-4 text-mist-300">Pick a world. Pick your characters. AI tells you the story — and it grows quieter as you fall asleep.</p>
        <p className="mt-8 text-[11px] font-semibold uppercase tracking-eyebrow text-mist-400">Jump to</p>
        <div className="mt-3 grid gap-2">
          {JUMPS.map((j) => (
            <button key={j.href} onClick={() => go(j.href)} className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm transition ${src === j.href ? "chip-on" : "glass text-mist-100 hover:bg-white/10"}`}>
              <j.icon className="h-4 w-4" /> {j.label}
            </button>
          ))}
          <a href="/pitch" className="glass flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-mist-100 hover:bg-white/10">
            <Presentation className="h-4 w-4" /> Product roadmap
          </a>
          <button onClick={() => frame.current?.contentWindow?.location.reload()} className="mt-2 flex items-center gap-2 text-xs text-mist-400 hover:text-white">
            <RotateCcw className="h-3.5 w-3.5" /> Reload app
          </button>
        </div>
      </aside>

      <div style={{ width: (W + 28) * scale, height: (H + 28) * scale }} className="shrink-0">
        <div style={{ width: W + 28, height: H + 28, transform: `scale(${scale})`, transformOrigin: "top left" }} className="relative rounded-[64px] bg-[#0b0d16] p-[14px] shadow-[0_60px_160px_-40px_rgba(108,91,212,0.55),inset_0_0_0_2px_rgba(255,255,255,0.08)]">
          <div className="relative h-full w-full overflow-hidden rounded-[50px] bg-night-950">
            <iframe ref={frame} src="/" title="Dream Worlds app" className="h-full w-full border-0" />
            {/* status bar */}
            <div className="pointer-events-none absolute inset-x-0 top-0 flex h-[54px] items-center justify-between px-9 pt-1 text-[15px] font-semibold text-white">
              <span>9:41</span>
              <span className="flex items-center gap-1.5">
                <svg width="18" height="12" viewBox="0 0 18 12" fill="white"><rect x="0" y="8" width="3" height="4" rx="1" /><rect x="5" y="5.5" width="3" height="6.5" rx="1" /><rect x="10" y="3" width="3" height="9" rx="1" /><rect x="15" y="0" width="3" height="12" rx="1" /></svg>
                <svg width="26" height="12" viewBox="0 0 26 12"><rect x="0.5" y="0.5" width="22" height="11" rx="3.5" fill="none" stroke="white" strokeOpacity="0.5" /><rect x="2" y="2" width="17" height="8" rx="2" fill="white" /><rect x="24" y="4" width="1.5" height="4" rx="0.75" fill="white" fillOpacity="0.5" /></svg>
              </span>
            </div>
            {/* home indicator */}
            <div className="pointer-events-none absolute bottom-2 left-1/2 h-[5px] w-[134px] -translate-x-1/2 rounded-full bg-white/80" />
            {/* dynamic island */}
            <div className="pointer-events-none absolute left-1/2 top-[11px] h-[34px] w-[124px] -translate-x-1/2 rounded-full bg-black" />
          </div>
          <span className="absolute -left-[3px] top-[180px] h-16 w-[3px] rounded-l bg-[#1a1d2b]" />
          <span className="absolute -right-[3px] top-[220px] h-24 w-[3px] rounded-r bg-[#1a1d2b]" />
        </div>
      </div>
    </div>
  );
}

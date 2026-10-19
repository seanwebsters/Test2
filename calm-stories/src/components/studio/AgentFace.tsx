"use client";

import { useEffect, useState } from "react";
import type { AgentDefinition } from "@/lib/studio/agents";
import type { AgentActivity } from "@/lib/studio/types";
import { cx } from "@/lib/util";

/** An agent as their 3D studio character (from the 3D team), or a simple initial if they haven't been made yet. */
export function AgentFace({ agent, activity = "typing", className, size = "md" }: { agent: Pick<AgentDefinition, "key" | "name" | "bedroom">; activity?: AgentActivity; className?: string; size?: "sm" | "md" | "lg" }) {
  const pose = activity === "sleeping" ? "rest" : "work";
  const [src, setSrc] = useState<string | null>(null);
  // Probe on the client (so a missing sprite falls back cleanly instead of showing a broken image).
  useEffect(() => {
    let alive = true;
    const urls = [`/api/studio/office-render/people/${agent.key}-${pose}.png`, `/api/studio/office-render/people/${agent.key}-work.png`];
    const tryNext = (i: number) => {
      if (i >= urls.length) return;
      const img = new Image();
      img.onload = () => alive && setSrc(urls[i]!);
      img.onerror = () => tryNext(i + 1);
      img.src = urls[i]!;
    };
    tryNext(0);
    return () => {
      alive = false;
    };
  }, [agent.key, pose]);
  const h = size === "lg" ? "h-56" : size === "sm" ? "h-20" : "h-28";
  return (
    <div className={cx("grid place-items-center bg-[radial-gradient(ellipse_at_50%_80%,#2a2f5e_0%,#0c1226_70%)]", h, className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={agent.name} className="h-[88%] w-auto object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.45)]" />
      ) : (
        <span className={cx("grid place-items-center rounded-full font-serif", size === "sm" ? "h-9 w-9 text-base" : "h-12 w-12 text-xl")} style={{ background: agent.bedroom.blanket, color: agent.bedroom.accent }}>{agent.name.charAt(0)}</span>
      )}
    </div>
  );
}

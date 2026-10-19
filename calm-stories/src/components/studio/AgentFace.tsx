"use client";

import { useState } from "react";
import type { AgentDefinition } from "@/lib/studio/agents";
import type { AgentActivity } from "@/lib/studio/types";
import { cx } from "@/lib/util";

/** An agent as their 3D studio character (from the 3D team), or a simple initial if they haven't been made yet. */
export function AgentFace({ agent, activity = "typing", className, size = "md" }: { agent: Pick<AgentDefinition, "key" | "name" | "bedroom">; activity?: AgentActivity; className?: string; size?: "sm" | "md" | "lg" }) {
  const pose = activity === "sleeping" ? "rest" : "work";
  const [src, setSrc] = useState<string | null>(`/api/studio/office-render/people/${agent.key}-${pose}.png`);
  const h = size === "lg" ? "h-56" : size === "sm" ? "h-20" : "h-28";
  return (
    <div className={cx("grid place-items-center bg-[radial-gradient(ellipse_at_50%_80%,#2a2f5e_0%,#0c1226_70%)]", h, className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={agent.name} className="h-[88%] w-auto object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.45)]" onError={() => setSrc(pose === "rest" && src.endsWith("-rest.png") ? `/api/studio/office-render/people/${agent.key}-work.png` : null)} />
      ) : (
        <span className="grid h-12 w-12 place-items-center rounded-full font-serif text-xl" style={{ background: agent.bedroom.blanket, color: agent.bedroom.accent }}>{agent.name.charAt(0)}</span>
      )}
    </div>
  );
}

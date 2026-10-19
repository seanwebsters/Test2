"use client";

import type { AgentDefinition } from "@/lib/studio/agents";
import type { AgentActivity } from "@/lib/studio/types";
import { AgentBedroom } from "./AgentBedroom";

export type AvatarClips = Partial<Record<"resting" | "working" | "thinking" | "needs_you", string>>;

const STATE: Record<AgentActivity, keyof AvatarClips> = {
  sleeping: "resting",
  thinking: "thinking",
  asking_for_help: "needs_you",
  reading: "working",
  typing: "working",
  handing_off: "working",
  celebrating: "working",
};

/** A filmed, photoreal agent when its clip exists for this state; otherwise the drawn bedroom. */
export function AgentAvatar({ agent, activity, clips, className }: { agent: Pick<AgentDefinition, "key" | "bedroom" | "name">; activity: AgentActivity; clips?: AvatarClips; className?: string }) {
  const src = clips?.[STATE[activity]];
  if (!src) return <AgentBedroom agent={agent} activity={activity} className={className} />;
  return <video key={src} src={src} autoPlay muted loop playsInline aria-label={`${agent.name} – ${activity.replace("_", " ")}`} className={`aspect-[16/10] w-full object-cover ${className ?? ""}`} />;
}

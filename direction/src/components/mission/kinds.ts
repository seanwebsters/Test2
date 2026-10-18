import { BookOpen, Dumbbell, Flag, Hammer, Lightbulb, MessagesSquare, Search, type LucideIcon } from "lucide-react";
import type { MissionKind } from "@/lib/content/types";

export const KIND_META: Record<MissionKind, { label: string; icon: LucideIcon; bg: string; fg: string }> = {
  learn: { label: "Learn", icon: BookOpen, bg: "bg-lavender-soft", fg: "text-[#5B47C9] dark:text-lavender" },
  research: { label: "Research", icon: Search, bg: "bg-sun-soft", fg: "text-[#9A6A00] dark:text-sun" },
  create: { label: "Create", icon: Hammer, bg: "bg-coral-soft", fg: "text-coral" },
  connect: { label: "Connect", icon: MessagesSquare, bg: "bg-teal-soft", fg: "text-teal-deep dark:text-teal" },
  reflect: { label: "Reflect", icon: Lightbulb, bg: "bg-mint-soft", fg: "text-teal-deep dark:text-mint" },
  practice: { label: "Practice", icon: Dumbbell, bg: "bg-surface-2", fg: "text-ink-2" },
  quest: { label: "Level quest", icon: Flag, bg: "bg-sun", fg: "text-navy" },
};

export function formatMinutes(m: number): string {
  if (m < 60) return `${m} min`;
  const h = m / 60;
  return h >= 3 ? `${Math.round(h)} hrs+` : `${Number.isInteger(h) ? h : h.toFixed(1)} hr${h > 1 ? "s" : ""}`;
}

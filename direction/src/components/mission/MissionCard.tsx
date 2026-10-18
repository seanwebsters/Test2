import Link from "next/link";
import { Check, Lock } from "lucide-react";
import type { Mission } from "@/lib/content/types";
import { cn } from "@/lib/cn";
import { baseXp } from "@/lib/engine/xp";
import { formatMinutes, KIND_META } from "./kinds";

export function MissionCard({ mission, done, locked, context, href, compact = false }: { mission: Mission; done?: boolean; locked?: boolean; context?: string; href?: string; compact?: boolean }) {
  const meta = KIND_META[mission.kind];
  const Icon = meta.icon;
  const xp = Math.round(baseXp(mission.minutes) * (mission.quest ? 1.5 : 1));
  const body = (
    <div className={cn("card flex items-center gap-3 p-3.5 transition", !locked && !done && "hover:-translate-y-0.5 hover:shadow-lift", done && "opacity-75", locked && "opacity-60")}>
      <div className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-2xl", done ? "bg-teal text-white" : meta.bg, !done && meta.fg)}>
        {done ? <Check size={22} strokeWidth={3} /> : locked ? <Lock size={20} /> : <Icon size={22} />}
      </div>
      <div className="min-w-0 flex-1">
        {context && <div className="truncate text-[11px] font-bold uppercase tracking-wide text-ink-3">{context}</div>}
        <div className={cn("font-display font-bold leading-snug", !compact && "text-[15px]", done && "line-through decoration-2")}>{mission.title}</div>
        <div className="mt-0.5 flex items-center gap-2 text-xs font-semibold text-ink-3">
          <span>{formatMinutes(mission.minutes)}</span>
          <span>·</span>
          <span className="text-teal">+{xp} XP</span>
          {mission.quest && <span className="rounded-full bg-sun px-1.5 py-0.5 text-[10px] font-extrabold text-navy">QUEST</span>}
        </div>
      </div>
    </div>
  );
  return href && !locked ? (
    <Link href={href} className="focus-ring block rounded-3xl">
      {body}
    </Link>
  ) : (
    body
  );
}

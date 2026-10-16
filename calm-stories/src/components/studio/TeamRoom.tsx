"use client";

import { useEffect, useState } from "react";
import { AGENTS } from "@/lib/studio/agents";
import type { AgentState } from "@/lib/studio/team";
import { AgentBedroom } from "./AgentBedroom";
import { AgentDrawer } from "./AgentDrawer";
import { cx } from "@/lib/util";

const ACTIVITY_LABEL: Record<string, string> = {
  sleeping: "Resting",
  reading: "Reviewing",
  typing: "Writing",
  thinking: "Planning",
  handing_off: "Handing off",
  celebrating: "Done!",
  asking_for_help: "Needs you",
};

/** Live AI Team room. Polls real workflow state; every pose reflects a real step. */
export function TeamRoom({ initial, compact }: { initial: AgentState[]; compact?: boolean }) {
  const [agents, setAgents] = useState(initial);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const res = await fetch("/api/studio/team", { cache: "no-store" });
        if (res.ok && alive) setAgents(((await res.json()) as { agents: AgentState[] }).agents);
      } catch {
        /* offline – keep last state */
      }
    };
    const t = setInterval(poll, 3000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);
  const shown = compact ? AGENTS.filter((a) => !a.human).slice(0, 8) : AGENTS;
  return (
    <>
      <ul className={cx("grid gap-4", compact ? "sm:grid-cols-2 xl:grid-cols-4" : "sm:grid-cols-2 xl:grid-cols-4")}>
        {shown.map((def) => {
          const st = agents.find((a) => a.key === def.key);
          const activity = st?.activity ?? "sleeping";
          return (
            <li key={def.key}>
              <button
                onClick={() => setOpen(def.key)}
                className={cx(
                  "group relative block w-full overflow-hidden rounded-3xl border bg-[#0c1226] text-left transition hover:-translate-y-0.5",
                  activity === "asking_for_help" ? "border-amber-300/50 shadow-[0_0_30px_-10px_rgba(255,201,107,0.6)]" : activity === "sleeping" ? "border-white/10" : "border-lavender/40 shadow-glow",
                )}
              >
                <AgentBedroom agent={def} activity={activity} className="block w-full" />
                <div className="relative mx-2 -mt-7 mb-2 rounded-2xl border border-white/10 bg-[#0d1230]/90 p-3 backdrop-blur-md">
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-full text-[13px]" style={{ background: def.bedroom.blanket, color: def.bedroom.accent }}>
                      {def.name.charAt(0)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-serif text-[17px] leading-tight text-white">{def.name}</div>
                      <div className="truncate text-[11px] text-mist">{def.title}</div>
                    </div>
                    <span className={cx("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", activity === "asking_for_help" ? "bg-amber-300/20 text-amber-200" : activity === "sleeping" ? "bg-white/5 text-mist" : "bg-lavender/20 text-lavender")}>
                      {ACTIVITY_LABEL[activity]}
                    </span>
                  </div>
                  {!compact && (
                    <ul className="mt-2 space-y-1 text-[12px]">
                      <li className="flex gap-2 text-white/90">
                        <span className={cx("mt-1 h-2 w-2 shrink-0 rounded-full border", st?.task ? "border-lavender bg-lavender" : "border-white/30")} />
                        <span className="line-clamp-1">{st?.task ? `${st.task.label} · ${st.task.run_title}` : "No current task"}</span>
                      </li>
                      {st?.needs && (
                        <li className="flex gap-2 text-amber-200">
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full border border-amber-300" />
                          <span className="line-clamp-1">Waiting on {st.needs}</span>
                        </li>
                      )}
                      <li className="flex gap-2 text-mist">
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full border border-white/30" />
                        <span className="line-clamp-1">{st?.next.length ? `Next: ${st.next.map((n) => n.label).join(", ")}` : st?.last_output ? `Last: ${st.last_output}` : "Idle"}</span>
                      </li>
                    </ul>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      {open && <AgentDrawer agentKey={open} onClose={() => setOpen(null)} />}
    </>
  );
}

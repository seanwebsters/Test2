import { AGENT_BY_KEY } from "@/lib/studio/agents";
import type { Stage } from "@/lib/studio/pipeline-view";
import type { AgentActivity } from "@/lib/studio/types";
import { cx } from "@/lib/util";
import { AgentFace } from "./AgentFace";

const ACT: Record<Stage["status"], AgentActivity> = {
  completed: "sleeping",
  in_progress: "typing",
  pending: "sleeping",
  blocked: "asking_for_help",
  awaiting: "asking_for_help",
  failed: "asking_for_help",
};

const LABEL: Record<Stage["status"], string> = { completed: "Completed", in_progress: "In progress", pending: "Pending", blocked: "Blocked", awaiting: "Awaiting you", failed: "Failed" };

export function PipelineStrip({ stages }: { stages: Stage[] }) {
  return (
    <ol className="flex gap-2 overflow-x-auto pb-2" aria-label="Production pipeline">
      {stages.map((s, i) => (
        <li key={s.key} className="flex shrink-0 items-center gap-2">
          <div className={cx("w-[148px] overflow-hidden rounded-2xl border bg-[#0c1226]", s.status === "in_progress" ? "border-lavender/60 shadow-glow" : s.status === "awaiting" || s.status === "blocked" ? "border-amber-300/50" : s.status === "failed" ? "border-rose-400/50" : "border-white/10")}>
            <AgentFace agent={AGENT_BY_KEY[s.agent]} activity={s.status === "in_progress" && s.key === "review" ? "reading" : ACT[s.status]} className={cx("w-full", s.status === "pending" && "opacity-60")} />
            <div className="px-2.5 pb-2.5 pt-1 text-center">
              <div className="font-serif text-[16px] leading-tight text-white">{s.label}</div>
              <div className="text-[11px] text-mist">{s.sub}</div>
              <div className={cx("mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]", s.status === "completed" ? "text-emerald-200" : s.status === "in_progress" ? "bg-lavender/15 text-lavender" : s.status === "pending" ? "text-mist" : s.status === "failed" ? "text-rose-300" : "text-amber-200")}>
                <span className={cx("h-1.5 w-1.5 rounded-full", s.status === "completed" ? "bg-emerald-300" : s.status === "in_progress" ? "bg-lavender" : s.status === "pending" ? "bg-white/30" : s.status === "failed" ? "bg-rose-400" : "bg-amber-300")} />
                {LABEL[s.status]}
              </div>
            </div>
          </div>
          {i < stages.length - 1 && <span aria-hidden className="text-mist">→</span>}
        </li>
      ))}
    </ol>
  );
}

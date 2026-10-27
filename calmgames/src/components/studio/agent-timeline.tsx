"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronRight, Loader2, RotateCw, X, Minus } from "lucide-react";
import { AGENTS } from "@/lib/agents/meta";
import type { Job, JobStep } from "@/lib/types";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn, usd } from "@/lib/utils";

const STATUS_LABEL: Record<JobStep["status"], string> = { waiting: "Waiting", working: "Working", complete: "Complete", failed: "Failed", skipped: "Skipped" };
const LAB_LABEL: Record<string, string> = { ideation: "Concept generation", design: "Feasibility review" };

function elapsed(step: JobStep, now: number) {
  if (!step.startedAt) return "";
  const end = step.finishedAt ? Date.parse(step.finishedAt) : now;
  const s = Math.max(0, Math.round((end - Date.parse(step.startedAt)) / 1000));
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

function StatusDot({ status, color }: { status: JobStep["status"]; color: string }) {
  return (
    <span className={cn("relative grid size-8 shrink-0 place-items-center rounded-full border transition-colors duration-500", status === "complete" ? "border-transparent text-white" : status === "failed" ? "border-rose/40 bg-rose/10 text-rose" : status === "working" ? "border-transparent text-white" : "border-line bg-paper text-muted")} style={status === "complete" || status === "working" ? { background: color } : undefined}>
      {status === "working" && <span className="absolute inset-0 animate-ping rounded-full opacity-30" style={{ background: color }} />}
      {status === "complete" ? <Check className="size-4" /> : status === "failed" ? <X className="size-4" /> : status === "working" ? <Loader2 className="size-4 animate-spin" /> : status === "skipped" ? <Minus className="size-4" /> : <span className="size-1.5 rounded-full bg-current" />}
    </span>
  );
}

export function AgentTimeline({ job, onResume, compact }: { job: Job; onResume?: () => void; compact?: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  const [open, setOpen] = useState<JobStep | null>(null);
  useEffect(() => {
    if (job.status !== "running") return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [job.status]);

  return (
    <div>
      <ol className="relative">
        {job.steps.map((step, i) => {
          const meta = AGENTS[step.agent];
          const last = i === job.steps.length - 1;
          return (
            <li key={step.agent + i} className="relative flex gap-3 pb-4">
              {!last && <span className={cn("absolute left-4 top-9 h-[calc(100%-2.25rem)] w-px", step.status === "complete" ? "bg-midnight/20" : "bg-line")} />}
              <StatusDot status={step.status} color={meta.color} />
              <button className="group min-w-0 flex-1 text-left disabled:cursor-default" onClick={() => setOpen(step)} disabled={!step.output && !step.error}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[14px] font-medium text-midnight">{job.kind === "lab" ? LAB_LABEL[step.agent] : meta.name}</p>
                  <span className={cn("text-[11px]", step.status === "failed" ? "text-rose" : "text-muted")}>{STATUS_LABEL[step.status]}{step.startedAt ? ` · ${elapsed(step, now)}` : ""}</span>
                </div>
                <p className="text-[12px] text-muted">{meta.role}{step.costUsd ? ` · ${usd(step.costUsd)}` : ""}</p>
                <AnimatePresence mode="wait">
                  {step.activity && (
                    <motion.p key={step.activity} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-1 text-[12.5px] text-[#4b3f7a]">
                      {step.activity}…
                    </motion.p>
                  )}
                </AnimatePresence>
                {step.error && <p className="mt-1 line-clamp-3 text-[12.5px] text-[#8f3f3f]">{step.error}</p>}
                {!compact && (step.output || step.error) ? <span className="mt-1 inline-flex items-center text-[12px] text-midnight/60 group-hover:text-midnight">Inspect output <ChevronRight className="size-3" /></span> : null}
              </button>
            </li>
          );
        })}
      </ol>
      {(job.status === "failed" || job.status === "interrupted") && (
        <div className="mt-2 rounded-2xl border border-rose/25 bg-[#fbf1ef] p-4">
          <p className="text-[13px] text-[#8f3f3f]">{job.error}</p>
          {onResume && (
            <Button size="sm" variant="secondary" className="mt-3" onClick={onResume}>
              <RotateCw /> Resume from the failed agent
            </Button>
          )}
        </div>
      )}
      <p className="mt-2 text-[12px] text-muted">Run cost so far: {usd(job.costUsd)} (estimated from recorded token usage)</p>
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent wide>
          {open && (
            <>
              <p className="eyebrow">{AGENTS[open.agent].role}</p>
              <DialogTitle>{AGENTS[open.agent].name} output</DialogTitle>
              <DialogDescription>Exactly what this agent returned, after schema validation.</DialogDescription>
              <div className="mt-6">{open.error ? <p className="text-sm text-[#8f3f3f]">{open.error}</p> : <OutputView value={open.output} />}</div>
              <details className="mt-6">
                <summary className="cursor-pointer text-[12px] text-muted">Raw JSON</summary>
                <pre className="mt-2 max-h-80 overflow-auto rounded-2xl bg-midnight p-4 text-[11.5px] leading-relaxed text-ivory/90">{JSON.stringify(open.output, null, 2)}</pre>
              </details>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

const human = (k: string) => k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
const isHex = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);

/** Friendly rendering of any agent output: text, lists, colour swatches and SVG motifs. */
export function OutputView({ value, depth = 0 }: { value: unknown; depth?: number }): React.ReactNode {
  if (value === null || value === undefined) return <span className="text-muted">—</span>;
  if (isHex(value))
    return (
      <span className="inline-flex items-center gap-2 text-[13px]">
        <span className="size-5 rounded-full border border-black/10" style={{ background: value }} />
        {value}
      </span>
    );
  if (typeof value === "string") {
    if (value.trim().startsWith("<svg")) return <img alt="SVG motif" className="size-20 rounded-xl bg-ivory-deep p-2" src={`data:image/svg+xml;utf8,${encodeURIComponent(value)}`} />;
    if (value.length > 400 && value.includes("<")) return <pre className="max-h-60 overflow-auto rounded-xl bg-ivory-deep p-3 text-[11px]">{value.slice(0, 4000)}{value.length > 4000 ? "…" : ""}</pre>;
    return <p className="text-[14px] leading-relaxed text-ink/85">{value}</p>;
  }
  if (typeof value === "number" || typeof value === "boolean") return <span className="text-[14px] text-ink/85">{String(value)}</span>;
  if (Array.isArray(value)) {
    if (value.every(isHex)) return <div className="flex flex-wrap gap-2">{value.map((v, i) => <OutputView key={i} value={v} />)}</div>;
    if (value.every((v) => typeof v === "string" || typeof v === "number"))
      return (
        <ul className="list-disc space-y-1 pl-5 text-[14px] text-ink/85 marker:text-lavender">
          {value.map((v, i) => <li key={i}>{Array.isArray(v) ? v.join(", ") : String(v)}</li>)}
        </ul>
      );
    if (value.every((v) => Array.isArray(v))) return <p className="text-[13px] text-ink/80">{value.map((v) => `[${(v as unknown[]).join(", ")}]`).join("  ")}</p>;
    return <div className="grid gap-3">{value.map((v, i) => <div key={i} className="rounded-2xl border border-line/80 bg-ivory/60 p-4"><OutputView value={v} depth={depth + 1} /></div>)}</div>;
  }
  if (typeof value === "object")
    return (
      <dl className={cn("grid gap-4", depth === 0 && "sm:grid-cols-1")}>
        {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
          <div key={k}>
            <dt className="eyebrow mb-1.5">{human(k)}</dt>
            <dd>
              <OutputView value={v} depth={depth + 1} />
            </dd>
          </div>
        ))}
      </dl>
    );
  return null;
}

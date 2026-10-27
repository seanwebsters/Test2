"use client";
import { CheckCircle2, CircleDashed, AlertTriangle, XCircle, Loader2, FlaskConical } from "lucide-react";
import type { QAReport } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

const ICON = { pass: CheckCircle2, fail: XCircle, warn: AlertTriangle, skipped: CircleDashed };
const TONE = { pass: "text-[#4f7a4b]", fail: "text-rose", warn: "text-[#b07a3e]", skipped: "text-muted" };

export function QAReportView({ qa, onRun, running }: { qa?: QAReport; onRun?: () => void; running?: boolean }) {
  if (!qa)
    return (
      <div className="rounded-2xl border border-dashed border-line p-4">
        <p className="text-[13px] text-muted">This version hasn&apos;t been tested yet. Nothing here is claimed until the checks actually run.</p>
        {onRun && (
          <Button size="sm" variant="secondary" className="mt-3" onClick={onRun} disabled={running}>
            {running ? <Loader2 className="animate-spin" /> : <FlaskConical />} {running ? "Playing it in Chromium…" : "Run QA now"}
          </Button>
        )}
      </div>
    );
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className={`text-[13px] font-medium ${qa.passed ? "text-[#4f7a4b]" : "text-rose"}`}>{qa.passed ? "Passed every required check" : qa.ran ? "Some checks failed" : "QA did not run"}</p>
        <span className="text-[11px] text-muted">{formatDate(qa.ranAt)} · {(qa.durationMs / 1000).toFixed(1)}s{qa.attempts > 1 ? ` · ${qa.attempts - 1} repair(s)` : ""}</span>
      </div>
      <ul className="space-y-2.5">
        {qa.checks.map((c) => {
          const Icon = ICON[c.status];
          return (
            <li key={c.id} className="flex gap-2.5">
              <Icon className={`mt-0.5 size-4 shrink-0 ${TONE[c.status]}`} />
              <div>
                <p className="text-[13px] text-ink">{c.label}</p>
                <p className="text-[12px] leading-snug text-muted">{c.detail}</p>
              </div>
            </li>
          );
        })}
      </ul>
      {onRun && (
        <Button size="sm" variant="ghost" className="mt-3" onClick={onRun} disabled={running}>
          {running ? <Loader2 className="animate-spin" /> : <FlaskConical />} {running ? "Testing…" : "Run again"}
        </Button>
      )}
    </div>
  );
}

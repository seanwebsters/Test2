import { AGENT_BY_KEY } from "@/lib/studio/agents";
import type { Deliverable } from "@/lib/studio/types";
import { cx, relativeTime } from "@/lib/util";

const title = (k: string) => k.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

/** Generic, readable rendering of any typed handoff. */
export function DataView({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (value === null || value === undefined || value === "") return <span className="text-mist">—</span>;
  if (typeof value === "string") return <span className="whitespace-pre-line">{value}</span>;
  if (typeof value === "number" || typeof value === "boolean") return <span>{String(value)}</span>;
  if (Array.isArray(value)) {
    if (value.every((v) => typeof v !== "object" || v === null)) {
      return <ul className="list-disc space-y-0.5 pl-5">{value.map((v, i) => <li key={i}><DataView value={v} depth={depth + 1} /></li>)}</ul>;
    }
    return (
      <ol className="space-y-2">
        {value.map((v, i) => (
          <li key={i} className="rounded-xl bg-white/[0.03] p-3">
            <DataView value={v} depth={depth + 1} />
          </li>
        ))}
      </ol>
    );
  }
  const entries = Object.entries(value as Record<string, unknown>);
  return (
    <dl className={cx("grid gap-x-4 gap-y-1.5", depth === 0 ? "sm:grid-cols-[180px_minmax(0,1fr)]" : "sm:grid-cols-[150px_minmax(0,1fr)]")}>
      {entries.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-xs uppercase tracking-wider text-mist">{title(k)}</dt>
          <dd className="text-sm text-white/90">
            <DataView value={v} depth={depth + 1} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

interface ReviewData {
  verdict: string;
  summary: string;
  strengths: string[];
  issues: { severity: string; scene_index: number | null; quote: string; problem: string; suggestion: string }[];
}

export function ReviewView({ data }: { data: ReviewData }) {
  return (
    <div className="space-y-3 text-sm">
      <p className="text-white/90">{data.summary}</p>
      {data.strengths.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wider text-emerald-200/80">What works</div>
          <ul className="list-disc pl-5 text-white/85">{data.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
      )}
      {data.issues.length > 0 && (
        <ul className="space-y-2">
          {data.issues.map((i, n) => (
            <li key={n} className={cx("rounded-xl border p-3", i.severity === "major" ? "border-rose-300/30 bg-rose-300/[0.05]" : "border-white/10 bg-white/[0.03]")}>
              <div className="text-xs text-mist">{i.severity}{i.scene_index ? ` · scene ${i.scene_index}` : ""}</div>
              {i.quote && <blockquote className="mt-1 border-l-2 border-lavender/50 pl-2 font-serif text-[15px] italic text-white/85">“{i.quote}”</blockquote>}
              <p className="mt-1 text-white/90">{i.problem}</p>
              <p className="mt-1 text-lavender">→ {i.suggestion}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function DeliverableCard({ d, children }: { d: Deliverable; children?: React.ReactNode }) {
  const isReview = d.kind === "review";
  return (
    <article id={d.id} className="scroll-mt-24 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <header className="mb-3 flex flex-wrap items-baseline gap-2">
        <h3 className="font-serif text-2xl text-white">{d.title}</h3>
        <span className="text-xs text-mist">v{d.version} · {AGENT_BY_KEY[d.agent].name} · {d.model} · {relativeTime(d.created_at)}</span>
        {isReview && <span className={cx("ml-auto rounded-full px-2 py-0.5 text-xs", (d.data as ReviewData).verdict === "approve" ? "bg-emerald-300/15 text-emerald-200" : "bg-amber-300/15 text-amber-200")}>{(d.data as ReviewData).verdict}</span>}
      </header>
      {children ?? (isReview ? <ReviewView data={d.data as ReviewData} /> : <DataView value={d.data} />)}
    </article>
  );
}

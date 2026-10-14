import { formatDate } from "@/lib/util";

/** A small bar chart of daily plays. Server-rendered SVG with a text alternative. */
export function TrendChart({ data, label }: { data: { date: string; plays: number }[]; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.plays));
  const total = data.reduce((a, d) => a + d.plays, 0);
  const w = 100 / data.length;
  return (
    <figure>
      <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="h-24 w-full" role="img" aria-label={`${label}: ${total} plays over ${data.length} days, peak ${max} in a day`}>
        {data.map((d, i) => {
          const h = (d.plays / max) * 30;
          return <rect key={d.date} x={i * w + w * 0.15} width={w * 0.7} y={32 - h} height={Math.max(h, 0.4)} rx={0.4} className={d.plays ? "fill-lavender/70" : "fill-white/10"} />;
        })}
      </svg>
      <figcaption className="mt-1 flex justify-between text-[11px] text-mist">
        <span>{data[0] && formatDate(data[0].date)}</span>
        <span>{data.at(-1) && formatDate(data.at(-1)!.date)}</span>
      </figcaption>
    </figure>
  );
}

export function SampleBadge({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="rounded-full border border-amber-200/30 bg-amber-200/10 px-2 py-0.5 text-[10px] font-medium text-amber-100" title="Includes generated sample listening data, not real listeners">
      Sample data
    </span>
  );
}

export function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card-surface p-4">
      <dt className="text-xs text-mist">{label}</dt>
      <dd className="mt-1 font-serif text-3xl font-semibold">{value}</dd>
      {sub && <dd className="mt-1 text-[11px] text-mist">{sub}</dd>}
    </div>
  );
}

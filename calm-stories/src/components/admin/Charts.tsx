/** Small, dependency-free SVG charts for dashboards. */
import { cx } from "@/lib/util";

export function StatTile({ label, value, hint, sample }: { label: string; value: string | number; hint?: string; sample?: boolean }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-mist">{label}</span>
        {sample && <span className="rounded-full bg-amber-300/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-200" title="Includes seeded sample data">Sample</span>}
      </div>
      <div className="mt-2 font-serif text-4xl">{value}</div>
      {hint && <div className="mt-1 text-xs text-mist">{hint}</div>}
    </div>
  );
}

export function BarChart({ data, label, className }: { data: { label: string; value: number }[]; label: string; className?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const w = 640;
  const h = 130;
  const bw = w / Math.max(1, data.length);
  return (
    <figure className={cx("w-full", className)}>
      <svg viewBox={`0 0 ${w} ${h + 18}`} className="w-full" role="img" aria-label={`${label}: ${data.map((d) => `${d.label} ${d.value}`).join(", ")}`}>
        {data.map((d, i) => {
          const bh = (d.value / max) * h;
          return (
            <g key={i}>
              <rect x={i * bw + bw * 0.18} y={h - bh} width={bw * 0.64} height={Math.max(1, bh)} rx={4} fill="url(#barg)" />
              <text x={i * bw + bw / 2} y={h + 13} textAnchor="middle" fontSize="11" fill="#AAB6CF">{d.label}</text>
              <text x={i * bw + bw / 2} y={h - bh - 4} textAnchor="middle" fontSize="11" fill="#ffffff">{d.value}</text>
            </g>
          );
        })}
        <defs>
          <linearGradient id="barg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#A99BF4" />
            <stop offset="1" stopColor="#8B9DF4" stopOpacity="0.5" />
          </linearGradient>
        </defs>
      </svg>
      <figcaption className="sr-only">{label}</figcaption>
    </figure>
  );
}

/** Single-series bar chart with per-bar hover tooltips (native <title>) and a table fallback. */
export function BarChart({ data, label, format = (n: number) => String(n) }: { data: { x: string; y: number }[]; label: string; format?: (n: number) => string }) {
  const W = 560;
  const H = 160;
  const pad = 22;
  const max = Math.max(1, ...data.map((d) => d.y));
  const bw = (W - pad * 2) / data.length;
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H + 24}`} className="w-full" role="img" aria-label={label}>
        {[0, 0.5, 1].map((t) => (
          <g key={t}>
            <line x1={pad} x2={W - pad} y1={H - t * (H - 16)} y2={H - t * (H - 16)} stroke="#f4efe6" strokeOpacity=".06" />
            <text x={pad - 6} y={H - t * (H - 16) + 3} textAnchor="end" fontSize="9" fill="#6c685f">{format(Math.round(max * t))}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const h = (d.y / max) * (H - 16);
          const x = pad + i * bw + 2;
          return (
            <g key={d.x} className="group">
              <rect x={pad + i * bw} y={0} width={bw} height={H} fill="transparent" />
              <path d={h > 0 ? `M${x} ${H} V${H - h + 4} q0 -4 4 -4 h${bw - 12} q4 0 4 4 V${H}Z` : ""} fill="#ff6a3d" className="opacity-80 transition group-hover:opacity-100" />
              <title>{`${d.x}: ${format(d.y)}`}</title>
              {(i === 0 || i === data.length - 1 || i % 3 === 0) && <text x={x + (bw - 4) / 2} y={H + 14} textAnchor="middle" fontSize="9" fill="#6c685f">{d.x.slice(5)}</text>}
            </g>
          );
        })}
      </svg>
      <details className="mt-1 text-[11px] text-bone-4">
        <summary className="cursor-pointer">Table</summary>
        <table className="mt-1 w-full">
          <tbody>{data.map((d) => <tr key={d.x}><td>{d.x}</td><td className="text-right tabular-nums">{format(d.y)}</td></tr>)}</tbody>
        </table>
      </details>
    </figure>
  );
}

export function Stat({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-ink-2 p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-bone-3">{label}</p>
      <p className="mt-1.5 text-3xl font-extrabold tabular-nums">{value}</p>
      {note && <p className="mt-0.5 text-[11.5px] text-bone-4">{note}</p>}
    </div>
  );
}

export const pct = (v?: number) => (v === undefined ? "—" : `${Math.round(v * 100)}%`);

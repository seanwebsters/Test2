import type { Location, Palette } from "@/lib/content/types";
import { hashString } from "@/lib/content/build";

/** A stylised map of a universe's key locations. */
export function WorldMap({ locations, palette, seed }: { locations: Location[]; palette: Palette; seed: number }) {
  const W = 640;
  const H = 360;
  const pts = locations.map((l, i) => {
    const h = hashString(l.id + seed);
    return { l, x: 90 + ((i + 0.5) / locations.length) * (W - 180) + ((h % 60) - 30), y: 80 + (h % (H - 160)) };
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-2xl" style={{ background: palette.surface }} role="img" aria-label="World map">
      <defs>
        <pattern id={`mapgrid${seed}`} width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M32 0H0V32" fill="none" stroke={palette.ink} strokeOpacity=".06" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill={`url(#mapgrid${seed})`} />
      {[0, 1, 2].map((k) => (
        <path key={k} d={`M0 ${120 + k * 70} C ${W * 0.3} ${60 + k * 90}, ${W * 0.6} ${200 + k * 30}, ${W} ${140 + k * 60}`} stroke={palette.accent2} strokeOpacity=".12" strokeWidth={30 - k * 8} fill="none" />
      ))}
      <polyline points={pts.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke={palette.accent} strokeWidth="1.5" strokeDasharray="5 6" opacity=".7" />
      {pts.map((p) => (
        <g key={p.l.id} transform={`translate(${p.x} ${p.y})`}>
          <circle r="16" fill={palette.accent} opacity=".18" />
          <circle r="6" fill={palette.accent} />
          <text y="-22" textAnchor="middle" fontSize="13" fontWeight="700" fill={palette.ink}>{p.l.name}</text>
        </g>
      ))}
      <g transform={`translate(${W - 50} 50)`} stroke={palette.ink} strokeOpacity=".5" fill="none">
        <circle r="18" />
        <path d="M0 -24 L4 0 L0 24 L-4 0Z" fill={palette.ink} fillOpacity=".4" />
      </g>
    </svg>
  );
}

import type { Character, Palette } from "@/lib/content/types";

const TYPE_COLOR: Record<string, string> = { ally: "#5fd39a", rival: "#ffb35f", family: "#4fa3ff", romance: "#ff6b9a", mentor: "#b06bff", enemy: "#ff4d4d", mystery: "#cfc9bd" };

/** Character relationship web, laid out on a circle. */
export function RelationshipGraph({ characters, palette }: { characters: Character[]; palette: Palette }) {
  const W = 640;
  const H = 420;
  const R = 150;
  const pos = new Map(characters.map((c, i) => {
    const a = (i / characters.length) * Math.PI * 2 - Math.PI / 2;
    return [c.id, { x: W / 2 + Math.cos(a) * R * 1.45, y: H / 2 + Math.sin(a) * R }];
  }));
  const edges = characters.flatMap((c) => c.relationships.filter((r) => pos.has(r.to)).map((r) => ({ from: c.id, ...r })));
  const used = [...new Set(edges.map((e) => e.type))];
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Character relationships">
        {edges.map((e, i) => {
          const a = pos.get(e.from)!;
          const b = pos.get(e.to)!;
          const mx = (a.x + b.x) / 2 + (b.y - a.y) * 0.12;
          const my = (a.y + b.y) / 2 - (b.x - a.x) * 0.12;
          return (
            <g key={i}>
              <path d={`M${a.x} ${a.y} Q${mx} ${my} ${b.x} ${b.y}`} stroke={TYPE_COLOR[e.type]} strokeWidth="2" fill="none" opacity=".75" strokeDasharray={e.type === "mystery" ? "4 5" : undefined} />
              <title>{`${e.type}: ${e.note}`}</title>
            </g>
          );
        })}
        {characters.map((c) => {
          const p = pos.get(c.id)!;
          return (
            <g key={c.id} transform={`translate(${p.x} ${p.y})`}>
              <circle r="26" fill={palette.surface} stroke={c.role === "antagonist" ? "#ff4d4d" : palette.accent} strokeWidth="2.5" />
              <text textAnchor="middle" dy="5" fontSize="15" fontWeight="700" fill={palette.ink}>{c.name.split(/\s+/).map((x) => x[0]).join("").slice(0, 2)}</text>
              <text textAnchor="middle" y="44" fontSize="12.5" fontWeight="600" fill="#f4efe6">{c.name}</text>
              <text textAnchor="middle" y="59" fontSize="10.5" fill="#9b968c">{c.title}</text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-3 text-[12px] text-bone-3">
        {used.map((t) => (
          <span key={t} className="flex items-center gap-1.5"><span className="h-0.5 w-4" style={{ background: TYPE_COLOR[t] }} />{t}</span>
        ))}
      </figcaption>
    </figure>
  );
}

import { getCategory } from "@/lib/content/categories";
import type { CategoryId } from "@/lib/content/types";
import { cn } from "@/lib/cn";

const PALETTES: Record<CategoryId, [string, string, string, string]> = {
  creative: ["#FFB199", "#FF7A68", "#B894FF", "#2B1B4F"],
  business: ["#FFE29A", "#FFB547", "#FF7A68", "#3A2412"],
  tech: ["#8EF0D0", "#1FB5A6", "#2F4BA8", "#0B1638"],
  film: ["#C9B8FF", "#8B6CF0", "#FF7A68", "#160F33"],
  music: ["#FF9EC4", "#B26BFF", "#3B2D8F", "#120B2E"],
  fashion: ["#FFD1E3", "#E58BC0", "#9A7BFF", "#2A1235"],
  marketing: ["#FFE68F", "#FF9A5A", "#FF6F8E", "#3B1530"],
  finance: ["#C9F7E4", "#43D3A0", "#1A7A6E", "#0C2A2C"],
  healthcare: ["#D6F6FF", "#6AD1E6", "#2EA9A1", "#0D2C3D"],
  science: ["#D5FFE9", "#68E3B4", "#3D7CE0", "#0C1A40"],
  engineering: ["#FFE7B0", "#FFC255", "#5B7BD6", "#121D3F"],
  sports: ["#FFD3B5", "#FF8A5B", "#2FC9B4", "#132A35"],
  law: ["#E3DBFF", "#A898F5", "#4B4F9E", "#14163A"],
  education: ["#E2FFD8", "#9BE38A", "#2FB49A", "#10302C"],
  hospitality: ["#FFE1BA", "#FFA45C", "#E25C5C", "#33141A"],
  public: ["#D6ECFF", "#7BB8F2", "#2C79C0", "#0D213D"],
};

function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/**
 * Generative "cinematic" key art: a dusk landscape in the category's palette,
 * seeded by the career so every career has its own scene. Pure SVG — fast,
 * crisp on any screen and no stock photography.
 */
export function CareerArt({ slug, category, className, showEmoji = true, rounded = true }: { slug: string; category: CategoryId; className?: string; showEmoji?: boolean; rounded?: boolean }) {
  const [a, b, c, d] = PALETTES[category];
  const rnd = seeded(slug);
  const sunX = 60 + rnd() * 280;
  const sunY = 50 + rnd() * 40;
  const hill = (base: number, amp: number) => {
    const pts: string[] = [`M0 ${base}`];
    for (let x = 0; x <= 400; x += 50) pts.push(`Q ${x + 25} ${base - amp * (0.4 + rnd())} ${x + 50} ${base - amp * rnd() * 0.6}`);
    pts.push("L400 240 L0 240 Z");
    return pts.join(" ");
  };
  const stars = Array.from({ length: 14 }, () => ({ x: rnd() * 400, y: rnd() * 110, r: 0.6 + rnd() * 1.6, o: 0.3 + rnd() * 0.6 }));
  const gid = `g-${slug}`;
  const emoji = getCategory(category).emoji;

  return (
    <div className={cn("relative overflow-hidden", rounded && "rounded-3xl", className)}>
      <svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id={`${gid}-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={d} />
            <stop offset="0.55" stopColor={c} />
            <stop offset="1" stopColor={b} />
          </linearGradient>
          <radialGradient id={`${gid}-sun`}>
            <stop offset="0" stopColor="#FFF6DA" />
            <stop offset="0.5" stopColor={a} stopOpacity="0.9" />
            <stop offset="1" stopColor={a} stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${gid}-fade`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0.5" stopColor={d} stopOpacity="0" />
            <stop offset="1" stopColor={d} stopOpacity="0.55" />
          </linearGradient>
        </defs>
        <rect width="400" height="240" fill={`url(#${gid}-sky)`} />
        {stars.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={s.o} />
        ))}
        <circle cx={sunX} cy={sunY} r="70" fill={`url(#${gid}-sun)`} />
        <circle cx={sunX} cy={sunY} r="20" fill="#FFF6DA" opacity="0.95" />
        <path d={hill(170, 50)} fill={a} opacity="0.55" />
        <path d={hill(195, 40)} fill={b} opacity="0.8" />
        <path d={hill(220, 30)} fill={d} opacity="0.85" />
        {/* winding path — the Direction motif */}
        <path d={`M ${120 + rnd() * 40} 240 C 180 215, ${140 + rnd() * 80} 205, 210 ${188 + rnd() * 8} S 260 172, ${250 + rnd() * 60} 165`} stroke="#FFF6DA" strokeOpacity="0.7" strokeWidth="3" strokeDasharray="2 7" strokeLinecap="round" fill="none" />
        <rect width="400" height="240" fill={`url(#${gid}-fade)`} />
      </svg>
      {showEmoji && (
        <div className="absolute right-4 top-4 grid h-12 w-12 place-items-center rounded-2xl bg-white/20 text-2xl backdrop-blur-sm" aria-hidden="true">
          {emoji}
        </div>
      )}
    </div>
  );
}

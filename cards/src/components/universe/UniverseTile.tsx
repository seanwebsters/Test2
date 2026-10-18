import Link from "next/link";
import { Art } from "@/components/art/Art";
import { fmt } from "@/components/ui/Currency";
import type { UniverseCardView } from "@/lib/view/universe";

/** Poster-style tile used in carousels and grids. */
export function UniverseTile({ u, rank, size = "md", note }: { u: UniverseCardView; rank?: number; size?: "md" | "lg"; note?: string }) {
  const pct = u.cards ? Math.round((u.owned / u.cards) * 100) : 0;
  return (
    <Link
      href={`/universes/${u.slug}`}
      className={`focus-ring group relative block shrink-0 snap-start overflow-hidden rounded-3xl ${size === "lg" ? "w-[78vw] sm:w-[320px]" : "w-[62vw] sm:w-[240px]"} aspect-[3/4] shadow-card`}
      style={{ background: u.palette.bg }}
    >
      {u.heroImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={u.heroImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
      ) : (
        <Art style={u.style} palette={u.palette} seed={u.seed} aspect="tall" sceneOnly className="absolute inset-0 h-full w-full transition duration-700 group-hover:scale-105" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      {rank !== undefined && (
        <span className="absolute left-3 top-2 font-brand text-6xl font-bold text-white/90 [text-shadow:0_4px_20px_rgba(0,0,0,.6)] [-webkit-text-stroke:1px_rgba(0,0,0,.25)]">{rank}</span>
      )}
      <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
        {u.isNew && <span className="rounded-full bg-bone px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-ink">New</span>}
        {u.newSeasonSoon && <span className="rounded-full bg-black/50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-bone backdrop-blur">S{u.newSeasonSoon.number} soon</span>}
      </div>
      <div className="absolute inset-x-0 bottom-0 p-4">
        <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em]" style={{ color: u.palette.accent }}>
          {u.genres.slice(0, 2).map((g) => g.label).join(" · ")}
        </p>
        <h3 className={`ff-${u.font} text-[26px] leading-[1.02]`} style={{ color: u.palette.ink }}>
          {u.title}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-snug text-white/70">{note ?? u.tagline}</p>
        <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-white/60">
          <span>{fmt(u.followers)} followers</span>
          <span>{u.cards} cards</span>
        </div>
        {u.owned > 0 && (
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/15" aria-label={`${pct}% collected`}>
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: u.palette.accent }} />
          </div>
        )}
      </div>
    </Link>
  );
}

/** Wide landscape tile. */
export function UniverseBanner({ u, eyebrow, cta }: { u: UniverseCardView; eyebrow?: string; cta?: string }) {
  return (
    <Link href={`/universes/${u.slug}`} className="focus-ring group relative block aspect-[16/9] w-[86vw] shrink-0 snap-start overflow-hidden rounded-3xl shadow-card sm:w-[440px]" style={{ background: u.palette.bg }}>
      <Art style={u.style} palette={u.palette} seed={u.seed + 7} aspect="hero" sceneOnly className="absolute inset-0 h-full w-full transition duration-700 group-hover:scale-105" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent" />
      <div className="absolute inset-y-0 left-0 flex max-w-[70%] flex-col justify-end p-5">
        {eyebrow && <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.18em]" style={{ color: u.palette.accent }}>{eyebrow}</p>}
        <h3 className={`ff-${u.font} text-3xl leading-none`} style={{ color: u.palette.ink }}>{u.title}</h3>
        <p className="mt-2 line-clamp-2 text-[13px] text-white/75">{u.tagline}</p>
        {cta && <span className="mt-3 text-[12px] font-bold text-white">{cta} →</span>}
      </div>
    </Link>
  );
}

import Link from "next/link";
import { BookOpen, Package, Users } from "lucide-react";
import { Art } from "@/components/art/Art";
import { fmt } from "@/components/ui/Currency";
import { FollowButton } from "@/components/ui/FollowButton";
import { btn, chip, container } from "@/components/ui/styles";
import type { UniverseCardView } from "@/lib/view/universe";

export function Hero({ u, starterAvailable }: { u: UniverseCardView; starterAvailable: boolean }) {
  return (
    <section className="relative isolate overflow-hidden" style={{ background: u.palette.bg }}>
      <div className="nx-animate absolute inset-0 -z-10">
        <Art style={u.style} palette={u.palette} seed={u.seed} aspect="hero" sceneOnly className="h-full w-full" />
      </div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/90 via-black/55 to-black/10" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-ink to-transparent" />
      <div className={`${container} flex min-h-[78vh] flex-col justify-end pb-14 pt-24 md:min-h-[72vh]`}>
        <div className="max-w-2xl animate-fade-up">
          <p className="mb-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-bone px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-ink">{u.isNew ? "New universe" : "Featured universe"}</span>
            <span className={chip}>Season {u.season.number}: {u.season.title}</span>
          </p>
          <h1 className={`ff-${u.font} text-6xl leading-[0.95] sm:text-7xl md:text-8xl`} style={{ color: u.palette.ink }}>
            {u.title}
          </h1>
          <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-white/85 md:text-lg">{u.premise}</p>
          <div className="mt-5 flex flex-wrap items-center gap-2 text-[12.5px] font-semibold text-white/70">
            {u.genres.map((g) => (
              <span key={g.id} className={chip}>{g.label}</span>
            ))}
            <span className="ml-1 inline-flex items-center gap-1.5"><Users size={14} /> {fmt(u.followers)} followers</span>
            <span className="inline-flex items-center gap-1.5">· {u.cards} cards</span>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={starterAvailable ? `/packs/starter?u=${u.slug}` : `/packs/standard?u=${u.slug}`} className={btn("primary", "lg")}>
              <Package size={18} /> {starterAvailable ? "Open your first pack — free" : "Open a pack"}
            </Link>
            <Link href={`/universes/${u.slug}`} className={btn("light", "lg")}>
              <BookOpen size={18} /> Explore universe
            </Link>
            <FollowButton universeId={u.id} following={u.following} size="lg" />
          </div>
        </div>
      </div>
    </section>
  );
}

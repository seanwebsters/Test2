"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { useCatalog } from "@/components/providers/CatalogProvider";
import { EpisodeTile, Rail, SeriesTile, WideSeriesCard } from "@/components/catalog/Tiles";
import { ChevronLeft } from "@/components/ui/Icon";
import { CATEGORIES, CATEGORY_BY_ID, TOPICS } from "@/content/categories";
import type { CategoryId } from "@/lib/types";

export function CategoryView({ id }: { id: CategoryId }) {
  const c = CATEGORY_BY_ID[id];
  const { series } = useCatalog();
  const list = series.filter((s) => s.category === id).sort((a, b) => b.rating - a.rating);
  const eps = list.flatMap((s) => s.episodes.filter((e) => e.hasAudio && e.n <= s.freeEpisodes).map((e) => ({ s, e })));
  const topics = TOPICS.filter((t) => t.category === id);
  return (
    <div className="pb-safe-nav">
      <section className="relative overflow-hidden px-4 pb-10 pt-[calc(14px+var(--safe-top))] md:px-10 md:pt-8" style={{ background: `radial-gradient(120% 90% at 80% 0%, ${c.color} 0%, ${c.deep} 55%, #111114 100%)` }}>
        <motion.div initial={{ rotate: -30, opacity: 0 }} animate={{ rotate: 0, opacity: 0.25 }} className="pointer-events-none absolute -right-10 top-0 text-[260px] font-black leading-none md:text-[400px]" style={{ color: c.color2 }} aria-hidden>{c.glyph}</motion.div>
        <Link href="/" className="relative inline-grid h-10 w-10 place-items-center rounded-full bg-black/25" aria-label="Back"><ChevronLeft size={20} /></Link>
        <div className="relative mt-10 text-xs font-bold uppercase tracking-[0.2em] opacity-80">Universe</div>
        <h1 className="display relative mt-2 text-[56px] md:text-[112px]">{c.label}</h1>
        <p className="editorial relative mt-2 max-w-xl text-[26px] leading-tight">{c.blurb}</p>
        <div className="relative mt-6 flex flex-wrap gap-1.5">{topics.map((t) => <span key={t.id} className="chip border-white/20 bg-black/20 text-cream">{t.label}</span>)}</div>
      </section>
      {list[0] && <div className="mt-8 px-4 md:px-10"><WideSeriesCard series={list[0]} /></div>}
      <Rail title="All" accent={`${c.label.toLowerCase()} series`}>{list.map((s) => <SeriesTile key={s.slug} series={s} />)}</Rail>
      {eps.length > 0 && <Rail title="Free to" accent="start now">{eps.map(({ s, e }) => <EpisodeTile key={e.id} series={s} ep={e} />)}</Rail>}
      <Rail title="Other" accent="universes">
        {CATEGORIES.filter((x) => x.id !== id).map((x) => (
          <Link key={x.id} href={`/c/${x.id}`} className="flex aspect-[4/5] w-[140px] shrink-0 flex-col justify-between rounded-3xl p-4 text-ink" style={{ background: `linear-gradient(150deg, ${x.color}, ${x.color2})` }}>
            <span className="text-4xl font-black">{x.glyph}</span>
            <span className="display text-base">{x.label}</span>
          </Link>
        ))}
      </Rail>
    </div>
  );
}

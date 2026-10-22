"use client";
import Link from "next/link";
import { CoverArt } from "@/components/art/Cover";
import { useCatalog } from "@/components/providers/CatalogProvider";
import type { CollectionRecord } from "@/lib/model";

export function CollectionCard({ c }: { c: CollectionRecord }) {
  const { bySlug } = useCatalog();
  const covers = c.seriesSlugs.map((s) => bySlug[s]).filter(Boolean).slice(0, 4);
  return (
    <Link href={`/collections/${c.id}`} className="group block rounded-[28px] p-3 transition hover:-translate-y-1" style={{ background: `linear-gradient(160deg, ${c.palette[0]}, ${c.palette[1]})` }}>
      <div className="grid aspect-square grid-cols-2 gap-1.5 overflow-hidden rounded-[20px]">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="relative overflow-hidden rounded-xl bg-black/20">{covers[i] && <CoverArt art={covers[i].art} seed={covers[i].slug} />}</div>
        ))}
      </div>
      <div className="px-1 pb-1 pt-3" style={{ color: c.palette[1] === "#111114" || c.palette[0] === "#DFFF57" ? "#111114" : "#F7F4E9" }}>
        <div className="display text-lg leading-tight">{c.title}</div>
        <div className="mt-1 text-xs opacity-75">by {c.ownerName} · {c.seriesSlugs.length} series · {c.followers} followers</div>
      </div>
    </Link>
  );
}

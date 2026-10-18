"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/providers/AppState";
import { useCatalog } from "@/components/providers/CatalogProvider";
import { usePlayer } from "@/components/player/PlayerProvider";
import { catalogItem, firstPlayable } from "@/components/player/items";
import { CoverArt } from "@/components/art/Cover";
import { Check, ChevronLeft, Eye, EyeOff, Play, Plus, Share2, Trash2 } from "@/components/ui/Icon";
import type { CollectionRecord } from "@/lib/model";
import { cn } from "@/lib/cn";

export function CollectionView({ initial, isOwner }: { initial: CollectionRecord; isOwner: boolean }) {
  const [c, setC] = useState(initial);
  const { api, state, toast } = useApp();
  const { bySlug } = useCatalog();
  const p = usePlayer();
  const router = useRouter();
  const list = c.seriesSlugs.map((s) => bySlug[s]).filter(Boolean);
  const following = state?.followedCollections.includes(c.id);
  const light = c.palette[0] === "#DFFF57";

  const playAll = () => {
    const items = list.map((s) => firstPlayable(s, state?.progress)).map((e, i) => (e ? catalogItem(list[i], e) : null)).filter(Boolean) as ReturnType<typeof catalogItem>[];
    if (items[0]) void p.play(items[0], { queue: items.slice(1) });
  };
  const patch = async (body: object) => setC(await api<CollectionRecord>(`/api/collections/${c.id}`, { method: "PATCH", body }));
  const del = async () => {
    if (!confirm("Delete this collection?")) return;
    await api(`/api/collections/${c.id}`, { method: "DELETE" });
    router.push("/collections");
  };
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: c.title, url: window.location.href });
      else { await navigator.clipboard.writeText(window.location.href); toast({ title: "Link copied", tone: "plain" }); }
    } catch { /* cancelled */ }
  };

  return (
    <div className="pb-safe-nav">
      <section className="px-4 pb-8 pt-[calc(14px+var(--safe-top))] md:px-10 md:pt-8" style={{ background: `linear-gradient(170deg, ${c.palette[0]}, ${c.palette[1]} 90%)`, color: light ? "#111114" : "#F7F4E9" }}>
        <Link href="/collections" className="inline-grid h-10 w-10 place-items-center rounded-full bg-black/20" aria-label="Back"><ChevronLeft size={20} /></Link>
        <div className="mt-8 text-xs font-bold uppercase tracking-[0.18em] opacity-70">{c.editorial ? "Staff pick" : "Collection"} · {c.isPublic ? "Public" : "Private"}</div>
        <h1 className="display mt-2 text-[40px] md:text-[72px]">{c.title}</h1>
        {c.description && <p className="editorial mt-2 text-2xl opacity-90">{c.description}</p>}
        <p className="mt-3 text-sm opacity-75">Curated by {c.ownerName} · {list.length} series · {c.followers} followers</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <button onClick={playAll} disabled={!list.length} className="btn h-12 bg-ink px-6 text-cream"><Play size={16} fill="currentColor" /> Play all</button>
          {!isOwner && <button onClick={() => api(`/api/collections/${c.id}/follow`, { body: { on: !following } }).then(() => setC((x) => ({ ...x, followers: x.followers + (following ? -1 : 1) })))} className="btn h-12 border border-current px-5">{following ? <Check size={16} /> : <Plus size={16} />} {following ? "Following" : "Follow"}</button>}
          <button onClick={share} className="grid h-12 w-12 place-items-center rounded-full border border-current" aria-label="Share"><Share2 size={18} /></button>
          {isOwner && (
            <>
              <button onClick={() => patch({ isPublic: !c.isPublic })} className="btn h-12 border border-current px-5">{c.isPublic ? <EyeOff size={16} /> : <Eye size={16} />} Make {c.isPublic ? "private" : "public"}</button>
              <button onClick={del} className="grid h-12 w-12 place-items-center rounded-full border border-current" aria-label="Delete collection"><Trash2 size={18} /></button>
            </>
          )}
        </div>
      </section>
      <ol className="px-4 md:px-10">
        {list.map((s, i) => (
          <li key={s.slug} className="flex items-center gap-4 border-b border-white/[0.06] py-4">
            <span className="w-6 text-center text-sm tabular-nums text-cream-mute">{i + 1}</span>
            <Link href={`/series/${s.slug}`} className="flex min-w-0 flex-1 items-center gap-4">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl"><CoverArt art={s.art} seed={s.slug} /></div>
              <div className="min-w-0">
                <div className="truncate font-bold">{s.title}</div>
                <div className="truncate text-sm text-cream-dim">{s.tagline}</div>
              </div>
            </Link>
            <button onClick={() => { const e = firstPlayable(s, state?.progress); if (e) void p.play(catalogItem(s, e)); }} className="grid h-11 w-11 place-items-center rounded-full bg-lime text-ink" aria-label={`Play ${s.title}`}><Play size={16} fill="currentColor" /></button>
            {isOwner && <button onClick={() => patch({ remove: s.slug })} className={cn("grid h-11 w-11 place-items-center rounded-full text-cream-mute hover:bg-white/10 hover:text-coral")} aria-label={`Remove ${s.title}`}><Trash2 size={16} /></button>}
          </li>
        ))}
        {list.length === 0 && <p className="py-8 text-sm text-cream-dim">Empty for now. Add series from any series page with the stack button.</p>}
      </ol>
    </div>
  );
}

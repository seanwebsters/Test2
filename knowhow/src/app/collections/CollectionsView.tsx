"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useApp } from "@/components/providers/AppState";
import { CollectionCard } from "@/components/catalog/CollectionCard";
import { Plus } from "@/components/ui/Icon";
import type { CollectionRecord } from "@/lib/model";
import { cn } from "@/lib/cn";

type Tab = "editorial" | "community" | "yours" | "following";

export function CollectionsView() {
  const { api, state, toast } = useApp();
  const [all, setAll] = useState<CollectionRecord[] | null>(null);
  const [tab, setTab] = useState<Tab>("editorial");
  const [title, setTitle] = useState("");

  useEffect(() => {
    api<CollectionRecord[]>("/api/collections").then(setAll).catch(() => setAll([]));
  }, [api]);

  const list = (all ?? []).filter((c) =>
    tab === "editorial" ? c.editorial : tab === "community" ? !c.editorial && c.ownerId !== state?.id : tab === "yours" ? c.ownerId === state?.id : state?.followedCollections.includes(c.id),
  );

  const create = async () => {
    if (title.trim().length < 3) return;
    const c = await api<CollectionRecord>("/api/collections", { body: { title } });
    setAll((a) => [...(a ?? []), c]);
    setTitle("");
    setTab("yours");
    toast({ title: "Collection created", body: "Add series from any series page.", tone: "lime" });
  };

  return (
    <div className="pb-safe-nav px-4 pt-[calc(20px+var(--safe-top))] md:px-10 md:pt-10">
      <h1 className="display text-[40px] md:text-[64px]">Collections</h1>
      <p className="editorial text-2xl text-cream-dim">Playlists for your brain.</p>
      <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto">
        {(["editorial", "community", "yours", "following"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn("relative shrink-0 rounded-full px-4 py-2 text-sm font-semibold capitalize", tab === t ? "text-ink" : "bg-white/[0.06] text-cream-dim")}>
            {tab === t && <motion.span layoutId="ctab" className="absolute inset-0 rounded-full bg-lime" />}
            <span className="relative">{t === "editorial" ? "Staff picks" : t}</span>
          </button>
        ))}
      </div>
      {tab === "yours" && (
        <form onSubmit={(e) => { e.preventDefault(); void create(); }} className="mt-6 flex max-w-md gap-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder="Name a new collection…" className="min-w-0 flex-1 rounded-full bg-ink-2 px-5 py-3 outline-none placeholder:text-cream-mute focus:ring-1 focus:ring-lime" />
          <button className="btn-lime h-12 px-5"><Plus size={16} /> Create</button>
        </form>
      )}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {!all && Array.from({ length: 5 }, (_, i) => <div key={i} className="skeleton aspect-[4/5]" />)}
        {list.map((c) => <CollectionCard key={c.id} c={c} />)}
      </div>
      {all && list.length === 0 && (
        <p className="mt-6 rounded-[24px] border border-dashed border-white/15 p-5 text-sm text-cream-dim">
          {tab === "community" ? "No community collections yet. Make yours public and it'll appear here." : tab === "following" ? "Follow a collection to keep it here." : "Nothing here yet."}
        </p>
      )}
    </div>
  );
}

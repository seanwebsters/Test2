"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "@/components/providers/AppState";
import { Check, Layers, Plus } from "@/components/ui/Icon";
import type { CollectionRecord } from "@/lib/model";

export function AddToCollection({ slug }: { slug: string }) {
  const { api, state, toast } = useApp();
  const [open, setOpen] = useState(false);
  const [mine, setMine] = useState<CollectionRecord[] | null>(null);
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (!open || !state) return;
    api<CollectionRecord[]>("/api/collections").then((all) => setMine(all.filter((c) => c.ownerId === state.id))).catch(() => setMine([]));
  }, [open, state, api]);

  const toggle = async (c: CollectionRecord) => {
    const has = c.seriesSlugs.includes(slug);
    const updated = await api<CollectionRecord>(`/api/collections/${c.id}`, { method: "PATCH", body: has ? { remove: slug } : { add: slug } });
    setMine((m) => m?.map((x) => (x.id === c.id ? updated : x)) ?? null);
    toast({ title: has ? "Removed" : "Added to collection", body: c.title, tone: "plain", icon: "list" });
  };
  const create = async () => {
    if (title.trim().length < 3) return;
    const c = await api<CollectionRecord>("/api/collections", { body: { title, seriesSlugs: [slug] } });
    setMine((m) => [...(m ?? []), c]);
    setTitle("");
    toast({ title: "Collection created", body: c.title, tone: "lime" });
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="grid h-14 w-14 place-items-center rounded-full border border-white/15 transition hover:border-white/30" aria-label="Add to a collection" aria-expanded={open}>
        <Layers size={20} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} className="absolute left-0 top-16 z-30 w-72 rounded-3xl border border-white/10 bg-ink-3 p-3 shadow-2xl">
            <div className="eyebrow px-1 pb-2">Your collections</div>
            {!mine && <div className="skeleton h-10" />}
            {mine?.length === 0 && <p className="px-1 pb-2 text-sm text-cream-mute">No collections yet. Start one:</p>}
            {mine?.map((c) => (
              <button key={c.id} onClick={() => toggle(c)} className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-sm hover:bg-white/10">
                <span className="truncate">{c.title}</span>
                {c.seriesSlugs.includes(slug) ? <Check size={16} className="text-lime" /> : <Plus size={16} className="text-cream-mute" />}
              </button>
            ))}
            <form onSubmit={(e) => { e.preventDefault(); void create(); }} className="mt-2 flex gap-2">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New collection…" maxLength={60} className="min-w-0 flex-1 rounded-full bg-black/30 px-4 py-2 text-sm outline-none placeholder:text-cream-mute focus:ring-1 focus:ring-lime" />
              <button type="submit" className="grid h-9 w-9 place-items-center rounded-full bg-lime text-ink" aria-label="Create collection"><Plus size={16} /></button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

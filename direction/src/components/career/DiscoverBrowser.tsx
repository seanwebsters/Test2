"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { CareerArt } from "./CareerArt";
import { cn } from "@/lib/cn";
import { CATEGORIES } from "@/lib/content/categories";
import { CAREERS } from "@/lib/content/careers";
import type { CategoryId } from "@/lib/content/types";

export function DiscoverBrowser({ matches }: { matches: Record<string, number> }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<CategoryId | null>(null);
  const [sort, setSort] = useState<"match" | "az" | "pay">(Object.keys(matches).length ? "match" : "az");
  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = CAREERS.filter((c) => (!cat || c.category === cat) && (!query || `${c.title} ${c.tagline} ${c.summary}`.toLowerCase().includes(query)));
    return list.sort((a, b) =>
      sort === "match" ? (matches[b.slug] ?? 0) - (matches[a.slug] ?? 0) || a.title.localeCompare(b.title) : sort === "pay" ? b.salary.mid - a.salary.mid : a.title.localeCompare(b.title),
    );
  }, [q, cat, sort, matches]);

  return (
    <div>
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" />
        <input className="input pl-11 pr-10" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${CAREERS.length} careers…`} aria-label="Search careers" />
        {q && (
          <button className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-3" onClick={() => setQ("")} aria-label="Clear search">
            <X size={16} />
          </button>
        )}
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button onClick={() => setCat(null)} className={cn("chip shrink-0", !cat && "!border-ink !bg-ink !text-bg")} aria-pressed={!cat}>
          All
        </button>
        {CATEGORIES.map((c) => (
          <button key={c.id} onClick={() => setCat(cat === c.id ? null : c.id)} className={cn("chip shrink-0", cat === c.id && "!border-ink !bg-ink !text-bg")} aria-pressed={cat === c.id}>
            <span aria-hidden="true">{c.emoji}</span> {c.name}
          </button>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="font-semibold text-ink-3" aria-live="polite">
          {results.length} career{results.length === 1 ? "" : "s"}
        </span>
        <label className="flex items-center gap-2 font-semibold text-ink-2">
          Sort
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="rounded-xl border border-line bg-surface px-2 py-1">
            {Object.keys(matches).length > 0 && <option value="match">Best match</option>}
            <option value="az">A–Z</option>
            <option value="pay">Typical pay</option>
          </select>
        </label>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
        {results.map((c) => (
          <Link key={c.slug} href={`/discover/${c.slug}`} className="card group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lift">
            <CareerArt slug={c.slug} category={c.category} className="h-24 md:h-28" rounded={false} showEmoji={false} />
            <div className="p-3">
              <div className="font-display text-[15px] font-bold leading-tight">{c.title}</div>
              <div className="mt-0.5 line-clamp-2 text-xs text-ink-3">{c.tagline}</div>
              <div className="mt-2 flex items-center justify-between text-[11px] font-bold">
                {matches[c.slug] ? <span className="text-teal">{matches[c.slug]}% match</span> : <span className="text-ink-3">{CATEGORIES.find((x) => x.id === c.category)?.emoji}</span>}
                {c.pathway === "full" && <span className="rounded-full bg-sun px-1.5 py-0.5 text-navy">FULL PATH</span>}
              </div>
            </div>
          </Link>
        ))}
      </div>
      {results.length === 0 && <p className="mt-10 text-center text-ink-3">No careers match that yet. Try another word — or ask Pip about it.</p>}
    </div>
  );
}

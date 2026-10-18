import Link from "next/link";
import { SearchBox } from "@/components/shell/SearchBox";
import { container, eyebrow } from "@/components/ui/styles";
import { search, trendingSearches, type SearchKind } from "@/lib/services/discovery";
import { pageCtx } from "@/lib/view/page";
import { SearchRecorder } from "./SearchRecorder";

export const metadata = { title: "Search" };

const KINDS: { id: SearchKind; label: string }[] = [
  { id: "universe", label: "Universes" },
  { id: "character", label: "Characters" },
  { id: "card", label: "Cards" },
  { id: "episode", label: "Episodes" },
  { id: "genre", label: "Genres" },
  { id: "collector", label: "Collectors" },
];

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; kind?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").slice(0, 80);
  const { state, at } = await pageCtx();
  const kind = KINDS.find((k) => k.id === sp.kind)?.id;
  const hits = q ? search(state, q, at, kind ? [kind] : undefined, 120) : [];
  const trending = trendingSearches(state, at);
  return (
    <div className={`${container} max-w-4xl pt-10`}>
      <SearchRecorder q={q} />
      <p className={eyebrow}>Search</p>
      <div className="mt-4"><SearchBox wide autoFocus={!q} /></div>
      {q && (
        <nav className="no-scrollbar mt-5 flex gap-1.5 overflow-x-auto" aria-label="Filter results">
          <Link href={`/search?q=${encodeURIComponent(q)}`} className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] font-semibold ${!kind ? "bg-bone text-ink" : "text-bone-2 hover:bg-white/5"}`}>All</Link>
          {KINDS.map((k) => (
            <Link key={k.id} href={`/search?q=${encodeURIComponent(q)}&kind=${k.id}`} className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] font-semibold ${kind === k.id ? "bg-bone text-ink" : "text-bone-2 hover:bg-white/5"}`}>{k.label}</Link>
          ))}
        </nav>
      )}
      {!q ? (
        <section className="mt-10">
          <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-bone-3">Trending searches</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {trending.map((t) => <Link key={t} href={`/search?q=${encodeURIComponent(t)}`} className="rounded-full border border-white/10 px-4 py-2 text-sm hover:border-white/30">{t}</Link>)}
          </div>
        </section>
      ) : hits.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-xl font-bold">Nothing found for “{q}”.</p>
          <p className="mt-2 text-bone-3">Try a character name, a card, a genre — or browse <Link className="underline" href="/universes">every universe</Link>.</p>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-white/5">
          {hits.map((h) => (
            <li key={`${h.kind}:${h.id}`}>
              <Link href={h.href} className="flex items-center gap-4 rounded-xl px-2 py-3 hover:bg-white/[0.03]">
                <span className="w-24 shrink-0 text-[10.5px] font-bold uppercase tracking-[0.14em] text-bone-4">{h.kind}</span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{h.title}</span>
                  <span className="block truncate text-sm text-bone-3">{h.subtitle}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

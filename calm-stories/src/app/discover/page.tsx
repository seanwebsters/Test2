import Link from "next/link";
import type { Metadata } from "next";
import { getViewer } from "@/lib/auth";
import { searchCatalog } from "@/lib/services/catalog";
import { GENRES } from "@/lib/types";
import { cx } from "@/lib/util";
import { SeriesCard } from "@/components/SeriesCard";
import { SearchIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Browse series" };

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<{ q?: string; genre?: string }> }) {
  const { q = "", genre } = await searchParams;
  const viewer = await getViewer();
  const activeGenre = genre && (GENRES as string[]).includes(genre) ? genre : null;
  const results = await searchCatalog(viewer, q, activeGenre);
  const href = (g: string | null) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (g) sp.set("genre", g);
    const s = sp.toString();
    return s ? `/discover?${s}` : "/discover";
  };
  return (
    <div className="mx-auto max-w-screen-2xl px-4 pt-10 sm:px-6 lg:px-10">
      <h1 className="font-serif text-5xl font-semibold">Browse series</h1>
      <p className="mt-2 text-mist">Every series on Calm Stories, from Calm Originals to new community creators.</p>
      <form action="/discover" className="mt-8 flex max-w-xl items-center gap-3 rounded-full border border-white/10 bg-white/5 px-5 py-3 focus-within:border-lavender/60" role="search">
        <SearchIcon size={18} className="text-mist" />
        <label htmlFor="q" className="sr-only">
          Search
        </label>
        <input id="q" name="q" defaultValue={q} placeholder="Search titles, creators, places, moods…" className="w-full bg-transparent text-white placeholder:text-mist/70 focus:outline-none" />
        {activeGenre && <input type="hidden" name="genre" value={activeGenre} />}
        <button className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-night">Search</button>
      </form>
      <nav aria-label="Genres" className="mt-6 flex flex-wrap gap-2">
        {[null, ...GENRES].map((g) => (
          <Link key={g ?? "all"} href={href(g)} aria-current={activeGenre === g ? "page" : undefined} className={cx("rounded-full border px-4 py-1.5 text-sm transition", activeGenre === g ? "border-lavender bg-lavender/15 text-white" : "border-white/10 text-mist hover:text-white")}>
            {g ?? "All genres"}
          </Link>
        ))}
      </nav>
      <p className="mt-8 text-sm text-mist" aria-live="polite">
        {results.length} series{q ? ` matching “${q}”` : ""}
      </p>
      {results.length ? (
        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 [&>article]:w-full">
          {results.map((c) => (
            <SeriesCard key={c.id} card={c} signedIn={!!viewer.user} />
          ))}
        </div>
      ) : (
        <div className="card-surface mt-6 p-10 text-center">
          <p className="font-serif text-2xl">Nothing found — yet.</p>
          <p className="mt-2 text-mist">Try a broader search, or create the story you were looking for in Storymaker.</p>
          <Link href="/create" className="mt-5 inline-block rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-night">
            Open Storymaker
          </Link>
        </div>
      )}
    </div>
  );
}

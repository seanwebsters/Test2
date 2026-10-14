import Link from "next/link";
import { getViewer } from "@/lib/auth/session";
import { canUseLibrary } from "@/lib/auth/policy";
import { searchCatalog } from "@/lib/services/catalog";
import { SeriesCard } from "@/components/catalog/SeriesCard";
import { EpisodeCard } from "@/components/catalog/EpisodeCard";
import { Icon } from "@/components/ui/Icon";
import { cx } from "@/lib/util";

export const metadata = { title: "Browse series" };

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<{ q?: string; genre?: string }> }) {
  const { q = "", genre = "" } = await searchParams;
  const viewer = await getViewer();
  const { series, episodes, genres } = await searchCatalog(q, genre || null);
  const canSave = canUseLibrary(viewer);
  const href = (g: string) => `/discover?${new URLSearchParams({ ...(q ? { q } : {}), ...(g ? { genre: g } : {}) })}`;
  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-16 pt-28 sm:px-8">
      <h1 className="headline text-5xl">Browse Sleep Stories</h1>
      <form role="search" className="relative mt-6 max-w-2xl" action="/discover">
        <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-mist" />
        <input name="q" defaultValue={q} aria-label="Search" placeholder="Search titles, worlds, creators, moods…" className="input rounded-full py-3.5 pl-12 text-base" />
        {genre && <input type="hidden" name="genre" value={genre} />}
      </form>
      <nav aria-label="Genres" className="mt-6 flex flex-wrap gap-2">
        <Link href={href("")} className={cx("rounded-full border px-4 py-1.5 text-sm", !genre ? "border-white bg-white text-night" : "border-white/15 text-mist hover:text-white")}>
          All
        </Link>
        {genres.map((g) => (
          <Link key={g} href={href(g)} aria-current={genre === g ? "page" : undefined} className={cx("rounded-full border px-4 py-1.5 text-sm", genre === g ? "border-white bg-white text-night" : "border-white/15 text-mist hover:text-white")}>
            {g}
          </Link>
        ))}
      </nav>
      <p className="mt-8 text-sm text-mist" aria-live="polite">
        {series.length} series{q && <> matching &ldquo;{q}&rdquo;</>}
      </p>
      <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-x-5 gap-y-8">
        {series.map((c) => (
          <SeriesCard key={c.id} card={c} canSave={canSave} />
        ))}
      </div>
      {series.length === 0 && <p className="mt-6 text-mist">No series found. Try a different word – &ldquo;rain&rdquo;, &ldquo;library&rdquo; or &ldquo;space&rdquo;.</p>}
      {episodes.length > 0 && (
        <section className="mt-14">
          <h2 className="headline text-3xl">Episodes</h2>
          <div className="mt-4 flex flex-wrap gap-5">
            {episodes.map((e) => (
              <EpisodeCard key={e.id} card={e} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

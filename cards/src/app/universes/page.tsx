import Link from "next/link";
import { FilterBar } from "@/components/cards/FilterBar";
import { container, eyebrow } from "@/components/ui/styles";
import { UniverseTile } from "@/components/universe/UniverseTile";
import { liveUniverses, releaseTime } from "@/lib/catalog";
import { GENRES } from "@/lib/content/types";
import { pageCtx } from "@/lib/view/page";
import { universeView } from "@/lib/view/universe";

export const metadata = { title: "Universes" };

export default async function UniversesPage({ searchParams }: { searchParams: Promise<{ genre?: string; sort?: string }> }) {
  const sp = await searchParams;
  const { state, user, at, idx } = await pageCtx();
  const views = liveUniverses(state, at)
    .filter((u) => !sp.genre || u.genres.includes(sp.genre as never))
    .map((u) => ({ u, v: universeView(state, u, user.id, at) }));
  const sorted = views.sort((a, b) =>
    sp.sort === "new" ? releaseTime(idx, b.u.launchOffsetDays) - releaseTime(idx, a.u.launchOffsetDays) : sp.sort === "az" ? a.u.title.localeCompare(b.u.title) : sp.sort === "mine" ? b.v.owned - a.v.owned : b.v.followers - a.v.followers,
  );
  return (
    <div className={`${container} pt-10`}>
      <p className={eyebrow}>Universes</p>
      <h1 className="mt-2 text-4xl font-extrabold tracking-tight md:text-5xl">{sorted.length} worlds and counting.</h1>
      <p className="mt-3 max-w-2xl text-bone-2">Each one is a complete original franchise — its own art direction, cast, story and card set. New universes are added as they clear production in <Link href="/studio" className="underline">NEXARA Studio</Link>.</p>
      <div className="mt-8">
        <FilterBar
          base="/universes"
          current={sp}
          groups={[
            { key: "sort", label: "Sort", options: [{ value: "new", label: "Newest" }, { value: "az", label: "A–Z" }, { value: "mine", label: "My collection" }] },
            { key: "genre", label: "Genre", options: GENRES.map((g) => ({ value: g.id, label: g.label })) },
          ]}
        />
      </div>
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 [&>a]:w-full">
        {sorted.map(({ u, v }) => <UniverseTile key={u.id} u={v} />)}
      </div>
    </div>
  );
}

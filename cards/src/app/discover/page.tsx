import Link from "next/link";
import { Art } from "@/components/art/Art";
import { Row } from "@/components/feed/Row";
import { container, eyebrow } from "@/components/ui/styles";
import { UniverseTile } from "@/components/universe/UniverseTile";
import { liveUniverses, releaseTime } from "@/lib/catalog";
import { GENRES } from "@/lib/content/types";
import { becauseYouCollected, recommend, universeStats } from "@/lib/services/discovery";
import { pageCtx } from "@/lib/view/page";
import { universeView } from "@/lib/view/universe";

export const metadata = { title: "Discover" };

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<{ genre?: string }> }) {
  const { genre } = await searchParams;
  const { state, user, at, idx } = await pageCtx();
  const live = liveUniverses(state, at);
  const views = new Map(live.map((u) => [u.id, universeView(state, u, user.id, at)]));
  const V = (id: string) => views.get(id)!;
  const stats = universeStats(state, at);
  const recs = recommend({ state, userId: user.id, at });
  const because = becauseYouCollected(state, user.id, at);
  const g = GENRES.find((x) => x.id === genre);
  const sample = (gid: string) => live.find((u) => u.genres[0] === gid) ?? live.find((u) => u.genres.includes(gid as never)) ?? live[0]!;

  return (
    <div className="pt-10">
      <div className={container}>
        <p className={eyebrow}>Discover</p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight md:text-5xl">{g ? g.label : "Find your next obsession."}</h1>
        <div className="no-scrollbar -mx-4 mt-6 flex gap-3 overflow-x-auto px-4 pb-2 md:-mx-8 md:px-8">
          {GENRES.map((x) => {
            const u = sample(x.id);
            const on = x.id === genre;
            const count = live.filter((v) => v.genres.includes(x.id)).length;
            return (
              <Link key={x.id} href={on ? "/discover" : `/discover?genre=${x.id}`} className={`focus-ring relative h-24 w-40 shrink-0 overflow-hidden rounded-2xl border ${on ? "border-ember ring-2 ring-ember" : "border-white/10"}`} aria-current={on ? "true" : undefined}>
                <Art style={u.style.artStyle} palette={u.style.palette} seed={x.id.length * 977} aspect="hero" sceneOnly className="absolute inset-0 h-full w-full" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-black/10" />
                <span className="absolute bottom-2.5 left-3 text-[15px] font-bold">{x.label}</span>
                <span className="absolute right-2.5 top-2 text-[11px] font-bold text-white/70">{count}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {g ? (
        <div className={`${container} mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5`}>
          {live.filter((u) => u.genres.includes(g.id)).map((u) => <UniverseTile key={u.id} u={V(u.id)} />)}
          {live.filter((u) => u.genres.includes(g.id)).length === 0 && <p className="text-bone-3">No universes in this genre yet.</p>}
        </div>
      ) : (
        <>
          <Row title="Recommended for you" subtitle={user.genres.length ? "Ranked by your genres, collection, reading and what's new" : "Tell us your genres in onboarding for sharper picks"} id="rfy">
            {recs.slice(0, 10).map((r) => <UniverseTile key={r.universe.id} u={V(r.universe.id)} note={r.reasons.join(" · ")} />)}
          </Row>
          {because && because.similar.length > 0 && (
            <Row title={`Because you collected ${because.card.name}`} id="byc">
              {because.similar.map((u) => <UniverseTile key={u.id} u={V(u.id)} />)}
            </Row>
          )}
          <Row title="New & noteworthy" subtitle="Launched in the last few weeks" id="new">
            {[...live].sort((a, b) => releaseTime(idx, b.launchOffsetDays) - releaseTime(idx, a.launchOffsetDays)).slice(0, 8).map((u) => <UniverseTile key={u.id} u={V(u.id)} />)}
          </Row>
          <Row title="Fastest growing" subtitle="Week-on-week follower growth" id="fast">
            {[...live].sort((a, b) => stats.get(b.id)!.shown.growth - stats.get(a.id)!.shown.growth).map((u) => <UniverseTile key={u.id} u={V(u.id)} note={`+${Math.round(stats.get(u.id)!.shown.growth * 100)}% this week`} />)}
          </Row>
          <Row title="Most followed" id="followed">
            {[...live].sort((a, b) => stats.get(b.id)!.shown.followers - stats.get(a.id)!.shown.followers).map((u, i) => <UniverseTile key={u.id} u={V(u.id)} rank={i + 1} />)}
          </Row>
          <Row title="Hidden gems" subtitle="Editors' picks with smaller, devoted fandoms" id="gems">
            {live.filter((u) => u.editorial.hiddenGem || stats.get(u.id)!.shown.followers < 100_000).map((u) => <UniverseTile key={u.id} u={V(u.id)} />)}
          </Row>
        </>
      )}
      <p className={`${container} mt-12 text-[11.5px] text-bone-4`}>Recommendations use a transparent baseline model (genres, collection, reading, recency, popularity and editorial picks). Popularity figures include seeded demo data.</p>
    </div>
  );
}

import Link from "next/link";
import { Art } from "@/components/art/Art";
import { Countdown } from "@/components/ui/Countdown";
import { container, eyebrow } from "@/components/ui/styles";
import { isReleased, liveUniverses, releaseTime } from "@/lib/catalog";
import { hashString } from "@/lib/content/build";
import type { Episode, Universe } from "@/lib/content/types";
import { episodeAccess } from "@/lib/services/story";
import { pageCtx } from "@/lib/view/page";

export const metadata = { title: "Stories" };

function EpisodeTile({ e, u, note }: { e: Episode; u: Universe; note?: React.ReactNode }) {
  return (
    <Link href={`/stories/${e.id}`} className="focus-ring group relative block aspect-[4/5] w-[60vw] shrink-0 snap-start overflow-hidden rounded-3xl sm:w-[230px]" style={{ background: u.style.palette.bg }}>
      <Art style={u.style.artStyle} palette={u.style.palette} seed={hashString(e.id)} aspect="tall" sceneOnly className="absolute inset-0 h-full w-full transition duration-700 group-hover:scale-105" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4">
        <p className={`ff-${u.style.displayFont} text-sm`} style={{ color: u.style.palette.accent }}>{u.title}</p>
        <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">S{e.season} · E{e.number}</p>
        <h3 className="mt-1 text-lg font-bold leading-tight">{e.title}</h3>
        {note && <p className="mt-1.5 text-[12px] text-white/70">{note}</p>}
      </div>
    </Link>
  );
}

export default async function StoriesPage() {
  const { state, user, at, idx } = await pageCtx();
  const live = liveUniverses(state, at);
  const all = live.flatMap((u) => u.episodes.map((e) => ({ e, u, a: episodeAccess(state, user.id, e, at) })));
  const reading = all.filter((x) => x.a.released && x.a.unlocked && !x.a.completed && state.events.some((ev) => ev.userId === user.id && ev.name === "episode_started" && ev.props?.episodeId === x.e.id));
  const fresh = all.filter((x) => x.a.released).sort((a, b) => b.e.releaseOffsetDays - a.e.releaseOffsetDays).slice(0, 12);
  const firsts = live.map((u) => ({ u, e: u.episodes[0]! })).filter((x) => x.e);
  const soon = all.filter((x) => !x.a.released).sort((a, b) => a.a.releaseAt - b.a.releaseAt);
  const Row = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="mt-12">
      <h2 className="text-xl font-extrabold tracking-tight">{title}</h2>
      <div className="no-scrollbar -mx-4 mt-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 md:-mx-8 md:px-8">{children}</div>
    </section>
  );
  return (
    <div className={`${container} pt-10`}>
      <p className={eyebrow}>Stories</p>
      <h1 className="mt-2 text-4xl font-extrabold tracking-tight md:text-5xl">Every card is a chapter.</h1>
      <p className="mt-3 max-w-2xl text-bone-2">Short episodes you can read in minutes. Each one introduces new collectible cards — finish an episode and its pack is yours, free.</p>
      {reading.length > 0 && <Row title="Continue reading">{reading.map((x) => <EpisodeTile key={x.e.id} e={x.e} u={x.u} note="In progress" />)}</Row>}
      <Row title="New episodes">{fresh.map((x) => <EpisodeTile key={x.e.id} e={x.e} u={x.u} note={x.a.completed ? "Read ✓" : x.a.unlocked ? `${x.e.minutes} min` : "Locked"} />)}</Row>
      <Row title="Start a new story">{firsts.map((x) => <EpisodeTile key={x.e.id} e={x.e} u={x.u} note={x.u.tagline} />)}</Row>
      <section className="mt-12">
        <h2 className="text-xl font-extrabold tracking-tight">Release schedule</h2>
        <ul className="mt-4 divide-y divide-white/5 rounded-2xl border border-white/10 bg-ink-2">
          {soon.map(({ e, u }) => (
            <li key={e.id}>
              <Link href={`/stories/${e.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-white/[0.03]">
                <span className={`ff-${u.style.displayFont} w-40 shrink-0 truncate`} style={{ color: u.style.palette.accent }}>{u.title}</span>
                <span className="min-w-0 flex-1 truncate font-semibold">E{e.number} · {e.title}</span>
                <span className="hidden text-[12px] text-bone-3 sm:inline">{new Date(releaseTime(idx, e.releaseOffsetDays)).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })}</span>
                <span className="w-20 text-right text-[12px] text-bone-2"><Countdown to={releaseTime(idx, e.releaseOffsetDays)} compact /></span>
              </Link>
            </li>
          ))}
          {soon.length === 0 && <li className="p-4 text-sm text-bone-3">Nothing scheduled.</li>}
        </ul>
        <p className="mt-2 text-[12px] text-bone-4">{all.filter((x) => isReleased(idx, x.e.releaseOffsetDays, at)).length} episodes available across {live.length} universes.</p>
      </section>
    </div>
  );
}

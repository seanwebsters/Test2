import Link from "next/link";
import { BookOpen, Check, Clock, Lock } from "lucide-react";
import { Art } from "@/components/art/Art";
import { Countdown } from "@/components/ui/Countdown";
import { container } from "@/components/ui/styles";
import { hashString } from "@/lib/content/build";
import { episodeAccess } from "@/lib/services/story";
import { liveUniverseOr404 } from "@/lib/view/load";
import { pageCtx } from "@/lib/view/page";

export const metadata = { title: "Story" };

export default async function UniverseStories({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { state, user, at } = await pageCtx();
  const u = liveUniverseOr404(state, slug, at, user.role === "admin");
  return (
    <div className={`${container} py-10`}>
      {u.seasons.map((s) => {
        const eps = u.episodes.filter((e) => e.season === s.number);
        return (
          <section key={s.number} className="mb-14">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-bone-3">Season {s.number} · {s.plannedEpisodes} episodes planned</p>
            <h2 className={`ff-${u.style.displayFont} mt-1 text-4xl`} style={{ color: u.style.palette.ink }}>{s.title}</h2>
            <p className="mt-2 max-w-2xl text-bone-2">{s.synopsis}</p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {eps.map((e) => {
                const a = episodeAccess(state, user.id, e, at);
                return (
                  <Link key={e.id} href={`/stories/${e.id}`} className="focus-ring group flex gap-4 rounded-2xl border border-white/10 bg-ink-2 p-3 transition hover:border-white/25">
                    <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl sm:h-32 sm:w-44">
                      <Art style={u.style.artStyle} palette={u.style.palette} seed={hashString(e.id)} aspect="hero" sceneOnly className={`h-full w-full ${a.released ? "" : "opacity-40 grayscale"}`} />
                      <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-bold">E{e.number}</span>
                    </div>
                    <div className="min-w-0 py-1">
                      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-bone-3">
                        {a.completed ? <><Check size={12} className="text-uncommon" /> Read</> : !a.released ? <><Clock size={12} /> <Countdown to={a.releaseAt} compact /></> : a.unlocked ? <><BookOpen size={12} /> {e.minutes} min</> : <><Lock size={12} /> Locked</>}
                        <span className="text-bone-4">· {e.cardIds.length} cards</span>
                      </p>
                      <h3 className="mt-1 truncate text-lg font-bold">{e.title}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-bone-3">{e.synopsis}</p>
                      {!a.unlocked && a.released && a.requirement && <p className="mt-1 text-[12px] text-ember-2">{a.requirement}{a.progress ? ` (${a.progress.have}/${a.progress.need})` : ""}</p>}
                    </div>
                  </Link>
                );
              })}
              {eps.length < s.plannedEpisodes && (
                <div className="grid place-items-center rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-bone-4">
                  {s.plannedEpisodes - eps.length} more episodes in production
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

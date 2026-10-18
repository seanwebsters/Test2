import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Lock } from "lucide-react";
import { Art } from "@/components/art/Art";
import { CardThumb } from "@/components/cards/CardThumb";
import { Countdown } from "@/components/ui/Countdown";
import { btn, container, eyebrow } from "@/components/ui/styles";
import { isLive, isReleased } from "@/lib/catalog";
import { hashString } from "@/lib/content/build";
import { episodeAccess, ownedInUniverse } from "@/lib/services/story";
import { faceFor } from "@/lib/view/face";
import { pageCtx } from "@/lib/view/page";
import { Reader, UnlockButton } from "./Reader";

export default async function EpisodePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { state, user, at, idx } = await pageCtx();
  const ep = idx.episodes.get(id);
  const u = ep && idx.byId.get(ep.universeId);
  if (!ep || !u || (!isLive(idx, u, at) && user.role !== "admin")) notFound();
  const a = episodeAccess(state, user.id, ep, at);
  const inv = state.inventory[user.id] ?? {};
  const next = u.episodes.find((e) => e.season === ep.season && e.number === ep.number + 1);
  const p = u.style.palette;
  const chars = u.characters.filter((c) => ep.characterIds.includes(c.id));
  const cards = ep.cardIds.map((cid) => idx.cards.get(cid)!).filter(Boolean);
  const owned = ownedInUniverse(state, user.id, u.id);
  const total = u.cards.filter((c) => isReleased(idx, c.releaseOffsetDays, at)).length;

  return (
    <article style={{ background: `linear-gradient(180deg, ${p.bg} 0%, #09090d 70%)` }}>
      <header className="relative isolate overflow-hidden">
        <div className="nx-animate absolute inset-0 -z-10">
          <Art style={u.style.artStyle} palette={p} seed={hashString(ep.id)} aspect="hero" sceneOnly className="h-full w-full" />
        </div>
        <div className="absolute inset-0 -z-10" style={{ background: `linear-gradient(0deg, ${p.bg} 5%, ${p.bg}66 60%, ${p.bg}99 100%)` }} />
        <div className="mx-auto flex min-h-[56vh] max-w-3xl flex-col justify-end px-5 pb-10 pt-16">
          <Link href={`/universes/${u.slug}/stories`} className="mb-auto flex w-fit items-center gap-1.5 text-[13px] font-semibold text-white/70 hover:text-white"><ArrowLeft size={15} /> {u.title}</Link>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: p.accent }}>Season {ep.season} · Episode {ep.number} · {ep.minutes} min read</p>
          <h1 className={`ff-${u.style.displayFont} mt-3 text-5xl leading-[1] md:text-6xl`} style={{ color: p.ink }}>{ep.title}</h1>
          <p className="mt-4 text-lg text-white/80">{ep.synopsis}</p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 pb-10">
        {!a.released ? (
          <div className="rounded-3xl border border-white/10 bg-ink-2 p-8 text-center">
            <Clock className="mx-auto text-bone-3" />
            <p className="mt-3 text-lg font-bold">Releases soon</p>
            <div className="mt-4 flex justify-center"><Countdown to={a.releaseAt} /></div>
            <p className="mt-4 text-sm text-bone-3">{ep.cardIds.length} new cards arrive with this episode. Follow {u.title} to be notified.</p>
          </div>
        ) : !a.unlocked ? (
          <div className="rounded-3xl border border-white/10 bg-ink-2 p-8 text-center">
            <Lock className="mx-auto text-bone-3" />
            <p className="mt-3 text-lg font-bold">{a.requirement}</p>
            {a.progress && (
              <div className="mx-auto mt-4 max-w-xs">
                <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${(a.progress.have / a.progress.need) * 100}%`, background: p.accent }} /></div>
                <p className="mt-2 text-sm text-bone-3">{a.progress.have} / {a.progress.need} cards collected</p>
                <Link href={`/packs/standard?u=${u.slug}`} className={`${btn("primary")} mt-4`}>Open {u.title} packs</Link>
              </div>
            )}
            {a.canUnlockWithShards && <div className="mt-5 flex justify-center"><UnlockButton episodeId={ep.id} cost={a.canUnlockWithShards} /></div>}
            <p className="mt-4 text-[12px] text-bone-4">Every episode can be unlocked for free through collecting or Shards earned in-app.</p>
          </div>
        ) : (
          <Reader
            episodeId={ep.id}
            universeId={u.id}
            universeSlug={u.slug}
            title={ep.title}
            body={ep.body}
            font={u.style.displayFont}
            ink={p.ink}
            accent={p.accent}
            completed={a.completed}
            rewardAvailable={a.rewardAvailable}
            shardReward={state.economy.episodeCompletionShards}
            nextHref={next ? `/stories/${next.id}` : undefined}
            cliffhanger={ep.cliffhanger}
          />
        )}
      </div>

      <div className={`${container} pb-10`}>
        <section className="mt-6">
          <p className={eyebrow}>Introduced in this episode</p>
          <div className="no-scrollbar -mx-4 mt-4 flex gap-4 overflow-x-auto px-4 pb-2">
            {cards.map((c) => (
              <CardThumb key={c.id} face={faceFor(c, u)} locked={!inv[c.id]} count={inv[c.id]?.count} className="w-[40vw] sm:w-[170px]" />
            ))}
          </div>
          <p className="mt-2 text-sm text-bone-3">Your {u.title} collection: {owned}/{total}</p>
        </section>
        {chars.length > 0 && (
          <section className="mt-12">
            <p className={eyebrow}>Characters in this episode</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {chars.map((c) => (
                <Link key={c.id} href={`/universes/${u.slug}/characters#${c.id}`} className="rounded-2xl border border-white/10 bg-ink-2 px-4 py-3 hover:border-white/25">
                  <p className="font-bold">{c.name}</p>
                  <p className="text-[13px] text-bone-3">{c.title}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </article>
  );
}

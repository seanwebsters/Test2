import Link from "next/link";
import { notFound } from "next/navigation";
import { CardThumb } from "@/components/cards/CardThumb";
import { RarityLabel } from "@/components/cards/RarityGem";
import { container, eyebrow } from "@/components/ui/styles";
import { isLive, isReleased, releaseTime } from "@/lib/catalog";
import type { Variant } from "@/lib/content/types";
import { faceFor } from "@/lib/view/face";
import { pageCtx } from "@/lib/view/page";
import { CardInspector } from "./CardInspector";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: id, openGraph: { images: [`/api/cards/${id}/image`] } };
}

export default async function CardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { state, user, at, idx } = await pageCtx();
  const card = idx.cards.get(id);
  const u = card && idx.byId.get(card.universeId);
  if (!card || !u || ((!isLive(idx, u, at) || !isReleased(idx, card.releaseOffsetDays, at)) && user.role !== "admin")) notFound();
  const inv = state.inventory[user.id] ?? {};
  const owned = inv[card.id];
  const face = faceFor(card, u);
  const faction = u.factions.find((f) => f.id === card.factionId);
  const character = u.characters.find((c) => c.id === card.characterId);
  const episode = card.episodeId ? idx.episodes.get(card.episodeId) : undefined;
  const set = u.sets.find((s) => s.id === card.setId)!;
  const setCards = u.cards.filter((c) => c.setId === set.id && isReleased(idx, c.releaseOffsetDays, at));
  const setOwned = setCards.filter((c) => inv[c.id]).length;
  const related = u.cards
    .filter((c) => c.id !== card.id && isReleased(idx, c.releaseOffsetDays, at))
    .filter((c) => (character && (c.characterId === character.id || character.relationships.some((r) => r.to === c.characterId))) || (card.episodeId && c.episodeId === card.episodeId) || (card.factionId && c.factionId === card.factionId))
    .slice(0, 8);
  const collectors = Object.values(state.inventory).filter((i) => i[card.id]).length;
  const favourite = state.favourites.some((f) => f.userId === user.id && f.cardId === card.id);
  const craftCost = state.economy.craftCost[card.rarity];
  const wallet = state.wallets[user.id];

  return (
    <div className={`${container} py-10`}>
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <CardInspector face={face} owned={!!owned} ownedVariants={Object.keys(owned?.variants ?? {}) as Variant[]} favourite={favourite} craftCost={craftCost} canCraft={!owned && (wallet?.stardust ?? 0) >= craftCost} />
        <div>
          <Link href={`/universes/${u.slug}`} className={`ff-${u.style.displayFont} text-xl`} style={{ color: u.style.palette.accent }}>{u.title}</Link>
          <h1 className={`ff-${u.style.displayFont} mt-2 text-5xl leading-none md:text-6xl`} style={{ color: u.style.palette.ink }}>{card.name}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <RarityLabel rarity={card.rarity} className="text-[13px]" />
            <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-bone-3">{card.kind}</span>
            {faction && <span className="text-[12px] font-semibold uppercase tracking-[0.12em]" style={{ color: faction.color }}>{faction.name}</span>}
          </div>
          <p className="mt-6 text-xl leading-relaxed">{card.description}</p>
          <div className="mt-6 rounded-2xl border border-white/10 bg-ink-2 p-5">
            <p className={eyebrow}>Lore</p>
            {owned ? <p className="mt-2 leading-relaxed text-bone-2">{card.lore}</p> : <p className="mt-2 select-none text-transparent [text-shadow:0_0_9px_rgba(255,255,255,.45)]">{card.lore}</p>}
            {!owned && <p className="mt-2 text-sm text-bone-3">Discover this card to read its lore.</p>}
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <div><dt className="text-bone-4">Card</dt><dd className="font-semibold">{set.code} {String(card.number).padStart(3, "0")}</dd></div>
            <div><dt className="text-bone-4">Set</dt><dd className="font-semibold">{set.name}</dd></div>
            <div><dt className="text-bone-4">Season</dt><dd className="font-semibold">{card.season}</dd></div>
            <div><dt className="text-bone-4">Released</dt><dd className="font-semibold">{new Date(releaseTime(idx, card.releaseOffsetDays)).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}</dd></div>
            <div><dt className="text-bone-4">Your copies</dt><dd className="font-semibold">{owned ? `×${owned.count}` : "Not yet"}</dd></div>
            <div><dt className="text-bone-4">Collectors</dt><dd className="font-semibold">{collectors}</dd></div>
            <div className="col-span-2 sm:col-span-3"><dt className="text-bone-4">Card ID</dt><dd className="font-mono text-[12px]">{card.id}</dd></div>
          </dl>
          <div className="mt-6 rounded-2xl border border-white/10 p-4">
            <div className="flex items-center justify-between text-sm"><span>Part of <b>{set.name}</b></span><span className="font-semibold">{setOwned}/{setCards.length}</span></div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${(setOwned / setCards.length) * 100}%`, background: u.style.palette.accent }} /></div>
            <Link href={`/collection/${u.slug}`} className="mt-3 inline-block text-[13px] font-semibold text-bone-3 hover:text-bone">Open binder →</Link>
          </div>
          {(character || episode) && (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {character && (
                <Link href={`/universes/${u.slug}/characters#${character.id}`} className="rounded-2xl border border-white/10 bg-ink-2 p-4 hover:border-white/25">
                  <p className={eyebrow}>Character</p>
                  <p className="mt-1 font-bold">{character.name}</p>
                  <p className="text-sm text-bone-3">{character.title}</p>
                </Link>
              )}
              {episode && (
                <Link href={`/stories/${episode.id}`} className="rounded-2xl border border-white/10 bg-ink-2 p-4 hover:border-white/25">
                  <p className={eyebrow}>Introduced in</p>
                  <p className="mt-1 font-bold">S{episode.season} E{episode.number} · {episode.title}</p>
                  <p className="line-clamp-1 text-sm text-bone-3">{episode.synopsis}</p>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="text-xl font-extrabold">Related cards</h2>
          <div className="no-scrollbar -mx-4 mt-4 flex gap-4 overflow-x-auto px-4 pb-2">
            {related.map((c) => (
              <CardThumb key={c.id} face={faceFor(c, u)} locked={!inv[c.id]} count={inv[c.id]?.count} className="w-[40vw] sm:w-[170px]" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

import Link from "next/link";
import { CardThumb } from "@/components/cards/CardThumb";
import { Avatar } from "@/components/ui/Avatar";
import { container, eyebrow } from "@/components/ui/styles";
import { catalog } from "@/lib/catalog";
import { RARITY_META, rarityRank } from "@/lib/economy/config";
import type { DbState, User } from "@/lib/db/types";
import { ACHIEVEMENTS } from "@/lib/services/achievements";
import { bestVariant, collectionSummary } from "@/lib/view/collection";
import { faceFor } from "@/lib/view/face";

const ago = (ms: number) => (ms < 3600_000 ? `${Math.max(1, Math.round(ms / 60_000))}m` : ms < 86_400_000 ? `${Math.round(ms / 3600_000)}h` : `${Math.round(ms / 86_400_000)}d`);

export function ProfileView({ state, user, at, actions }: { state: DbState; user: User; at: number; actions?: React.ReactNode }) {
  const idx = catalog(state);
  const inv = state.inventory[user.id] ?? {};
  const sum = collectionSummary(state, user.id, at);
  const showcase = (user.showcase.length ? user.showcase : Object.keys(inv).sort((a, b) => rarityRank(idx.cards.get(b)!.rarity) - rarityRank(idx.cards.get(a)!.rarity)).slice(0, 6)).filter((id) => inv[id] && idx.cards.has(id));
  const followers = state.userFollows.filter((f) => f.followeeId === user.id).length;
  const following = state.userFollows.filter((f) => f.followerId === user.id).length;
  const badges = state.achievements.filter((a) => a.userId === user.id);
  const activity = state.openings.filter((o) => o.userId === user.id).slice(-12).reverse().map((o) => {
    const best = [...o.items].sort((a, b) => rarityRank(b.rarity) - rarityRank(a.rarity))[0]!;
    return { o, best, card: idx.cards.get(best.cardId)! };
  });
  const followedUniverses = state.follows.filter((f) => f.userId === user.id).map((f) => idx.byId.get(f.universeId)).filter(Boolean);
  return (
    <div className={`${container} pt-10`}>
      <header className="flex flex-col gap-6 md:flex-row md:items-center">
        <Avatar seed={user.avatarSeed} name={user.displayName} size={96} />
        <div className="flex-1">
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">{user.displayName}</h1>
          <p className="text-bone-3">@{user.username}{user.isDemo ? " · demo collector" : ""}{user.isGuest ? " · guest" : ""}</p>
          {user.bio && <p className="mt-2 max-w-xl text-bone-2">{user.bio}</p>}
          <p className="mt-3 flex flex-wrap gap-4 text-sm text-bone-2">
            <span><b className="text-bone">{sum.unique}</b> cards</span>
            <span><b className="text-bone">{sum.universes.filter((u) => u.complete).length}</b> sets complete</span>
            <span><b className="text-bone">{followers}</b> followers</span>
            <span><b className="text-bone">{following}</b> following</span>
          </p>
        </div>
        {actions}
      </header>

      <section className="mt-12">
        <p className={eyebrow}>Showcase</p>
        {showcase.length ? (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {showcase.map((id) => {
              const c = idx.cards.get(id)!;
              return <CardThumb key={id} face={faceFor(c, idx.byId.get(c.universeId)!)} variant={bestVariant(inv[id])} className="w-full" />;
            })}
          </div>
        ) : (
          <p className="mt-3 text-bone-3">No cards yet.</p>
        )}
      </section>

      <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_380px]">
        <section>
          <p className={eyebrow}>Collections</p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {sum.universes.filter((u) => u.owned > 0).map((u) => (
              <li key={u.id} className="rounded-2xl border border-white/10 bg-ink-2 p-4">
                <Link href={`/universes/${u.slug}`} className={`ff-${u.font} text-xl`} style={{ color: u.palette.accent }}>{u.title}</Link>
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${(u.owned / u.total) * 100}%`, background: u.palette.accent }} /></div>
                  <span className="text-[12px] tabular-nums text-bone-3">{u.owned}/{u.total}</span>
                </div>
              </li>
            ))}
          </ul>
          {followedUniverses.length > 0 && (
            <>
              <p className={`${eyebrow} mt-10`}>Fandoms</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {followedUniverses.map((u) => <Link key={u!.id} href={`/universes/${u!.slug}`} className="rounded-full border border-white/10 px-3 py-1.5 text-sm hover:border-white/30">{u!.title}</Link>)}
              </div>
            </>
          )}
          <p className={`${eyebrow} mt-10`}>Badges</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {badges.length ? badges.map((b) => {
              const def = ACHIEVEMENTS.find((a) => a.key === b.key);
              const u = b.key.startsWith("complete:") ? idx.byId.get(b.key.split(":")[1]!) : undefined;
              return <span key={b.key} className="rounded-full border border-legendary/30 bg-legendary/10 px-3 py-1.5 text-[13px] font-semibold text-legendary">{def?.title ?? `${u?.title ?? "Set"} complete`}</span>;
            }) : <span className="text-sm text-bone-3">No badges yet.</span>}
          </div>
        </section>
        <section>
          <p className={eyebrow}>Recent activity</p>
          <ul className="mt-4 space-y-2">
            {activity.map(({ o, best, card }) => (
              <li key={o.id} className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5 text-sm">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: RARITY_META[best.rarity].color }} />
                <span className="min-w-0 flex-1 truncate">Opened a {o.packType} pack · best: <Link href={`/cards/${card.id}`} className="font-semibold hover:underline" style={{ color: RARITY_META[best.rarity].color }}>{card.name}</Link></span>
                <span className="text-[11px] text-bone-4">{ago(at - Date.parse(o.createdAt))}</span>
              </li>
            ))}
            {!activity.length && <li className="text-sm text-bone-3">No activity yet.</li>}
          </ul>
          <div className="mt-6 rounded-2xl border border-dashed border-white/15 p-4 text-[13px] text-bone-3">
            <p className="font-semibold text-bone-2">Trading — coming later</p>
            <p className="mt-1">Duplicates ({sum.duplicates}) will be swappable card-for-card between collectors. No cash value, no auctions. The trade data model is ready (see docs/ARCHITECTURE.md).</p>
          </div>
        </section>
      </div>
    </div>
  );
}

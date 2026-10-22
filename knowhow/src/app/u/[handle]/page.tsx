import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { store } from "@/lib/store";
import { allCollections } from "@/lib/collections";
import { levelProgress } from "@/lib/gamification";
import { PublicProfile } from "./PublicProfile";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  return { title: `@${(await params).handle}` };
}

/** Only what a listener chose to make public: no listening positions, wallet or private collections. */
export default async function Page({ params }: { params: Promise<{ handle: string }> }) {
  const u = await store.findUserByHandle((await params).handle);
  if (!u) notFound();
  if (!u.isPublic) {
    return <div className="grid min-h-[60vh] place-items-center px-6 text-center"><div><div className="display text-3xl">@{u.handle}</div><p className="mt-2 text-cream-dim">This profile is private.</p></div></div>;
  }
  const collections = (await allCollections()).filter((c) => c.ownerId === u.id && c.isPublic);
  const lp = levelProgress(u.xp);
  return (
    <PublicProfile
      profile={{
        handle: u.handle, displayName: u.displayName, bio: u.bio, avatarHue: u.avatarHue, level: lp.level, title: lp.title, xp: u.xp,
        streak: u.streak, completed: Object.entries(u.progress).filter(([, p]) => p.completed).map(([id]) => id),
        favourites: u.favourites, completedSeries: u.completedSeries, cards: u.cards, interests: u.interests,
        minutes: Math.round(Object.values(u.days).reduce((a, b) => a + b, 0) / 60), collections,
      }}
    />
  );
}

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getViewer } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getSeriesCards } from "@/lib/services/catalog";
import { Avatar } from "@/components/Avatar";
import { FollowButton } from "@/components/actions";
import { SeriesCard } from "@/components/SeriesCard";

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const profile = await getDb().findOne("creator_profiles", { username });
  return { title: profile?.display_name ?? "Creator" };
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const viewer = await getViewer();
  const db = getDb();
  const profile = await db.findOne("creator_profiles", { username });
  if (!profile) notFound();
  const [series, followers, following] = await Promise.all([
    db.list("series", { where: { creator_id: profile.user_id, status: "published" } }),
    db.count("creator_follows", { creator_id: profile.user_id }),
    viewer.user ? db.findOne("creator_follows", { user_id: viewer.user.id, creator_id: profile.user_id }) : Promise.resolve(null),
  ]);
  const cards = await getSeriesCards(viewer, series.map((s) => s.id));
  const totalEpisodes = cards.reduce((a, c) => a + c.episodeCount, 0);
  const hue = Number(/hsl\((\d+)/.exec(profile.avatar.palette[0])?.[1] ?? 240);
  return (
    <div className="mx-auto max-w-screen-2xl px-4 pt-12 sm:px-6 lg:px-10">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <Avatar name={profile.display_name} hue={hue} size={96} />
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-lavender">{profile.is_official ? "Official · Calm Originals" : "Community creator"}</p>
          <h1 className="mt-2 font-serif text-5xl font-semibold">{profile.display_name}</h1>
          <p className="mt-3 max-w-2xl text-mist">{profile.bio}</p>
          <p className="mt-3 text-sm text-mist">
            {followers} followers · {cards.length} series · {totalEpisodes} episodes
          </p>
        </div>
        {viewer.user?.id !== profile.user_id && <FollowButton type="creator" id={profile.user_id} initial={!!following} signedIn={!!viewer.user} label="Follow creator" />}
      </header>
      <h2 className="mt-14 font-serif text-3xl font-semibold">Series</h2>
      <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 [&>article]:w-full">
        {cards.map((c) => (
          <SeriesCard key={c.id} card={c} signedIn={!!viewer.user} />
        ))}
      </div>
      {!cards.length && <p className="mt-4 text-mist">No published series yet.</p>}
    </div>
  );
}

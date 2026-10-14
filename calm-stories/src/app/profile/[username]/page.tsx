import { notFound } from "next/navigation";
import { getViewer } from "@/lib/auth/session";
import { canUseLibrary } from "@/lib/auth/policy";
import { getDb } from "@/lib/db";
import { loadCatalog } from "@/lib/services/catalog";
import { SeriesCard } from "@/components/catalog/SeriesCard";
import { ToggleAction } from "@/components/catalog/ToggleAction";
import { Avatar } from "@/components/ui/Avatar";
import { ReportButton } from "@/components/ui/ReportButton";
import { formatDate } from "@/lib/util";

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const p = await getDb().findOne("creator_profiles", { username });
  return { title: p?.display_name ?? "Profile" };
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const viewer = await getViewer();
  const db = getDb();
  const profile = await db.findOne("creator_profiles", { username });
  if (!profile) {
    // Listeners have no public profile – only creators do.
    const user = await db.findOne("users", { username });
    if (!user || viewer.user?.id !== user.id) notFound();
    return (
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-32 sm:px-8">
        <div className="flex items-center gap-4">
          <Avatar name={user.display_name} hue={user.avatar_hue} size={72} />
          <div>
            <h1 className="headline text-4xl">{user.display_name}</h1>
            <p className="text-mist">Listener profiles are private. Only you can see this page.</p>
          </div>
        </div>
      </div>
    );
  }
  const user = await db.get("users", profile.user_id);
  const idx = await loadCatalog();
  const series = idx.series.filter((s) => s.creator_id === profile.user_id).map((s) => idx.cards.get(s.id)!).filter((c) => c.episode_count > 0);
  const followers = await db.count("creator_follows", { creator_id: profile.user_id });
  const following = viewer.user ? Boolean(await db.findOne("creator_follows", { user_id: viewer.user.id, creator_id: profile.user_id })) : false;
  const totalEpisodes = series.reduce((n, s) => n + s.episode_count, 0);
  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-16 pt-32 sm:px-8">
      <div className="flex flex-wrap items-center gap-6">
        <Avatar name={profile.display_name} hue={user?.avatar_hue ?? 240} size={96} />
        <div className="flex-1">
          <p className="chip mb-2">{profile.is_official ? "Calm Originals · Official" : "Community creator"}</p>
          <h1 className="headline text-5xl">{profile.display_name}</h1>
          <p className="mt-2 max-w-2xl text-mist">{profile.bio}</p>
          <p className="mt-3 text-sm text-mist">
            {series.length} series · {totalEpisodes} episodes · {followers} followers · Creating since {formatDate(profile.created_at)}
          </p>
        </div>
        {viewer.user?.id !== profile.user_id && (
          <ToggleAction endpoint="/api/library/follow-creator" payload={{ creator_id: profile.user_id }} initial={following} onLabel="Following" offLabel="Follow" icon="plus" allowed={canUseLibrary(viewer)} />
        )}
      </div>
      <h2 className="headline mt-14 text-3xl">Series</h2>
      {series.length === 0 ? (
        <p className="mt-3 text-mist">No published series yet.</p>
      ) : (
        <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-x-5 gap-y-8">
          {series.map((c) => (
            <SeriesCard key={c.id} card={c} canSave={canUseLibrary(viewer)} />
          ))}
        </div>
      )}
      {!profile.is_official && (
        <div className="mt-10">
          <ReportButton targetType="creator" targetId={profile.user_id} />
        </div>
      )}
    </div>
  );
}

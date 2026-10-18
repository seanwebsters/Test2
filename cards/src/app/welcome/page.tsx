import { WelcomeFlow } from "./WelcomeFlow";
import { liveUniverses } from "@/lib/catalog";
import { GENRES } from "@/lib/content/types";
import { universeStats } from "@/lib/services/discovery";
import { packUniverse } from "@/lib/view/packs";
import { pageCtx } from "@/lib/view/page";

export const metadata = { title: "Welcome" };

export default async function WelcomePage() {
  const { state, user, at } = await pageCtx();
  const stats = universeStats(state, at);
  const universes = liveUniverses(state, at).map((u) => ({
    ...packUniverse(u),
    tagline: u.tagline,
    premise: u.premise,
    genres: u.genres,
    followers: stats.get(u.id)!.shown.followers,
    following: state.follows.some((f) => f.userId === user.id && f.universeId === u.id),
  }));
  return <WelcomeFlow universes={universes} genres={GENRES.map((g) => ({ id: g.id, label: g.label }))} initialGenres={user.genres} starterClaimed={user.starterClaimed} isGuest={user.isGuest} />;
}

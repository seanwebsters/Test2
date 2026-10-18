import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PackOpener } from "@/components/packs/PackOpener";
import { liveUniverses } from "@/lib/catalog";
import { PACK_TYPES, type PackTypeId } from "@/lib/economy/packs";
import { featuredOfDay } from "@/lib/services/daily";
import { packAvailability, packUniverse } from "@/lib/view/packs";
import { pageCtx } from "@/lib/view/page";

export default async function PackPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ u?: string; episode?: string; token?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  if (!(id in PACK_TYPES)) notFound();
  const type = PACK_TYPES[id as PackTypeId];
  const { state, user, at, idx } = await pageCtx();
  const live = liveUniverses(state, at);
  let universe = sp.u ? live.find((u) => u.slug === sp.u) : undefined;
  const episode = sp.episode ? idx.episodes.get(sp.episode) : undefined;
  if (type.id === "episode") {
    if (!episode) notFound();
    universe = live.find((u) => u.id === episode.universeId);
  }
  if (!universe) {
    const followed = state.follows.find((f) => f.userId === user.id);
    universe = (type.id === "daily" ? featuredOfDay(state, at) : undefined) ?? live.find((u) => u.id === followed?.universeId) ?? live[0];
  }
  if (!universe) notFound();
  const avail = packAvailability(state, user, type.id, at, { episodeId: episode?.id, useToken: sp.token === "1" });
  const name = type.id === "episode" && episode ? `Episode ${episode.number} Pack` : type.name;

  return (
    <div className="relative">
      <Link href={type.id === "episode" && episode ? `/stories/${episode.id}` : "/packs"} className="glass focus-ring absolute left-4 top-4 z-40 flex h-10 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold">
        <ArrowLeft size={16} /> Back
      </Link>
      <PackOpener
        key={`${type.id}:${universe.id}:${episode?.id ?? ""}`}
        header={type.id === "episode" ? undefined : (
          <nav className="no-scrollbar flex max-w-full gap-1.5 overflow-x-auto rounded-full bg-black/40 p-1 backdrop-blur" aria-label="Choose universe">
            {live.map((u) => (
              <Link key={u.id} href={`/packs/${type.id}?u=${u.slug}${sp.token === "1" ? "&token=1" : ""}`} className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold ${u.id === universe!.id ? "bg-bone text-ink" : "text-bone-2 hover:text-bone"}`} aria-current={u.id === universe!.id ? "true" : undefined}>
                {u.title}
              </Link>
            ))}
          </nav>
        )}
        packType={type.id}
        packName={name}
        cardCount={type.slots.length}
        universe={packUniverse(universe)}
        episodeId={episode?.id}
        useToken={avail.useToken}
        blocked={avail.blocked}
        costLabel={avail.costLabel}
      />
    </div>
  );
}

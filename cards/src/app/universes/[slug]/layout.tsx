import Link from "next/link";
import { Package } from "lucide-react";
import { Art } from "@/components/art/Art";
import { fmt } from "@/components/ui/Currency";
import { FollowButton } from "@/components/ui/FollowButton";
import { btn, chip, container } from "@/components/ui/styles";
import { UniverseTabs } from "@/components/universe/UniverseTabs";
import { liveUniverseOr404 } from "@/lib/view/load";
import { pageCtx } from "@/lib/view/page";
import { universeView } from "@/lib/view/universe";

export default async function UniverseLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { state, user, at } = await pageCtx();
  const u = liveUniverseOr404(state, slug, at, user.role === "admin");
  const v = universeView(state, u, user.id, at);
  const pct = v.cards ? Math.round((v.owned / v.cards) * 100) : 0;
  return (
    <div style={{ ["--u-accent" as string]: u.style.palette.accent }}>
      <section className="relative isolate overflow-hidden" style={{ background: u.style.palette.bg }}>
        <div className="nx-animate absolute inset-0 -z-10">
          {v.heroImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={v.heroImageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <Art style={u.style.artStyle} palette={u.style.palette} seed={v.seed} aspect="hero" sceneOnly className="h-full w-full" />
          )}
        </div>
        <div className="absolute inset-0 -z-10" style={{ background: `linear-gradient(90deg, ${u.style.palette.bg}f2 0%, ${u.style.palette.bg}99 45%, transparent 100%), linear-gradient(0deg, ${u.style.palette.bg} 0%, transparent 45%)` }} />
        <div className={`${container} flex min-h-[62vh] flex-col justify-end pb-8 pt-20`}>
          {u.status !== "published" && <p className="mb-3 w-fit rounded-full bg-amber-400 px-3 py-1 text-[11px] font-black uppercase text-ink">Admin preview · {u.status}</p>}
          <p className="flex flex-wrap gap-2">
            {v.genres.map((g) => (
              <Link key={g.id} href={`/discover?genre=${g.id}`} className={chip}>{g.label}</Link>
            ))}
          </p>
          <h1 className={`ff-${u.style.displayFont} mt-4 text-6xl leading-[0.95] sm:text-7xl md:text-[96px]`} style={{ color: u.style.palette.ink }}>{u.title}</h1>
          <p className="mt-4 max-w-2xl text-lg" style={{ color: `${u.style.palette.ink}d9` }}>{u.tagline}</p>
          <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <div><dt className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-white/50">Season</dt><dd className="font-semibold">{v.season.number} · {v.season.title}</dd></div>
            {v.latestEpisode && <div><dt className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-white/50">Latest chapter</dt><dd className="font-semibold"><Link className="hover:underline" href={`/stories/${v.latestEpisode.id}`}>E{v.latestEpisode.number} · {v.latestEpisode.title}</Link></dd></div>}
            <div><dt className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-white/50">Cards</dt><dd className="font-semibold">{v.cards}</dd></div>
            <div><dt className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-white/50">Followers</dt><dd className="font-semibold">{fmt(v.followers)}</dd></div>
            <div className="min-w-[160px]">
              <dt className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-white/50">Your collection</dt>
              <dd className="mt-1 flex items-center gap-2 font-semibold"><span className="h-1.5 w-24 overflow-hidden rounded-full bg-white/15"><span className="block h-full" style={{ width: `${pct}%`, background: u.style.palette.accent }} /></span>{v.owned}/{v.cards}</dd>
            </div>
          </dl>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href={user.starterClaimed ? `/packs/standard?u=${u.slug}` : `/packs/starter?u=${u.slug}`} className={btn("primary", "lg")}><Package size={18} /> {user.starterClaimed ? "Open a pack" : "Open your free starter pack"}</Link>
            <FollowButton universeId={u.id} following={v.following} size="lg" />
          </div>
        </div>
      </section>
      <div className="sticky top-16 z-30 border-b border-white/[0.06] bg-ink/85 backdrop-blur-xl">
        <div className={`${container} py-2.5`}>
          <UniverseTabs slug={u.slug} accent={u.style.palette.accent} />
        </div>
      </div>
      {children}
    </div>
  );
}

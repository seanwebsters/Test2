import Link from "next/link";
import { CareerArt } from "@/components/career/CareerArt";
import { DiscoverBrowser } from "@/components/career/DiscoverBrowser";
import { SectionTitle } from "@/components/ui/primitives";
import { getCareer } from "@/lib/content/careers";
import { rankCareers } from "@/lib/engine/matching";
import { getSession } from "@/lib/server/page";

export const metadata = { title: "Discover careers" };

export default async function DiscoverPage() {
  const s = await getSession();
  const answers = s?.state.profile.onboarding;
  const ranked = answers ? rankCareers(answers) : [];
  const matches = Object.fromEntries(ranked.map((m) => [m.careerSlug, m.percent]));
  const forYou = ranked.slice(0, 8);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="h-display text-3xl">Discover</h1>
        <p className="text-ink-2">Every career is a world to explore. Step inside.</p>
      </div>
      {forYou.length > 0 ? (
        <section>
          <SectionTitle eyebrow="Based on your answers" title="For you" />
          <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 no-scrollbar">
            {forYou.map((m) => {
              const c = getCareer(m.careerSlug)!;
              return (
                <Link key={c.slug} href={`/discover/${c.slug}`} className="relative w-56 shrink-0 snap-start overflow-hidden rounded-4xl shadow-card">
                  <CareerArt slug={c.slug} category={c.category} className="h-64" rounded={false} />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy/90 to-transparent p-4 pt-16 text-white">
                    <div className="font-display text-sm font-extrabold text-mint">{m.percent}% match</div>
                    <div className="h-display text-xl leading-tight">{c.title}</div>
                    <div className="mt-1 line-clamp-2 text-xs text-white/80">{m.reasons[0]?.text}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : (
        <Link href="/onboarding" className="block rounded-4xl bg-gradient-to-r from-mint-soft to-lavender-soft p-5">
          <div className="font-display text-lg font-bold">Get personal matches</div>
          <p className="text-sm text-ink-2">Take the 5-minute discovery and we&apos;ll show your match for every career.</p>
        </Link>
      )}
      <section>
        <SectionTitle eyebrow="The career universe" title="Explore everything" />
        <DiscoverBrowser matches={matches} />
      </section>
    </div>
  );
}

import Link from "next/link";
import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import { Pip } from "@/components/brand/Pip";
import { SectionTitle } from "@/components/ui/primitives";
import { getCareer } from "@/lib/content/careers";
import { addDays } from "@/lib/engine/dates";
import { weeklyRecap } from "@/lib/engine/derive";
import { entitlementsFor } from "@/lib/engine/entitlements";
import { requireSession } from "@/lib/server/page";

export const metadata = { title: "Weekly recap" };

export default async function RecapPage() {
  const s = await requireSession();
  const r = weeklyRecap(s.state, s.today);
  const delta = r.missions - r.lastWeekMissions;
  const insights = entitlementsFor(s.state.profile.plan).advancedInsights;
  const daySet = new Set(s.state.completions.filter((c) => c.day >= r.weekOf).map((c) => c.day));
  const week = Array.from({ length: 7 }, (_, i) => addDays(r.weekOf, i));
  const headline = r.missions === 0 ? "A fresh week, a fresh start." : r.missions >= 10 ? "What a week!" : r.activeDays >= 4 ? "Seriously consistent." : "Every step counts.";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="rounded-5xl bg-gradient-to-br from-lavender-soft via-mint-soft to-sun-soft p-6 text-center">
        <Pip mood={r.missions > 0 ? "proud" : "wave"} size={100} className="mx-auto" />
        <div className="eyebrow mt-2">Week of {new Date(r.weekOf).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}</div>
        <h1 className="h-display text-3xl">{headline}</h1>
        <div className="mt-5 grid grid-cols-3 gap-2">
          {[
            [r.missions, "missions"],
            [r.xp, "XP earned"],
            [`${r.activeDays}/7`, "active days"],
          ].map(([v, l]) => (
            <div key={String(l)} className="rounded-3xl bg-surface/80 p-3">
              <div className="font-display text-2xl font-extrabold">{v}</div>
              <div className="text-[11px] font-bold text-ink-3">{l}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-center gap-1.5" aria-label="Active days this week">
          {week.map((d) => (
            <div key={d} className={`flex h-10 w-10 flex-col items-center justify-center rounded-2xl text-[10px] font-bold ${daySet.has(d) ? "bg-coral text-white" : "bg-surface/70 text-ink-3"}`}>
              {new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "narrow" })}
            </div>
          ))}
        </div>
        {r.lastWeekMissions > 0 && (
          <p className="mt-3 inline-flex items-center gap-1 text-sm font-bold">
            {delta >= 0 ? <TrendingUp size={16} className="text-teal" /> : <TrendingDown size={16} className="text-coral" />}
            {delta >= 0 ? `${delta} more than last week` : `${-delta} fewer than last week — that's okay, life happens`}
          </p>
        )}
      </section>

      {r.highlights.length > 0 && (
        <section className="card p-5">
          <SectionTitle title="Highlights" />
          <ul className="space-y-2">
            {r.highlights.map((h) => (
              <li key={h} className="flex gap-2 text-sm">
                <span>🌟</span> {h}
              </li>
            ))}
            {r.achievements.map((a) => (
              <li key={a} className="flex gap-2 text-sm">
                <span>🏅</span> Earned the {a} badge
              </li>
            ))}
          </ul>
        </section>
      )}

      {r.skillsGained.length > 0 && (
        <section className="card p-5">
          <SectionTitle title="Skills you grew" />
          <div className="flex flex-wrap gap-2">
            {r.skillsGained.map((sk) => (
              <span key={sk.id} className="chip">
                {sk.name} <span className="text-teal">+{sk.points}</span>
              </span>
            ))}
          </div>
          {r.careersExplored.length > 1 && <p className="mt-3 text-sm text-ink-2">You explored {r.careersExplored.map((c) => getCareer(c)?.title).join(", ")} — those skills count across all of them.</p>}
        </section>
      )}

      <section className="card p-5">
        <SectionTitle title="Next week" />
        <ul className="space-y-2">
          {r.nextSteps.map((n) => (
            <li key={n} className="flex gap-2 text-sm">
              <ArrowRight size={16} className="mt-0.5 shrink-0 text-teal" /> {n}
            </li>
          ))}
        </ul>
        <Link href="/missions" className="btn-primary btn-sm mt-4">
          Go to today&apos;s missions
        </Link>
      </section>

      {insights ? (
        <section className="card p-5">
          <SectionTitle eyebrow="Plus insight" title="Your patterns" />
          <p className="text-sm text-ink-2">
            You&apos;ve completed {s.state.completions.length} missions in total, and you tend to rate{" "}
            {(() => {
              const loved = s.state.completions.filter((c) => c.rating === 1).length;
              return loved > s.state.completions.length / 2 ? "most of them highly — you're on a direction that suits you." : "them mixed — consider exploring a related career with the Discovery Challenge.";
            })()}
          </p>
        </section>
      ) : (
        <Link href="/plus" className="block rounded-4xl bg-lavender-soft p-5 text-sm font-semibold">
          ✦ Unlock advanced progress insights with Plus →
        </Link>
      )}
    </div>
  );
}

import Link from "next/link";
import { Check, Lock, Shuffle } from "lucide-react";
import { Pip } from "@/components/brand/Pip";
import { SaveVerdict, StartChallenge, StopChallenge } from "@/components/challenge/ChallengeActions";
import { MissionCard } from "@/components/mission/MissionCard";
import { StartPathButton } from "@/components/path/PathActions";
import { ProgressBar, SectionTitle } from "@/components/ui/primitives";
import { getCareer } from "@/lib/content/careers";
import { CHALLENGE_DAYS, challengeDay, challengeUnlockedDay } from "@/lib/engine/challenge";
import { requireSession } from "@/lib/server/page";
import { cn } from "@/lib/cn";

export const metadata = { title: "30-Day Discovery Challenge" };

export default async function ChallengePage() {
  const s = await requireSession();
  const { state, today } = s;
  const ch = state.profile.challenge;

  if (!ch) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="text-center">
          <Pip mood="curious" size={110} className="mx-auto" />
          <h1 className="h-display mt-3 text-3xl">30-Day Discovery Challenge</h1>
          <p className="mx-auto mt-2 max-w-md text-ink-2">Not ready to choose? Try one small, real activity a day from different careers. By day 30 you&apos;ll know what lights you up — and every mission counts towards that path.</p>
        </div>
        <div className="card p-5">
          <SectionTitle title="Which directions do you want to test?" />
          <StartChallenge options={state.profile.matches.slice(0, 8).map((m) => ({ slug: m.careerSlug, title: getCareer(m.careerSlug)?.title ?? m.careerSlug, percent: m.percent }))} />
        </div>
      </div>
    );
  }

  const unlocked = challengeUnlockedDay(ch, today);
  const doneCount = Object.keys(ch.completed).length;
  const days = Array.from({ length: CHALLENGE_DAYS }, (_, i) => i + 1).map((d) => ({ d, ...challengeDay(ch.careers, d), done: !!ch.completed[String(d)], open: d <= unlocked }));
  const available = days.filter((x) => x.open && !x.done);
  const careerSummary = ch.careers.map((slug) => {
    const comps = state.completions.filter((c) => c.source === "challenge" && c.careerSlug === slug);
    const liked = comps.filter((c) => c.rating === 1).length;
    const disliked = comps.filter((c) => c.rating === -1).length;
    return { slug, title: getCareer(slug)?.title ?? slug, count: comps.length, score: liked - disliked, liked };
  });
  const best = careerSummary.slice().sort((a, b) => b.score - a.score || b.count - a.count)[0];
  const finished = !!ch.finishedAt;
  const active = state.paths.filter((p) => p.status === "active");
  const activeTitles = Object.fromEntries(active.map((p) => [p.careerSlug, getCareer(p.careerSlug)?.title ?? p.careerSlug]));

  return (
    <div className="space-y-6">
      <section className="rounded-5xl bg-gradient-to-br from-navy to-[#2A2F7A] p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="eyebrow !text-mint">30-Day Discovery Challenge</div>
            <h1 className="h-display mt-1 text-3xl">{finished ? "Challenge complete!" : `Day ${Math.min(unlocked, CHALLENGE_DAYS)} of ${CHALLENGE_DAYS}`}</h1>
            <p className="mt-1 text-sm text-white/75">Exploring {ch.careers.map((c) => getCareer(c)?.title).join(" · ")}</p>
          </div>
          <Pip mood={finished ? "proud" : "excited"} size={72} />
        </div>
        <ProgressBar value={doneCount / CHALLENGE_DAYS} tone="sun" className="mt-4 !bg-white/15" label="Challenge progress" />
        <div className="mt-2 text-xs font-bold text-white/70">{doneCount} days completed</div>
      </section>

      {(finished || doneCount >= 7) && best && (
        <section className="card p-5">
          <SectionTitle eyebrow={finished ? "Your verdict" : "So far"} title={best.liked > 0 ? `${best.title} is winning` : "Keep rating your missions"} />
          <div className="space-y-2">
            {careerSummary.map((c) => (
              <div key={c.slug} className="flex items-center justify-between rounded-2xl bg-surface-2 p-3 text-sm">
                <span className="font-bold">{c.title}</span>
                <span className="text-ink-3">
                  {c.count} tried · {c.liked} loved
                </span>
              </div>
            ))}
          </div>
          {finished && best && (
            <div className="mt-4 flex flex-wrap gap-2">
              <StartPathButton careerSlug={best.slug} title={best.title} label={`Commit to ${best.title}`} activeSlugs={active.map((p) => p.careerSlug)} activeTitles={activeTitles} className="btn-primary btn-sm" />
              {!ch.verdict && <SaveVerdict verdict={best.slug} />}
            </div>
          )}
        </section>
      )}

      {!finished && available.length > 0 && (
        <section>
          <SectionTitle eyebrow={available.length > 1 ? "Catch up any time" : "Today"} title="Your challenge missions" />
          <div className="space-y-2.5">
            {available.slice(0, 4).map((x) => (
              <MissionCard key={x.d} mission={x.mission} href={`/missions/${x.mission.id}?from=challenge`} context={`Day ${x.d} · ${getCareer(x.careerSlug)?.title}${x.wildcard ? " · Wildcard" : ""}`} done={state.completions.some((c) => c.missionId === x.mission.id)} />
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-3">Already done a mission on its own path? It still counts there — the challenge picks the next one for you.</p>
        </section>
      )}

      <section>
        <SectionTitle title="Your 30 days" />
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-10">
          {days.map((x) => (
            <div
              key={x.d}
              title={`Day ${x.d}: ${x.mission.title} (${getCareer(x.careerSlug)?.title})`}
              className={cn(
                "relative grid aspect-square place-items-center rounded-2xl font-display text-sm font-bold",
                x.done ? "bg-teal text-white" : x.open ? "bg-sun text-navy" : "bg-surface-3 text-ink-3",
              )}
            >
              {x.done ? <Check size={18} strokeWidth={3} /> : x.open ? x.d : <Lock size={14} />}
              {x.wildcard && <Shuffle size={10} className="absolute right-1 top-1 opacity-70" aria-label="Wildcard" />}
            </div>
          ))}
        </div>
      </section>
      {!finished && (
        <div className="text-center">
          <StopChallenge />
        </div>
      )}
      <Link href="/home" className="btn-ghost w-full">
        Back home
      </Link>
    </div>
  );
}

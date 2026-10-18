import Link from "next/link";
import { Route } from "lucide-react";
import { CareerArt } from "@/components/career/CareerArt";
import { PathMap } from "@/components/path/PathMap";
import { PausePathButton, StartPathButton } from "@/components/path/PathActions";
import { EmptyState, Pill, ProgressBar } from "@/components/ui/primitives";
import { getCareer } from "@/lib/content/careers";
import { requirePath } from "@/lib/content/paths";
import { skillName } from "@/lib/content/skills";
import { pathProgress } from "@/lib/engine/progression";
import { careerReadiness, skillPoints } from "@/lib/engine/skills";
import { requireSession } from "@/lib/server/page";

export const metadata = { title: "My Path" };

export default async function PathPage({ searchParams }: { searchParams: Promise<{ career?: string }> }) {
  const { career: requested } = await searchParams;
  const s = await requireSession();
  const { state, overview: ov } = s;
  const slug = (requested && getCareer(requested) ? requested : null) ?? ov.primary?.careerSlug ?? ov.paths[0]?.careerSlug ?? null;

  if (!slug) {
    return (
      <div className="space-y-6">
        <h1 className="h-display text-3xl">My Path</h1>
        <EmptyState title="Choose your first path" body="Every career becomes a 10-level journey. Pick one of your top directions to begin — you can switch any time without losing progress." />
        <div className="grid gap-3 md:grid-cols-3">
          {state.profile.matches.slice(0, 6).map((m) => {
            const c = getCareer(m.careerSlug)!;
            return (
              <div key={c.slug} className="card overflow-hidden">
                <CareerArt slug={c.slug} category={c.category} className="h-24" rounded={false} />
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-display font-bold">{c.title}</div>
                    <span className="text-sm font-bold text-teal">{m.percent}%</span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <StartPathButton careerSlug={c.slug} title={c.title} label="Start" activeSlugs={[]} activeTitles={{}} className="btn-primary btn-sm flex-1" />
                    <Link href={`/discover/${c.slug}`} className="btn-ghost btn-sm">
                      Explore
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const career = getCareer(slug)!;
  const path = requirePath(slug);
  const up = state.paths.find((p) => p.careerSlug === slug);
  const progress = pathProgress(path, state.completions.filter((c) => c.careerSlug === slug).map((c) => c.missionId), up?.skippedThrough ?? 0);
  const active = state.paths.filter((p) => p.status === "active");
  const activeTitles = Object.fromEntries(active.map((p) => [p.careerSlug, getCareer(p.careerSlug)?.title ?? p.careerSlug]));
  const pts = skillPoints(state.completions, state.profile.onboarding?.skills ?? []);
  const readiness = careerReadiness(career.skills, pts);
  const isActive = up?.status === "active";

  return (
    <div className="space-y-6">
      {ov.paths.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {ov.paths.map((p) => (
            <Link key={p.careerSlug} href={`/path?career=${p.careerSlug}`} className={`chip shrink-0 ${p.careerSlug === slug ? "!border-ink !bg-ink !text-bg" : ""}`}>
              {p.title}
              <span className={`h-2 w-2 rounded-full ${p.status === "active" ? "bg-teal" : "bg-ink-3"}`} aria-label={p.status} />
            </Link>
          ))}
          <Link href="/discover" className="chip shrink-0">
            + Explore more
          </Link>
        </div>
      )}

      <section className="card overflow-hidden">
        <CareerArt slug={slug} category={career.category} className="h-36 md:h-44" rounded={false} />
        <div className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="eyebrow flex items-center gap-1.5">
                <Route size={13} /> Your path {path.kind === "starter" && <Pill className="ml-1">Starter path</Pill>}
              </div>
              <h1 className="h-display text-3xl">{path.title}</h1>
              <p className="text-sm text-ink-2">{career.tagline}</p>
            </div>
            <div className="flex gap-2">
              {isActive ? (
                <PausePathButton careerSlug={slug} />
              ) : (
                <StartPathButton careerSlug={slug} title={career.title} label={up ? "Resume path" : "Start this path"} activeSlugs={active.map((p) => p.careerSlug)} activeTitles={activeTitles} className="btn-primary btn-sm" />
              )}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl bg-surface-2 p-3">
              <div className="font-display text-2xl font-extrabold">{progress.completedLevels}/10</div>
              <div className="text-[11px] font-bold text-ink-3">levels</div>
            </div>
            <div className="rounded-2xl bg-surface-2 p-3">
              <div className="font-display text-2xl font-extrabold text-teal">{progress.percent}%</div>
              <div className="text-[11px] font-bold text-ink-3">complete</div>
            </div>
            <div className="rounded-2xl bg-surface-2 p-3">
              <div className="font-display text-2xl font-extrabold text-lavender">{readiness}%</div>
              <div className="text-[11px] font-bold text-ink-3">skill readiness</div>
            </div>
          </div>
          <ProgressBar value={progress.percent / 100} className="mt-4" label="Path progress" />
          <p className="mt-3 text-xs text-ink-3">
            Key skills: {career.skills.map(skillName).join(" · ")}. Skills from any path count here too.
          </p>
          {!up && <p className="mt-3 rounded-2xl bg-sun-soft p-3 text-sm">You&apos;re previewing this path. Try any level 1 mission without committing, or start the path to unlock everything.</p>}
          {up?.status === "paused" && <p className="mt-3 rounded-2xl bg-surface-2 p-3 text-sm">This path is paused. Your progress is saved — resume whenever you like.</p>}
        </div>
      </section>

      <PathMap
        careerSlug={slug}
        current={progress.currentLevel}
        interactive={true}
        levels={progress.levels.map((l) => ({ level: l.level, status: l.status, done: l.done, questUnlocked: l.questUnlocked, missions: l.missions.map((m) => ({ mission: m.mission, done: m.done, available: m.available && (isActive || l.level.n === 1), lockedReason: m.available && !isActive && l.level.n > 1 ? "Start or resume this path to unlock" : m.lockedReason })) }))}
      />
    </div>
  );
}

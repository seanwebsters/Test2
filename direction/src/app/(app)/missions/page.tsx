import Link from "next/link";
import { BonusButton } from "@/components/home/BonusButton";
import { MissionCard } from "@/components/mission/MissionCard";
import { EmptyState, ProgressBar, SectionTitle } from "@/components/ui/primitives";
import { getCareer } from "@/lib/content/careers";
import { findMission } from "@/lib/content/paths";
import { nextMissions } from "@/lib/engine/progression";
import { getTodayPlan } from "@/lib/server/services";
import { requireSession } from "@/lib/server/page";

export const metadata = { title: "Missions" };

export default async function MissionsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab = "today" } = await searchParams;
  const s = await requireSession();
  const { state, overview: ov } = s;
  const plan = await getTodayPlan(s.viewer, state);
  const done = new Set(state.completions.map((c) => c.missionId));
  const todays = plan.missionIds.map((id) => findMission(id)).filter((x) => !!x);
  const doneToday = todays.filter((r) => done.has(r.mission.id)).length;
  const history = state.completions.slice().sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  const tabs = [
    { id: "today", label: "Today" },
    { id: "next", label: "Up next" },
    { id: "done", label: `Completed (${history.length})` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h-display text-3xl">Missions</h1>
        <p className="text-ink-2">Small, real steps. Personalised every day.</p>
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar" role="tablist">
        {tabs.map((t) => (
          <Link key={t.id} href={`/missions?tab=${t.id}`} role="tab" aria-selected={tab === t.id} className={`chip shrink-0 ${tab === t.id ? "!border-ink !bg-ink !text-bg" : ""}`}>
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "today" && (
        <section>
          <SectionTitle eyebrow={new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} title={`${doneToday} of ${todays.length} done`} />
          <ProgressBar value={todays.length ? doneToday / todays.length : 0} className="mb-4" label="Today's progress" />
          <div className="space-y-2.5">
            {todays.map((r) => (
              <MissionCard key={r.mission.id} mission={r.mission} done={done.has(r.mission.id)} href={`/missions/${r.mission.id}`} context={`${r.path.title} · Level ${r.level.n}`} />
            ))}
          </div>
          {todays.length === 0 && <EmptyState title="No missions yet" body="Choose a path and your daily missions will appear here." action={<Link href="/discover" className="btn-primary btn-sm">Explore careers</Link>} />}
          {todays.length > 0 && doneToday === todays.length && (
            <div className="mt-4">
              <BonusButton />
            </div>
          )}
          <p className="mt-4 text-xs text-ink-3">Your missions adapt to your time ({state.profile.onboarding?.minutesPerDay ?? 15} min a day), the skills you&apos;re building and how missions felt. Change your time in Settings.</p>
        </section>
      )}

      {tab === "next" && (
        <div className="space-y-6">
          {ov.paths.filter((p) => p.status === "active").map((p) => (
            <section key={p.careerSlug}>
              <SectionTitle eyebrow={`Level ${p.progress.currentLevel}`} title={p.title} action={<Link href={`/path?career=${p.careerSlug}`} className="text-sm font-bold text-teal">Map</Link>} />
              <div className="space-y-2.5">
                {nextMissions(p.progress, 6).map((m) => (
                  <MissionCard key={m.id} mission={m} href={`/missions/${m.id}`} />
                ))}
              </div>
            </section>
          ))}
          {ov.paths.every((p) => p.status !== "active") && <EmptyState title="No active path" body="Pick a direction to see what's next." action={<Link href="/path" className="btn-primary btn-sm">Choose a path</Link>} />}
        </div>
      )}

      {tab === "done" && (
        <section className="space-y-2.5">
          {history.length === 0 && <EmptyState title="Nothing yet" body="Your completed missions — and everything you wrote — will be collected here and in your Passport." mood="sleepy" />}
          {history.map((c) => {
            const r = findMission(c.missionId);
            if (!r) return null;
            return (
              <Link key={c.id} href={`/missions/${c.missionId}`} className="card block p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold uppercase tracking-wide text-ink-3">
                      {getCareer(c.careerSlug)?.title} · {new Date(c.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </div>
                    <div className="font-display font-bold">{r.mission.title}</div>
                  </div>
                  <span className="shrink-0 font-display font-bold text-teal">+{c.xp}</span>
                </div>
                {c.evidence && <p className="mt-2 line-clamp-2 text-sm text-ink-2">{c.evidence}</p>}
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
}

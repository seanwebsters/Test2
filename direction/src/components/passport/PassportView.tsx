import { ACHIEVEMENTS } from "@/lib/content/achievements";
import { getCareer } from "@/lib/content/careers";
import { findMission } from "@/lib/content/paths";
import { overview } from "@/lib/engine/derive";
import type { PrivacySettings, UserState } from "@/lib/engine/model";
import { buildTimeline } from "@/lib/engine/timeline";

type Sections = Pick<PrivacySettings, "showDirection" | "showSkills" | "showAchievements" | "showProjects" | "showTimeline">;

/** A clean, shareable passport/portfolio. `show` decides which sections render. */
export function PassportView({ state, today, show, mode }: { state: UserState; today: string; show: Sections; mode: "public" | "portfolio" }) {
  const p = state.profile;
  const ov = overview(state, today);
  const direction = ov.primary ? getCareer(ov.primary.careerSlug) : undefined;
  const projects = state.completions.filter((c) => c.evidence && findMission(c.missionId)?.mission.tags?.some((t) => t === "project" || t === "portfolio"));
  const badges = state.achievements.map((a) => ACHIEVEMENTS.find((x) => x.id === a.achievementId)).filter((a) => !!a);
  const exp = state.passport.filter((i) => mode === "portfolio" || i.isPublic);

  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <header className="rounded-5xl bg-gradient-to-br from-navy via-[#1A2A63] to-[#3B2D8F] p-6 text-white print:bg-none print:p-0 print:text-black">
        <div className="eyebrow !text-mint print:!text-black">{mode === "portfolio" ? "Portfolio" : "Direction Passport"}</div>
        <h1 className="h-display mt-1 text-4xl">{p.displayName}</h1>
        {show.showDirection && direction && (
          <p className="mt-1 text-white/80 print:text-black">
            Building towards a career as {/^[aeiou]/i.test(direction.title) ? "an" : "a"} {direction.title} · {ov.primary!.progress.completedLevels} of 10 levels complete
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
          <span className="rounded-full bg-white/10 px-3 py-1 print:border print:border-black">{state.completions.length} missions completed</span>
          <span className="rounded-full bg-white/10 px-3 py-1 print:border print:border-black">{ov.streak.longest}-day best streak</span>
          {show.showAchievements && <span className="rounded-full bg-white/10 px-3 py-1 print:border print:border-black">{badges.length} badges</span>}
        </div>
      </header>

      {show.showSkills && ov.skills.length > 0 && (
        <section>
          <h2 className="h-display mb-3 text-xl">Skills</h2>
          <div className="flex flex-wrap gap-2">
            {ov.skills.slice(0, 14).map((s) => (
              <span key={s.id} className="chip">
                {s.name} <span className="text-xs text-teal">{s.tierName}</span>
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-3">Skill levels are earned by completing missions with evidence in Direction.</p>
        </section>
      )}

      {show.showProjects && projects.length > 0 && (
        <section>
          <h2 className="h-display mb-3 text-xl">Projects</h2>
          <div className="space-y-3">
            {projects.map((c) => (
              <div key={c.id} className="card break-inside-avoid p-4 print:shadow-none">
                <div className="text-xs font-bold uppercase text-ink-3">
                  {getCareer(c.careerSlug)?.title} · {new Date(c.completedAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
                </div>
                <h3 className="font-display font-bold">{findMission(c.missionId)?.mission.title.replace(/^Quest: /, "")}</h3>
                <p className="mt-1 whitespace-pre-line text-sm text-ink-2">{c.evidence}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {exp.length > 0 && (
        <section>
          <h2 className="h-display mb-3 text-xl">Experience &amp; education</h2>
          <div className="space-y-3">
            {exp.map((i) => (
              <div key={i.id} className="break-inside-avoid">
                <div className="font-display font-bold">
                  {i.title}
                  {i.organisation && <span className="font-sans font-medium text-ink-2"> · {i.organisation}</span>}
                </div>
                {i.startDate && (
                  <div className="text-xs text-ink-3">
                    {i.startDate.slice(0, 7)} – {i.endDate ? i.endDate.slice(0, 7) : "present"}
                  </div>
                )}
                {i.description && <p className="text-sm text-ink-2">{i.description}</p>}
                {i.url && (
                  <a href={i.url} className="text-sm font-semibold text-teal underline" target="_blank" rel="noopener noreferrer nofollow">
                    {i.url}
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {show.showAchievements && badges.length > 0 && (
        <section>
          <h2 className="h-display mb-3 text-xl">Badges</h2>
          <div className="flex flex-wrap gap-2">
            {badges.map((a) => (
              <span key={a.id} className="chip" title={a.description}>
                <span>{a.emoji}</span> {a.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {show.showTimeline && (
        <section>
          <h2 className="h-display mb-3 text-xl">Journey</h2>
          <ol className="space-y-2 text-sm">
            {buildTimeline(state)
              .slice(0, 15)
              .map((e, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-24 shrink-0 text-xs font-bold text-ink-3">{new Date(e.at).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}</span>
                  <span>
                    {e.emoji} {e.title}
                  </span>
                </li>
              ))}
          </ol>
        </section>
      )}
    </article>
  );
}

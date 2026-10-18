import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, GraduationCap, MapPin, MessageCircle, TrendingUp, TriangleAlert } from "lucide-react";
import { CareerArt } from "@/components/career/CareerArt";
import { DeeperLook, RecordView } from "@/components/career/CareerClient";
import { MissionCard } from "@/components/mission/MissionCard";
import { StartPathButton } from "@/components/path/PathActions";
import { Pill, ProgressBar, SectionTitle } from "@/components/ui/primitives";
import { getCategory } from "@/lib/content/categories";
import { CAREERS, getCareer, ROUTE_LABELS } from "@/lib/content/careers";
import { DIRECTORY_OPPORTUNITIES, OPPORTUNITY_TYPE_LABELS } from "@/lib/content/opportunities";
import { requirePath } from "@/lib/content/paths";
import { skillName } from "@/lib/content/skills";
import { rankCareers } from "@/lib/engine/matching";
import { careerReadiness, skillPoints } from "@/lib/engine/skills";
import { getSession } from "@/lib/server/page";

export function generateStaticParams() {
  return CAREERS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = getCareer(slug);
  return c ? { title: c.title, description: `${c.tagline} ${c.summary}` } : {};
}

export default async function CareerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = getCareer(slug);
  if (!c) notFound();
  const s = await getSession();
  const cat = getCategory(c.category);
  const path = requirePath(slug);
  const match = s?.state.profile.onboarding ? rankCareers(s.state.profile.onboarding, {}, [c])[0] : null;
  const up = s?.state.paths.find((p) => p.careerSlug === slug);
  const active = s?.state.paths.filter((p) => p.status === "active") ?? [];
  const activeTitles = Object.fromEntries(active.map((p) => [p.careerSlug, getCareer(p.careerSlug)?.title ?? p.careerSlug]));
  const pts = s ? skillPoints(s.state.completions, s.state.profile.onboarding?.skills ?? []) : new Map<string, number>();
  const readiness = careerReadiness(c.skills, pts);
  const done = new Set(s?.state.completions.map((x) => x.missionId) ?? []);
  const country = s?.state.profile.onboarding?.country ?? "United Kingdom";
  const opps = DIRECTORY_OPPORTUNITIES.filter((o) => o.careers?.includes(slug) || (o.categories !== "all" && o.categories.includes(c.category))).slice(0, 4);
  const firstMissions = path.levels[0]!.missions.filter((m) => !m.quest).slice(0, 3);
  const fmt = (k: number) => (k >= 100 ? `£${k}k+` : `£${k}k`);

  return (
    <div className="space-y-8">
      <RecordView slug={slug} signedIn={!!s} />
      <Link href="/discover" className="inline-flex items-center gap-1 text-sm font-bold text-ink-3 hover:text-ink">
        <ArrowLeft size={16} /> Discover
      </Link>

      <section className="relative -mx-4 overflow-hidden md:mx-0 md:rounded-5xl">
        <CareerArt slug={slug} category={c.category} className="h-72 md:h-96" rounded={false} />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy via-navy/60 to-transparent p-5 pt-24 text-white md:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur">
              {cat.emoji} {cat.name}
            </span>
            {c.pathway === "full" && <span className="rounded-full bg-sun px-3 py-1 text-xs font-extrabold text-navy">Full 10-level path</span>}
          </div>
          <h1 className="h-display mt-3 text-4xl md:text-6xl">{c.title}</h1>
          <p className="mt-1 text-lg text-white/85">{c.tagline}</p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          {match && (
            <div className="card flex items-center gap-4 p-4">
              <div className="font-display text-4xl font-extrabold text-teal">{match.percent}%</div>
              <div className="text-sm">
                <div className="font-bold">Your match</div>
                <div className="text-ink-2">{match.reasons.slice(0, 2).map((r) => r.text).join(" ") || "Based on your discovery answers."}</div>
              </div>
            </div>
          )}

          <section>
            <SectionTitle title="What it actually involves" />
            <p className="text-lg leading-relaxed text-ink-2">{c.summary}</p>
          </section>

          <section>
            <SectionTitle eyebrow="A day in the life" title="Here's a typical day" />
            <ol className="relative space-y-4 border-l-2 border-dashed border-line pl-6">
              {c.dayInLife.map((d) => (
                <li key={d.time} className="relative">
                  <span className="absolute -left-[33px] top-1 h-4 w-4 rounded-full border-4 border-bg bg-teal" aria-hidden="true" />
                  <div className="text-xs font-extrabold text-teal">{d.time}</div>
                  <div className="font-display font-bold">{d.title}</div>
                  <div className="text-sm text-ink-2">{d.detail}</div>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-ink-3">Every role is different — this is an illustrative day.</p>
          </section>

          <section>
            <SectionTitle eyebrow={s ? `${readiness}% ready` : undefined} title="Skills you'll need" />
            <div className="grid gap-2 sm:grid-cols-2">
              {c.skills.map((sk) => {
                const p = pts.get(sk) ?? 0;
                return (
                  <div key={sk} className="card p-3">
                    <div className="flex items-center justify-between text-sm font-bold">
                      {skillName(sk)} <span className="text-xs text-ink-3">{p} pts</span>
                    </div>
                    <ProgressBar value={p / 70} className="mt-2 h-1.5" label={skillName(sk)} />
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <SectionTitle eyebrow="Indicative UK pay" title="What you could earn" />
            <div className="card p-5">
              <div className="grid grid-cols-3 gap-3 text-center">
                {([["Starting", c.salary.entry], ["Experienced", c.salary.mid], ["Senior", c.salary.senior]] as const).map(([l, v], i) => (
                  <div key={l}>
                    <div className="mx-auto mb-2 flex h-24 items-end justify-center">
                      <div className="w-10 rounded-t-xl bg-gradient-to-t from-teal to-mint" style={{ height: `${30 + i * 35}%` }} />
                    </div>
                    <div className="font-display text-xl font-extrabold">{fmt(v)}</div>
                    <div className="text-xs font-bold text-ink-3">{l}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-1.5 text-xs text-ink-3">
                {c.salary.variable && <p className="flex gap-1.5"><TriangleAlert size={14} className="shrink-0 text-coral" /> Often freelance or self-employed: income varies a lot from person to person and year to year.</p>}
                <p className="flex gap-1.5"><MapPin size={14} className="shrink-0" /> London roles typically pay more; other regions often less.{country !== "United Kingdom" && ` We don't have verified pay data for ${country} yet, so these UK figures are a rough reference only.`}</p>
                <p>Indicative ranges for guidance only. Check current figures with the National Careers Service, professional bodies and real job adverts.</p>
              </div>
            </div>
          </section>

          <section>
            <SectionTitle title="Ways in" />
            <div className="grid gap-2 sm:grid-cols-2">
              {c.routes.map((r) => (
                <div key={r} className="card p-4">
                  <div className="font-display font-bold">{ROUTE_LABELS[r].name}</div>
                  <div className="text-sm text-ink-2">{ROUTE_LABELS[r].detail}</div>
                </div>
              ))}
            </div>
            <div className="card mt-3 p-4">
              <div className="mb-2 flex items-center gap-2 font-display font-bold">
                <GraduationCap size={18} /> Qualifications &amp; experience
              </div>
              <ul className="space-y-1.5 text-sm text-ink-2">
                {c.qualifications.map((q) => (
                  <li key={q} className="flex gap-2">
                    <span className="text-teal">•</span> {q}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-ink-3">Requirements change and vary by employer and country — always check with official bodies.</p>
            </div>
          </section>

          <section>
            <SectionTitle title="Career progression" />
            <ol className="flex flex-wrap items-center gap-2">
              {c.progression.map((p, i) => (
                <li key={p} className="flex items-center gap-2">
                  <span className={`rounded-2xl px-3 py-2 text-sm font-bold ${i === c.progression.length - 1 ? "bg-ink text-bg" : "bg-surface-2"}`}>{p}</span>
                  {i < c.progression.length - 1 && <TrendingUp size={16} className="text-ink-3" aria-hidden="true" />}
                </li>
              ))}
            </ol>
          </section>

          <section>
            <SectionTitle title="Real-world challenges" />
            <ul className="space-y-2">
              {c.challenges.map((ch) => (
                <li key={ch} className="card flex gap-3 p-4 text-sm text-ink-2">
                  <TriangleAlert size={18} className="shrink-0 text-coral" /> {ch}
                </li>
              ))}
            </ul>
          </section>

          <DeeperLook slug={slug} title={c.title} />

          <section>
            <SectionTitle eyebrow={`${path.kind === "full" ? "Hand-crafted" : "Starter"} learning pathway`} title="Your 10-level journey" />
            <ol className="grid gap-2 sm:grid-cols-2">
              {path.levels.map((l) => (
                <li key={l.n} className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface font-display font-extrabold">{l.n}</span>
                  <span className="text-sm font-bold">{l.title}</span>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <SectionTitle eyebrow="No commitment" title="Try it today" />
            <div className="space-y-2">
              {firstMissions.map((m) => (
                <MissionCard key={m.id} mission={m} done={done.has(m.id)} href={s ? `/missions/${m.id}` : "/onboarding"} />
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="card space-y-3 p-5">
            {s ? (
              up?.status === "active" ? (
                <Link href={`/path?career=${slug}`} className="btn-primary w-full">
                  Continue your path
                </Link>
              ) : (
                <StartPathButton careerSlug={slug} title={c.title} label={up ? "Resume this path" : "Start this path"} activeSlugs={active.map((p) => p.careerSlug)} activeTitles={activeTitles} className="btn-primary w-full" />
              )
            ) : (
              <Link href="/onboarding" className="btn-primary w-full">
                Find your match
              </Link>
            )}
            <Link href={s ? `/coach?q=${encodeURIComponent(`Tell me what it's really like to be a ${c.title}`)}` : "/onboarding"} className="btn-ghost w-full">
              <MessageCircle size={16} /> Ask Pip about it
            </Link>
          </div>
          {opps.length > 0 && (
            <div className="card p-5">
              <h3 className="font-display font-bold">Where to look</h3>
              <ul className="mt-2 space-y-2">
                {opps.map((o) => (
                  <li key={o.id}>
                    <a href={o.url} target="_blank" rel="noopener noreferrer" className="block rounded-2xl bg-surface-2 p-3 text-sm hover:bg-surface-3">
                      <div className="font-bold">{o.organisation}</div>
                      <div className="text-xs text-ink-3">{OPPORTUNITY_TYPE_LABELS[o.type]}</div>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="card p-5">
            <h3 className="font-display font-bold">Related careers</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {c.related.map((r) => (
                <Link key={r} href={`/discover/${r}`} className="chip">
                  {getCareer(r)?.title}
                </Link>
              ))}
            </div>
            <p className="mt-3 text-xs text-ink-3">Skills you build here transfer to all of these.</p>
          </div>
          <Pill tone="surface" className="!rounded-2xl !p-3 !text-[11px] !font-medium">
            Content is reviewed editorially. AI-generated sections never include salaries, qualifications or vacancies.
          </Pill>
        </aside>
      </div>
    </div>
  );
}

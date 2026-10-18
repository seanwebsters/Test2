import "server-only";
import { getCareer } from "@/lib/content/careers";
import { ALL_STATIC_OPPORTUNITIES, OPPORTUNITY_TYPE_LABELS, type Opportunity, type OpportunityType } from "@/lib/content/opportunities";
import { skillName } from "@/lib/content/skills";
import type { UserState } from "@/lib/engine/model";
import { env } from "./env";

export interface OpportunityFilters {
  type?: OpportunityType | null;
  careerSlug?: string | null;
  remoteOnly?: boolean;
  q?: string | null;
}

export interface RankedOpportunity {
  opportunity: Opportunity;
  score: number;
  reasons: string[];
}

/** A pluggable source of opportunities (verified directories, sample data, external APIs). */
export interface OpportunitySourceAdapter {
  id: string;
  label: string;
  fetch(ctx: { state: UserState; filters: OpportunityFilters }): Promise<Opportunity[]>;
}

export const staticSource: OpportunitySourceAdapter = {
  id: "static",
  label: "Verified directories & sample listings",
  async fetch() {
    return ALL_STATIC_OPPORTUNITIES;
  },
};

/** Live entry-level jobs from Adzuna when ADZUNA_APP_ID / ADZUNA_APP_KEY are set (UK). */
export const adzunaSource: OpportunitySourceAdapter = {
  id: "adzuna",
  label: "Adzuna live jobs",
  async fetch({ state, filters }) {
    if (!env.adzunaAppId || !env.adzunaAppKey) return [];
    const country = state.profile.onboarding?.country ?? "United Kingdom";
    if (country !== "United Kingdom") return [];
    const slug = filters.careerSlug ?? state.paths.find((p) => p.status === "active")?.careerSlug ?? state.profile.matches[0]?.careerSlug;
    const career = slug ? getCareer(slug) : undefined;
    if (!career) return [];
    const params = new URLSearchParams({
      app_id: env.adzunaAppId,
      app_key: env.adzunaAppKey,
      results_per_page: "10",
      what: `junior ${career.title}`,
      "content-type": "application/json",
    });
    const city = state.profile.onboarding?.city;
    if (city) params.set("where", city);
    try {
      const res = await fetch(`https://api.adzuna.com/v1/api/jobs/gb/search/1?${params}`, { signal: AbortSignal.timeout(5000), next: { revalidate: 3600 } });
      if (!res.ok) return [];
      const data = (await res.json()) as { results?: { id: string; title: string; description?: string; redirect_url: string; company?: { display_name?: string }; location?: { display_name?: string } }[] };
      return (data.results ?? []).map((r) => ({
        id: `adzuna-${r.id}`,
        type: "job" as const,
        title: r.title.replace(/<[^>]+>/g, ""),
        organisation: r.company?.display_name ?? "Employer",
        summary: (r.description ?? "").replace(/<[^>]+>/g, "").slice(0, 220),
        url: r.redirect_url,
        location: r.location?.display_name ?? "UK",
        remote: /remote/i.test(r.title + (r.description ?? "")),
        countries: ["United Kingdom"],
        categories: [career.category],
        careers: [career.slug],
        skills: career.skills,
        stages: [],
        source: "api" as const,
      }));
    } catch {
      return [];
    }
  },
};

export const SOURCES: OpportunitySourceAdapter[] = [staticSource, adzunaSource];

export function scoreOpportunity(o: Opportunity, state: UserState): RankedOpportunity {
  const a = state.profile.onboarding;
  const reasons: string[] = [];
  let score = 0;
  const activeSlugs = state.paths.filter((p) => p.status === "active").map((p) => p.careerSlug);
  const matchSlugs = state.profile.matches.slice(0, 5).map((m) => m.careerSlug);
  const directionCats = new Set([...activeSlugs, ...matchSlugs].map((s) => getCareer(s)?.category).filter(Boolean));

  const careerHit = o.careers?.find((c) => activeSlugs.includes(c)) ?? o.careers?.find((c) => matchSlugs.includes(c));
  if (careerHit) {
    score += activeSlugs.includes(careerHit) ? 5 : 3;
    reasons.push(`Relevant to your ${getCareer(careerHit)?.title} direction`);
  } else if (o.categories !== "all" && o.categories.some((c) => directionCats.has(c))) {
    score += 2;
    reasons.push("In an industry you're exploring");
  } else if (o.categories === "all") {
    score += 1;
  }
  if (a && o.stages.length && o.stages.includes(a.status)) {
    score += 2;
    reasons.push("Suits where you are right now");
  } else if (a && o.stages.length && !o.stages.includes(a.status)) {
    score -= 1.5;
  }
  if (a && o.countries.includes(a.country)) score += 1;
  else if (a && !o.remote) score -= 3;
  if (o.remote) reasons.push("Available online");
  else if (a?.city && o.location.toLowerCase().includes(a.city.toLowerCase())) {
    score += 2;
    reasons.push(`Near you in ${a.city}`);
  }
  const userSkills = new Set([...(a?.skills ?? []), ...state.completions.flatMap((c) => c.skillPoints.map((s) => s.id))]);
  const sharedSkill = o.skills.find((s) => userSkills.has(s));
  if (sharedSkill) {
    score += 1;
    reasons.push(`Uses your ${skillName(sharedSkill).toLowerCase()} skills`);
  }
  if (o.source === "directory") score += 0.5;
  if (o.source === "sample") score -= 0.5;
  return { opportunity: o, score, reasons: reasons.slice(0, 3) };
}

export async function recommendOpportunities(state: UserState, filters: OpportunityFilters = {}): Promise<RankedOpportunity[]> {
  const lists = await Promise.all(SOURCES.map((s) => s.fetch({ state, filters }).catch(() => [])));
  const all = lists.flat();
  const q = filters.q?.toLowerCase().trim();
  return all
    .filter((o) => !filters.type || o.type === filters.type)
    .filter((o) => !filters.remoteOnly || o.remote)
    .filter((o) => !filters.careerSlug || o.careers?.includes(filters.careerSlug) || (o.categories !== "all" && o.categories.includes(getCareer(filters.careerSlug)?.category ?? "creative")) || o.categories === "all")
    .filter((o) => !q || `${o.title} ${o.organisation} ${o.summary} ${OPPORTUNITY_TYPE_LABELS[o.type]}`.toLowerCase().includes(q))
    .map((o) => scoreOpportunity(o, state))
    .sort((a, b) => b.score - a.score);
}

export function findStaticOpportunity(id: string): Opportunity | undefined {
  return ALL_STATIC_OPPORTUNITIES.find((o) => o.id === id);
}

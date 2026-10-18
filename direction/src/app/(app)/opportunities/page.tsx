import Link from "next/link";
import { Search } from "lucide-react";
import { OpportunityCard } from "@/components/opportunities/OpportunityCard";
import { EmptyState, SectionTitle } from "@/components/ui/primitives";
import { OPPORTUNITY_TYPE_LABELS, type OpportunityType } from "@/lib/content/opportunities";
import { findStaticOpportunity, recommendOpportunities, scoreOpportunity } from "@/lib/server/opportunities";
import { requireSession } from "@/lib/server/page";

export const metadata = { title: "Opportunities" };

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<{ tab?: string; type?: string; q?: string; remote?: string }> }) {
  const sp = await searchParams;
  const tab = sp.tab === "tracker" ? "tracker" : "foryou";
  const s = await requireSession();
  const type = sp.type && sp.type in OPPORTUNITY_TYPE_LABELS ? (sp.type as OpportunityType) : null;
  const items = await recommendOpportunities(s.state, { type, q: sp.q, remoteOnly: sp.remote === "1" });
  const statusById = new Map(s.state.bookmarks.map((b) => [b.opportunityId, b]));
  const tracked = s.state.bookmarks
    .map((b) => {
      const o = findStaticOpportunity(b.opportunityId) ?? b.snapshot;
      return o ? { b, ranked: scoreOpportunity(o, s.state) } : null;
    })
    .filter((x) => !!x)
    .sort((a, b) => b.b.updatedAt.localeCompare(a.b.updatedAt));
  const qs = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams();
    const merged = { tab, type, q: sp.q ?? null, remote: sp.remote ?? null, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `/opportunities?${p}`;
  };
  const counts = { applied: tracked.filter((t) => t.b.status !== "saved" && t.b.status !== "closed").length, secured: tracked.filter((t) => t.b.status === "secured").length };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h-display text-3xl">Opportunities</h1>
        <p className="text-ink-2">Real places to find jobs, apprenticeships, events and more — matched to your direction.</p>
      </div>
      <div className="flex gap-2">
        <Link href={qs({ tab: "foryou" })} className={`chip ${tab === "foryou" ? "!border-ink !bg-ink !text-bg" : ""}`}>
          For you
        </Link>
        <Link href={qs({ tab: "tracker" })} className={`chip ${tab === "tracker" ? "!border-ink !bg-ink !text-bg" : ""}`}>
          My tracker ({tracked.length})
        </Link>
      </div>

      {tab === "foryou" ? (
        <>
          <form action="/opportunities" className="relative">
            <input type="hidden" name="tab" value="foryou" />
            {type && <input type="hidden" name="type" value={type} />}
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" />
            <input name="q" defaultValue={sp.q ?? ""} className="input pl-11" placeholder="Search opportunities…" aria-label="Search opportunities" />
          </form>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 no-scrollbar">
            <Link href={qs({ type: null })} className={`chip shrink-0 ${!type ? "!border-teal !bg-teal !text-white" : ""}`}>
              All
            </Link>
            {(Object.keys(OPPORTUNITY_TYPE_LABELS) as OpportunityType[]).map((t) => (
              <Link key={t} href={qs({ type: t })} className={`chip shrink-0 ${type === t ? "!border-teal !bg-teal !text-white" : ""}`}>
                {OPPORTUNITY_TYPE_LABELS[t]}
              </Link>
            ))}
          </div>
          <Link href={qs({ remote: sp.remote === "1" ? null : "1" })} className="inline-flex items-center gap-2 text-sm font-bold text-ink-2">
            <span className={`h-5 w-9 rounded-full p-0.5 transition ${sp.remote === "1" ? "bg-teal" : "bg-surface-3"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white transition ${sp.remote === "1" ? "translate-x-4" : ""}`} />
            </span>
            Online only
          </Link>
          <div className="rounded-3xl bg-surface-2 p-4 text-xs text-ink-2">
            <strong>How we source opportunities:</strong> <em>Verified sources</em> are established organisations and official services — tap through to search their live listings. <em>Samples</em> are clearly marked demo examples, never real vacancies. Live listings appear when a jobs feed is connected.
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {items.map((r) => (
              <OpportunityCard key={r.opportunity.id} o={r.opportunity} reasons={r.reasons} status={statusById.get(r.opportunity.id)?.status ?? null} notes={statusById.get(r.opportunity.id)?.notes} />
            ))}
          </div>
          {items.length === 0 && <EmptyState title="Nothing matches those filters" body="Try a different type or clear your search." action={<Link href="/opportunities" className="btn-ghost btn-sm">Clear filters</Link>} />}
        </>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="card p-3">
              <div className="font-display text-2xl font-extrabold">{tracked.length}</div>
              <div className="text-[11px] font-bold text-ink-3">tracked</div>
            </div>
            <div className="card p-3">
              <div className="font-display text-2xl font-extrabold text-teal">{counts.applied}</div>
              <div className="text-[11px] font-bold text-ink-3">in progress</div>
            </div>
            <div className="card p-3">
              <div className="font-display text-2xl font-extrabold text-coral">{counts.secured}</div>
              <div className="text-[11px] font-bold text-ink-3">secured</div>
            </div>
          </div>
          <SectionTitle title="Your pipeline" />
          <div className="grid gap-3 md:grid-cols-2">
            {tracked.map((t) => (
              <OpportunityCard key={t.b.opportunityId} o={t.ranked.opportunity} reasons={[]} status={t.b.status} notes={t.b.notes} />
            ))}
          </div>
          {tracked.length === 0 && <EmptyState title="Your tracker is empty" body="Save opportunities to keep track of deadlines and applications in one place." action={<Link href="/opportunities" className="btn-primary btn-sm">Browse opportunities</Link>} />}
        </>
      )}
    </div>
  );
}

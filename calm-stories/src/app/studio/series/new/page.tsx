import { isStaff } from "@/app/admin/staff";
import { providerStatus } from "@/lib/studio/providers";
import { BriefForm } from "./BriefForm";
import { getDb } from "@/lib/db";
import { AdminAction } from "@/components/admin/AdminAction";
import type { Proposals } from "@/lib/studio/schemas";
import { relativeTime } from "@/lib/util";

export const metadata = { title: "New series" };

export default async function NewSeriesPage() {
  if (!(await isStaff())) return null;
  const writing = providerStatus().find((p) => p.key === "ANTHROPIC_API_KEY")!;
  const latest = (await getDb().list("deliverables", { where: { key: "program_proposals", status: "current" }, orderBy: { column: "created_at", ascending: false }, limit: 1 }))[0];
  const proposals = latest?.data as Proposals | undefined;
  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-[11px] uppercase tracking-[0.35em] text-lavender">Network Executive</p>
      <h1 className="font-serif text-5xl text-white">Brief the team</h1>
      <p className="mt-2 text-mist">
        Describe the series you want. The Program Director researches the genre, the Creative Director develops three original concepts, the Story Critic picks the strongest, and the team builds the bible, cast, world, season plan and cinematic artwork. Then it comes back to you for a greenlight. Nothing is produced or published without your approval.
      </p>
      {!writing.connected && <p className="mt-4 rounded-2xl border border-amber-300/30 bg-amber-300/[0.06] p-3 text-sm text-amber-100">ANTHROPIC_API_KEY isn&rsquo;t connected yet. You can submit the brief now; the Program Director will raise a hand until the key is added, then carry on when you press Resume.</p>}
      <BriefForm proposals={proposals?.proposals.map((p) => ({ title: p.title, brief: p.brief })) ?? []} />
      <section className="mt-12 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-serif text-2xl text-white">Program Director&rsquo;s proposals</h2>
          <AdminAction endpoint="/api/studio/proposals" label={proposals ? "Ask again" : "Ask for proposals"} pendingLabel="Asking…" className="btn-ghost btn-sm ml-auto" />
        </div>
        <p className="text-sm text-mist">Ideas grounded in real listening data and catalogue gaps.</p>
        {proposals ? (
          <>
            <p className="mt-3 text-sm text-white/85">{proposals.summary} <span className="text-xs text-mist">({relativeTime(latest!.created_at)})</span></p>
            <ul className="mt-3 space-y-3">
              {proposals.proposals.map((p, i) => (
                <li key={i} className="rounded-2xl bg-white/[0.03] p-3 text-sm">
                  <div className="font-serif text-xl text-white">{p.title}</div>
                  <p className="text-white/85">{p.brief}</p>
                  <p className="mt-1 text-xs text-mist">{p.rationale} · Evidence: {p.audience_evidence}</p>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-3 text-sm text-mist">No proposals yet.</p>
        )}
      </section>
    </div>
  );
}

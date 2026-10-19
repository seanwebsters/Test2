import Link from "next/link";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { env } from "@/lib/env";
import { ACCESS_COOKIE, readAccess } from "@/lib/auth/studio-access";
import { getTeamState } from "@/lib/studio/team";
import { pipelineStages } from "@/lib/studio/pipeline-view";
import { TeamRoom } from "@/components/studio/TeamRoom";
import { PipelineStrip } from "@/components/studio/PipelineStrip";
import { isStaff } from "@/app/admin/staff";

export const metadata = { title: "AI Team" };

export default async function TeamPage() {
  if (!(await isStaff())) return null;
  const db = getDb();
  const team = await getTeamState();
  const working = team.filter((a) => ["typing", "reading", "thinking", "handing_off"].includes(a.activity)).length;
  const waiting = team.filter((a) => a.activity === "asking_for_help").length;
  const run = (await db.list("workflow_runs", { where: { status: ["running", "awaiting_approval", "blocked", "paused"] }, orderBy: { column: "updated_at", ascending: false }, limit: 1 }))[0];
  const steps = run ? await db.list("workflow_steps", { where: { run_id: run.id } }) : [];
  // Team (view-only) logins just watch; the owner also gets the office and animation controls.
  const role = readAccess((await cookies()).get(ACCESS_COOKIE)?.value);
  const canEdit = !env.studioLocked || role === "owner";
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-5xl text-white">AI Team</h1>
        <span className="rounded-full border border-white/15 px-3 py-1 text-sm text-mist">{working} working</span>
        {waiting > 0 && <span className="rounded-full border border-amber-300/40 px-3 py-1 text-sm text-amber-200">✉️ {waiting} email{waiting === 1 ? "" : "s"} for you</span>}
        <Link href="/studio/pipeline" className="ml-auto rounded-xl border border-lavender/40 px-4 py-2 font-serif text-white hover:bg-lavender/10">View workflow →</Link>
      </header>
      <p className="max-w-3xl text-sm text-mist">The studio, live. Everyone sits at their own desk and works on real steps of the pipeline. Click anyone to see what they&apos;re doing.</p>
      <TeamRoom initial={team} canEdit={canEdit} />
      {run && (
        <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-serif text-3xl text-white">Production pipeline</h2>
            <Link href={`/studio/pipeline?run=${run.id}`} className="text-sm text-lavender">{run.title}</Link>
          </div>
          <PipelineStrip stages={pipelineStages(run.kind, steps, run.status)} />
        </section>
      )}
    </div>
  );
}

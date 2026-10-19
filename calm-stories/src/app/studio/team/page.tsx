import Link from "next/link";
import { getDb } from "@/lib/db";
import { getTeamState } from "@/lib/studio/team";
import { pipelineStages } from "@/lib/studio/pipeline-view";
import { TeamRoom } from "@/components/studio/TeamRoom";
import { PipelineStrip } from "@/components/studio/PipelineStrip";
import { isStaff } from "@/app/admin/staff";
import { AgentAvatar } from "@/components/studio/AgentAvatar";
import { AdminAction } from "@/components/admin/AdminAction";
import { avatarClips, getAvatar } from "@/lib/studio/avatars";
import { AGENT_BY_KEY } from "@/lib/studio/agents";
import type { AgentActivity } from "@/lib/studio/types";

const LEGEND: [AgentActivity, string, string][] = [
  ["sleeping", "Resting", "No task"],
  ["thinking", "Planning", "Outlines, plans, briefs"],
  ["typing", "Writing", "Generating a deliverable"],
  ["reading", "Reviewing", "Critiques and checks"],
  ["handing_off", "Handing off", "Work passed to the next agent"],
  ["celebrating", "Done", "Task just completed"],
  ["asking_for_help", "Needs you", "Blocked or awaiting approval"],
];

export const metadata = { title: "AI Team" };

export default async function TeamPage() {
  if (!(await isStaff())) return null;
  const db = getDb();
  const team = await getTeamState();
  const working = team.filter((a) => ["typing", "reading", "thinking", "handing_off"].includes(a.activity)).length;
  const waiting = team.filter((a) => a.activity === "asking_for_help").length;
  const run = (await db.list("workflow_runs", { where: { status: ["running", "awaiting_approval", "blocked", "paused"] }, orderBy: { column: "updated_at", ascending: false }, limit: 1 }))[0];
  const steps = run ? await db.list("workflow_steps", { where: { run_id: run.id } }) : [];
  const clips = await avatarClips();
  const test = await getAvatar("lead_writer");
  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center gap-4">
        <h1 className="font-serif text-5xl text-white">AI Team</h1>
        <span className="rounded-full border border-white/15 px-3 py-1 text-sm text-mist">{working} agent{working === 1 ? "" : "s"} working</span>
        {waiting > 0 && <Link href="/studio/approvals" className="rounded-full border border-amber-300/40 px-3 py-1 text-sm text-amber-200">{waiting} need{waiting === 1 ? "s" : ""} you</Link>}
        <Link href="/studio/pipeline" className="ml-auto rounded-xl border border-lavender/40 px-4 py-2 font-serif text-white hover:bg-lavender/10">View workflow →</Link>
      </header>
      <p className="max-w-3xl text-sm text-mist">
        Every pose reflects a real workflow step: resting when idle, reading while reviewing, typing while generating, a thought bubble while planning, a letter when handing work on, a little celebration when a task finishes, and a raised hand when they need you. Click anyone to see their current task, reasoning, outputs and history.
      </p>
      <section className="rounded-3xl border border-lavender/30 bg-lavender/[0.05] p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-serif text-2xl text-white">Animated agents (test)</h2>
            <p className="text-sm text-mist">
              Films the Lead Writer as a photoreal person in four poses (resting, working, thinking, needs you) with Nano Banana and Kling on fal – about $0.90, takes ~5–10 minutes. Refresh to see progress.
            </p>
            {test && (
              <p className={test.status === "failed" ? "mt-1 text-sm text-rose-300" : "mt-1 text-sm text-lavender"}>
                {test.status === "ready" ? "Ready – the Lead Writer below is now filmed." : test.status === "failed" ? `Failed: ${test.error}` : `Working… ${test.step} (${Object.keys(test.clips).length}/4 clips)`}
              </p>
            )}
          </div>
          <AdminAction endpoint="/api/studio/avatars" body={{ agent: "lead_writer" }} label={test ? "Make it again" : "Make test avatar"} pendingLabel="Starting…" className="btn-primary btn-sm" />
        </div>
      </section>
      <TeamRoom initial={team} clips={clips} />
      <section aria-labelledby="legend-h">
        <h2 id="legend-h" className="label">What the poses mean</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
          {LEGEND.map(([a, label, hint]) => (
            <li key={a} className="overflow-hidden rounded-2xl border border-white/10 bg-[#0c1226]">
              <AgentAvatar agent={AGENT_BY_KEY.lead_writer} activity={a} clips={clips.lead_writer} className="block w-full" />
              <div className="px-2.5 py-2 text-center">
                <div className="font-serif text-[15px] text-white">{label}</div>
                <div className="text-[11px] text-mist">{hint}</div>
              </div>
            </li>
          ))}
        </ul>
      </section>
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

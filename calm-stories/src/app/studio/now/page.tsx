import Link from "next/link";
import { isStaff } from "@/app/admin/staff";
import { studioBoard, type BoardItem, type Lane } from "@/lib/studio/now";
import { cx, formatCents, relativeTime } from "@/lib/util";
import { AutoRefresh } from "./AutoRefresh";
import { AdminAction } from "@/components/admin/AdminAction";
import { AskStudio } from "@/components/studio/AskStudio";

export const metadata = { title: "Now" };
export const dynamic = "force-dynamic";

const LANES: { lane: Lane; title: string; hint: string; tone: string }[] = [
  { lane: "working", title: "Being worked on", hint: "An agent is on it right now", tone: "border-lavender/40" },
  { lane: "needs_you", title: "Waiting for you", hint: "Greenlight or approve", tone: "border-amber-300/50" },
  { lane: "stuck", title: "Stuck", hint: "Stopped – the reason is shown", tone: "border-rose-400/50" },
  { lane: "queued", title: "Queued", hint: "Will start when a slot frees up", tone: "border-white/15" },
  { lane: "paused", title: "Paused", hint: "Resume when you want it", tone: "border-white/15" },
  { lane: "done", title: "Finished (last 24h)", hint: "", tone: "border-emerald-300/30" },
];

function Card({ item }: { item: BoardItem }) {
  const pct = item.progress.total ? Math.round((item.progress.done / item.progress.total) * 100) : 0;
  return (
    <li className="rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06]">
      <Link href={`/studio/pipeline?run=${item.runId}`} className="block p-3">
        <div className="text-[11px] uppercase tracking-wider text-mist">{item.kind === "episode_production" ? "Episode" : "New series"}</div>
        <div className="font-serif text-lg leading-tight text-white">{item.title.replace(/^New series: /, "")}</div>
        <div className="mt-1 text-sm text-white/90">{item.headline}</div>
        {item.diagnosis ? (
          <div className="mt-2 rounded-xl bg-rose-500/10 p-2 text-xs">
            <div className="font-semibold text-rose-100">{item.diagnosis.title}</div>
            <div className="text-rose-100/90">{item.diagnosis.explain}</div>
            {item.diagnosis.youFirst && <div className="mt-1 text-amber-200">First: {item.diagnosis.youFirst}</div>}
          </div>
        ) : (
          item.reason && <div className="mt-1 break-words text-xs text-rose-200/90">{item.reason.slice(0, 220)}</div>
        )}
        <div className="mt-2 h-1 rounded-full bg-white/10"><div className="h-full rounded-full bg-lavender" style={{ width: `${pct}%` }} /></div>
        <div className="mt-1 flex justify-between text-[11px] text-mist">
          <span>{item.progress.done}/{item.progress.total} steps · {formatCents(item.costCents)} of {formatCents(item.budgetCents)}</span>
          <span>{relativeTime(item.updatedAt)}</span>
        </div>
      </Link>
      {item.diagnosis && (
        <div className="px-3 pb-3">
          <AdminAction endpoint="/api/studio/quickfix" body={{ run_id: item.runId }} label={`Quick fix: ${item.diagnosis.fixLabel}`} pendingLabel="Fixing…" className="btn-primary btn-sm w-full" />
        </div>
      )}
    </li>
  );
}

export default async function NowPage() {
  if (!(await isStaff())) return null;
  const board = await studioBoard();
  return (
    <div className="space-y-6">
      <AutoRefresh />
      <header>
        <h1 className="font-serif text-5xl text-white">Now</h1>
        <p className="text-sm text-mist">Every series and episode in one place, sorted by what&rsquo;s happening. Updates every few seconds; click any card for the full detail.</p>
      </header>
      <AskStudio />
      <ul className="flex flex-wrap gap-2 text-sm">
        {LANES.map((l) => (
          <li key={l.lane} className={cx("rounded-full border px-3 py-1 text-white", l.tone)}>{l.title}: <b>{board[l.lane].length}</b></li>
        ))}
      </ul>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {LANES.filter((l) => l.lane !== "done" || board.done.length).map((l) => (
          <section key={l.lane} className={cx("rounded-3xl border p-4", l.tone)}>
            <h2 className="font-serif text-2xl text-white">{l.title} <span className="text-mist">({board[l.lane].length})</span></h2>
            {l.hint && <p className="text-xs text-mist">{l.hint}</p>}
            {l.lane === "stuck" && board.stuck.length > 1 && (
              <div className="mt-2"><AdminAction endpoint="/api/studio/quickfix" body={{ all: true }} label={`Quick fix all ${board.stuck.length}`} pendingLabel="Fixing…" className="btn-ghost btn-sm" /></div>
            )}
            {board[l.lane].length ? <ul className="mt-3 space-y-2">{board[l.lane].map((i) => <Card key={i.runId} item={i} />)}</ul> : <p className="mt-3 text-sm text-mist">Nothing here.</p>}
          </section>
        ))}
      </div>
    </div>
  );
}

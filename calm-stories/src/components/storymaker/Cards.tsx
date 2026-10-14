"use client";

import { useState } from "react";
import { CheckIcon } from "@/components/icons";
import type { AssistantCard, ConceptProposal, ContinuityReport, DirectionProposal } from "@/lib/types";
import { cx } from "@/lib/util";
import { useWorkspace } from "./WorkspaceContext";

const input = "w-full rounded-xl border border-white/10 bg-night-2 px-3 py-2 text-sm focus:border-lavender/60 focus:outline-none";

export function CardView({ card }: { card: AssistantCard }) {
  switch (card.type) {
    case "concept":
      return <ConceptCard proposal={card.proposal} />;
    case "direction":
      return <DirectionCard proposal={card.proposal} />;
    case "continuity":
      return <ContinuityCard report={card.report} />;
    case "sleep_check":
      return <SleepCard score={card.score} notes={card.notes} />;
    case "confirmation":
      return <ConfirmationCard callId={card.tool_call_id} reason={card.reason} summary={card.summary} />;
    case "tool_result":
      return (
        <p className="flex items-start gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-mist">
          <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-lavender" />
          <span className="whitespace-pre-wrap">{card.summary}</span>
        </p>
      );
    case "error":
      return (
        <p role="alert" className="rounded-2xl border border-rose-300/30 bg-rose-300/10 px-3 py-2 text-sm text-rose-100">
          {card.message}
        </p>
      );
    default:
      return null;
  }
}

function ConceptCard({ proposal }: { proposal: ConceptProposal }) {
  const { act, snapshot, busy } = useWorkspace();
  const [p, setP] = useState(proposal);
  const [created, setCreated] = useState(false);
  const locked = created || !!snapshot;
  return (
    <div className="card-surface space-y-3 p-4">
      <p className="text-xs uppercase tracking-wider text-lavender">Series concept</p>
      <label className="block">
        <span className="sr-only">Title</span>
        <input disabled={locked} value={p.title} onChange={(e) => setP({ ...p, title: e.target.value })} className={cx(input, "font-serif text-xl font-semibold")} />
      </label>
      <label className="block">
        <span className="text-xs text-mist">Tagline</span>
        <input disabled={locked} value={p.tagline} onChange={(e) => setP({ ...p, tagline: e.target.value })} className={input} />
      </label>
      <label className="block">
        <span className="text-xs text-mist">Synopsis</span>
        <textarea disabled={locked} rows={4} value={p.synopsis} onChange={(e) => setP({ ...p, synopsis: e.target.value })} className={input} />
      </label>
      <p className="text-xs text-mist">
        {p.genre} · {p.tags.join(", ")}
      </p>
      <div>
        <p className="text-xs text-mist">Story arc</p>
        <p className="text-sm">{p.narrative_arc}</p>
      </div>
      {p.characters.length > 0 && (
        <ul className="space-y-1 text-sm">
          {p.characters.map((c) => (
            <li key={c.name}>
              <span className="font-semibold">{c.name}</span> <span className="text-mist">({c.role})</span>: {c.sketch}
            </li>
          ))}
        </ul>
      )}
      {p.follow_up_questions.length > 0 && (
        <div className="rounded-2xl bg-white/[0.04] p-3 text-sm">
          <p className="text-xs text-mist">Worth deciding</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {p.follow_up_questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </div>
      )}
      {!locked ? (
        <button
          disabled={!!busy || !p.title.trim()}
          onClick={async () => {
            const { original_idea, follow_up_questions: _q, ...rest } = p;
            const r = await act("create_series", { ...rest, original_idea });
            if (r.ok) setCreated(true);
          }}
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-night disabled:opacity-50"
        >
          Create this series
        </button>
      ) : (
        <p className="text-xs text-mist">{created ? "Created as a private draft." : "Saved in this workspace."}</p>
      )}
    </div>
  );
}

function DirectionCard({ proposal }: { proposal: DirectionProposal }) {
  const { act, busy } = useWorkspace();
  const [p, setP] = useState(proposal);
  const [state, setState] = useState<"open" | "editing" | "accepted" | "rejected">("open");
  return (
    <div className="card-surface space-y-3 p-4">
      <p className="text-xs uppercase tracking-wider text-lavender">Continue this story</p>
      {state === "editing" ? (
        <>
          <input value={p.episode_title} onChange={(e) => setP({ ...p, episode_title: e.target.value })} className={cx(input, "font-serif text-lg")} aria-label="Episode title" />
          <textarea rows={3} value={p.summary} onChange={(e) => setP({ ...p, summary: e.target.value })} className={input} aria-label="Summary" />
          <textarea rows={5} value={p.beats.join("\n")} onChange={(e) => setP({ ...p, beats: e.target.value.split("\n").filter((b) => b.trim()) })} className={input} aria-label="Beats, one per line" />
        </>
      ) : (
        <>
          <p className="font-serif text-xl font-semibold">{p.episode_title}</p>
          <p className="text-sm">{p.summary}</p>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-mist">
            {p.beats.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ol>
          {p.threads_advanced.length > 0 && <p className="text-xs text-mist">Advances: {p.threads_advanced.join("; ")}</p>}
        </>
      )}
      {state === "accepted" ? (
        <p className="text-xs text-lavender">Added as a planned episode.</p>
      ) : state === "rejected" ? (
        <p className="text-xs text-mist">Set aside. Nothing was changed.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            disabled={!!busy}
            onClick={async () => {
              const r = await act("accept_direction", p);
              if (r.ok) setState("accepted");
            }}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-night disabled:opacity-50"
          >
            {state === "editing" ? "Accept changes" : "Accept"}
          </button>
          {state !== "editing" && (
            <button onClick={() => setState("editing")} className="rounded-full border border-white/15 px-4 py-2 text-sm">
              Modify
            </button>
          )}
          <button onClick={() => setState("rejected")} className="rounded-full px-4 py-2 text-sm text-mist hover:text-white">
            Reject
          </button>
        </div>
      )}
    </div>
  );
}

export function ContinuityCard({ report }: { report: ContinuityReport }) {
  const tone = { conflict: "border-rose-300/40 bg-rose-300/10", warn: "border-amber-300/30 bg-amber-300/10", info: "border-white/10 bg-white/[0.03]" } as const;
  return (
    <div className="card-surface space-y-2 p-4">
      <p className="text-xs uppercase tracking-wider text-lavender">Continuity check{report.simulated ? " · rule-based" : ""}</p>
      <p className="text-sm">{report.summary}</p>
      <ul className="space-y-2">
        {report.issues.map((i, n) => (
          <li key={n} className={cx("rounded-xl border px-3 py-2 text-sm", tone[i.severity])}>
            <span className="mr-2 text-[10px] uppercase tracking-wider text-mist">{i.severity}</span>
            {i.message}
            {i.evidence && <span className="mt-1 block text-xs italic text-mist">{i.evidence}</span>}
          </li>
        ))}
      </ul>
      <p className="text-xs text-mist">Flags only. Nothing in the story has been changed.</p>
    </div>
  );
}

export function SleepCard({ score, notes }: { score: number; notes: string[] }) {
  return (
    <div className="card-surface space-y-2 p-4">
      <p className="text-xs uppercase tracking-wider text-lavender">Sleep suitability</p>
      <div className="flex items-center gap-3">
        <span className="font-serif text-3xl font-semibold">{score}</span>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10" role="meter" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100} aria-label="Sleep suitability score">
          <div className={cx("h-full rounded-full", score >= 75 ? "bg-emerald-300" : score >= 55 ? "bg-amber-300" : "bg-rose-300")} style={{ width: `${score}%` }} />
        </div>
      </div>
      <ul className="list-disc space-y-1 pl-5 text-sm text-mist">
        {notes.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
    </div>
  );
}

function ConfirmationCard({ callId, reason, summary }: { callId: string; reason: string; summary: string }) {
  const { resolve, conversation, busy } = useWorkspace();
  const resolved = conversation?.messages.filter((m) => m.tool_call_ids?.includes(callId)).length ?? 0;
  const done = resolved > 1;
  return (
    <div className="rounded-2xl border border-lavender/40 bg-lavender/10 p-4">
      <p className="text-xs uppercase tracking-wider text-lavender">Needs your confirmation · {summary}</p>
      <p className="mt-2 text-sm">{reason}</p>
      {done ? (
        <p className="mt-3 text-xs text-mist">Resolved.</p>
      ) : (
        <div className="mt-3 flex gap-2">
          <button disabled={!!busy} onClick={() => resolve(callId, "confirm")} className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-night disabled:opacity-50">
            Confirm
          </button>
          <button disabled={!!busy} onClick={() => resolve(callId, "cancel")} className="rounded-full px-4 py-1.5 text-sm text-mist hover:text-white">
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import type { ReviewCheck } from "@/lib/types";
import { cx, formatDateTime, formatDuration, relativeTime } from "@/lib/util";
import { Btn, Empty, Field, inputCls } from "@/components/storymaker/ui";
import { useAdminAction } from "./useAdminAction";

export interface ReviewItem {
  id: string;
  episodeId: string;
  episodeTitle: string;
  episodeNumber: number;
  summary: string;
  seriesTitle: string;
  official: boolean;
  source: "creator" | "production_engine";
  submittedBy: string;
  submittedAt: string;
  requestedReleaseAt: string | null;
  notes: string;
  checks: ReviewCheck[];
  script: { content: string; words: number; version: number; simulated: boolean; provider: string | null; model: string | null } | null;
  audio: { id: string; duration: number; simulated: boolean; qaPassed: boolean | null } | null;
  rights: { original: boolean; aiAssisted: boolean; thirdParty: string } | null;
}

const CHECK_LABELS: Record<ReviewCheck["name"], string> = {
  content_safety: "Content safety",
  rights: "Rights",
  sleep_suitability: "Sleep suitability",
  continuity: "Continuity",
  audio_quality: "Audio quality",
  metadata: "Metadata",
  ai_disclosure: "AI disclosure",
};

const CHECK_TONE: Record<ReviewCheck["status"], string> = {
  pass: "text-emerald-200",
  warn: "text-amber-200",
  fail: "text-rose-200",
  not_run: "text-mist",
};

/** Converts an ISO time to the value a datetime-local input expects (viewer's local time). */
export function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ReviewQueue({ items }: { items: ReviewItem[] }) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);
  if (!items.length) return <Empty>The review queue is clear.</Empty>;
  return (
    <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
      <ul className="space-y-2" aria-label="Pending reviews">
        {items.map((i) => (
          <li key={i.id}>
            <button
              onClick={() => setOpenId(i.id)}
              aria-current={openId === i.id}
              className={cx("w-full rounded-2xl border p-3 text-left text-sm transition-colors", openId === i.id ? "border-lavender/60 bg-white/5" : "border-white/10 hover:border-white/25")}
            >
              <span className="block font-medium">{i.episodeTitle}</span>
              <span className="block text-xs text-mist">{i.seriesTitle} · Ep {i.episodeNumber}</span>
              <span className="mt-1 block text-[11px] text-mist">
                {i.source === "production_engine" ? "Production engine" : `Creator: ${i.submittedBy}`} · {relativeTime(i.submittedAt)}
              </span>
              {i.checks.some((c) => c.status === "fail") && <span className="mt-1 block text-[11px] text-rose-200">Has failing checks</span>}
            </button>
          </li>
        ))}
      </ul>
      {items.filter((i) => i.id === openId).map((i) => <ReviewDetail key={i.id} item={i} />)}
    </div>
  );
}

function ReviewDetail({ item }: { item: ReviewItem }) {
  const { call, pending, message } = useAdminAction();
  const [notes, setNotes] = useState("");
  const [release, setRelease] = useState("");
  useEffect(() => setRelease(toLocalInput(item.requestedReleaseAt)), [item.requestedReleaseAt]); // local time: browser only
  const [showScript, setShowScript] = useState(false);
  const decide = (decision: "approved" | "changes_requested" | "rejected") =>
    call(`/api/admin/reviews/${item.id}`, "POST", { decision, notes, releaseAt: release ? new Date(release).toISOString() : null }, decision === "approved" ? "Approved." : "Sent back to the creator.");
  const needsNote = !notes.trim();

  return (
    <article className="card-surface space-y-6 p-5" aria-labelledby={`rev-${item.id}`}>
      <header>
        <p className="text-xs text-mist">{item.official ? "Calm Original" : "Community series"} · {item.seriesTitle} · Episode {item.episodeNumber}</p>
        <h2 id={`rev-${item.id}`} className="font-serif text-3xl font-semibold">{item.episodeTitle}</h2>
        <p className="mt-1 text-sm text-mist">{item.summary}</p>
        {item.notes && <p className="mt-2 text-xs text-mist">Submission note: {item.notes}</p>}
      </header>

      <section>
        <h3 className="mb-2 text-sm font-semibold">Automated checks</h3>
        <ul className="grid gap-2 sm:grid-cols-2">
          {item.checks.map((c) => (
            <li key={c.name} className="rounded-xl bg-white/5 p-3 text-sm">
              <span className="flex justify-between gap-2">
                <span>{CHECK_LABELS[c.name]}</span>
                <span className={cx("text-xs capitalize", CHECK_TONE[c.status])}>{c.status.replace("_", " ")}</span>
              </span>
              <span className="mt-1 block text-xs text-mist">{c.detail}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold">Audio</h3>
          {item.audio ? (
            <>
              <audio controls preload="none" src={`/api/audio/asset/${item.audio.id}`} className="w-full" aria-label={`Mix of ${item.episodeTitle}`} />
              <p className="mt-1 text-xs text-mist">
                {formatDuration(item.audio.duration)}
                {item.audio.simulated && " · simulated narrator (placeholder audio)"}
                {item.audio.qaPassed !== null && ` · QA ${item.audio.qaPassed ? "passed" : "failed"}`}
              </p>
            </>
          ) : (
            <p className="text-sm text-rose-200">No mixed audio. This episode can’t be released until it has audio.</p>
          )}
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold">Rights</h3>
          {item.rights ? (
            <ul className="text-xs text-mist">
              <li>{item.rights.original ? "Declared original work" : "Not declared original"}</li>
              <li>{item.rights.aiAssisted ? "AI-assisted (disclosed to listeners)" : "Not AI-assisted"}</li>
              <li>Third-party material: {item.rights.thirdParty || "none declared"}</li>
            </ul>
          ) : (
            <p className="text-sm text-rose-200">No rights declaration.</p>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Script</h3>
          {item.script && <Btn variant="ghost" onClick={() => setShowScript((s) => !s)} aria-expanded={showScript}>{showScript ? "Hide script" : "Read script"}</Btn>}
        </div>
        {item.script ? (
          <>
            <p className="text-xs text-mist">
              Version {item.script.version} · {item.script.words.toLocaleString()} words ·{" "}
              {item.script.simulated ? "simulated writer (placeholder text)" : `${item.script.provider ?? "human"}${item.script.model ? ` · ${item.script.model}` : ""}`}
            </p>
            {showScript && <div className="mt-3 max-h-[28rem] overflow-y-auto whitespace-pre-wrap rounded-2xl bg-night-2 p-4 font-serif text-lg leading-relaxed">{item.script.content}</div>}
          </>
        ) : (
          <p className="text-sm text-rose-200">No script.</p>
        )}
      </section>

      <section className="space-y-3 border-t border-white/10 pt-5">
        <Field label="Release time (your local time)" hint="Approved episodes go live at this time. Leave empty to schedule later from the calendar.">
          <input type="datetime-local" value={release} onChange={(e) => setRelease(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Notes to the creator" hint="Required when requesting changes or rejecting.">
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Btn variant="primary" disabled={pending || !item.audio} onClick={() => decide("approved")}>Approve</Btn>
          <Btn variant="outline" disabled={pending || needsNote} onClick={() => decide("changes_requested")}>Request changes</Btn>
          <Btn variant="danger" disabled={pending || needsNote} onClick={() => decide("rejected")}>Reject</Btn>
        </div>
        {item.requestedReleaseAt && <p className="text-xs text-mist">Requested release: {formatDateTime(item.requestedReleaseAt)}</p>}
        {message && <p role="status" className="text-sm text-lavender">{message}</p>}
      </section>
    </article>
  );
}

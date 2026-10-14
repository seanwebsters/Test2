"use client";

import Link from "next/link";
import { useState } from "react";
import { relativeTime } from "@/lib/util";
import { Btn, Empty, StatusPill, inputCls } from "@/components/storymaker/ui";
import { ConfirmModal } from "./ConfirmModal";
import { useAdminAction } from "./useAdminAction";

export interface ReportRow {
  id: string;
  targetType: "series" | "episode" | "creator";
  label: string;
  link: string | null;
  seriesId: string | null;
  seriesStatus: string | null;
  official: boolean;
  reason: string;
  details: string;
  reporter: string;
  status: "open" | "actioned" | "dismissed";
  resolution: string | null;
  createdAt: string;
}

const REASONS: Record<string, string> = {
  copyright: "Copyright",
  inappropriate: "Inappropriate",
  not_sleep_friendly: "Not sleep-friendly",
  impersonation: "Impersonation",
  other: "Other",
};

export function ModerationQueue({ rows }: { rows: ReportRow[] }) {
  const [filter, setFilter] = useState<"open" | "resolved">("open");
  const shown = rows.filter((r) => (filter === "open" ? r.status === "open" : r.status !== "open"));
  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Report status" className="flex gap-2">
        {(["open", "resolved"] as const).map((f) => (
          <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)} className={`rounded-full px-4 py-1.5 text-sm capitalize ${filter === f ? "bg-white text-night" : "border border-white/15 text-mist"}`}>
            {f} ({rows.filter((r) => (f === "open" ? r.status === "open" : r.status !== "open")).length})
          </button>
        ))}
      </div>
      {shown.length ? <ul className="space-y-3">{shown.map((r) => <Report key={r.id} r={r} />)}</ul> : <Empty>{filter === "open" ? "No open reports." : "No resolved reports yet."}</Empty>}
    </div>
  );
}

function Report({ r }: { r: ReportRow }) {
  const { call, pending, message } = useAdminAction();
  const [note, setNote] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);
  const resolve = (action: "actioned" | "dismissed", resolution = note) => call(`/api/admin/reports/${r.id}`, "POST", { action, resolution }, action === "dismissed" ? "Dismissed." : "Marked as actioned.");
  return (
    <li className="card-surface space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px]">{REASONS[r.reason] ?? r.reason}</span>
        <span className="text-xs capitalize text-mist">{r.targetType}</span>
        {r.link ? <Link href={r.link} className="font-medium hover:text-lavender">{r.label}</Link> : <span className="font-medium">{r.label}</span>}
        {r.official && <span className="text-[11px] text-lavender">Calm Original</span>}
        <span className="ml-auto"><StatusPill status={r.status} /></span>
      </div>
      {r.details && <p className="text-sm">“{r.details}”</p>}
      <p className="text-xs text-mist">Reported by {r.reporter} · {relativeTime(r.createdAt)}{r.seriesStatus && ` · series is ${r.seriesStatus.replace(/_/g, " ")}`}</p>
      {r.status === "open" ? (
        <>
          <label className="block">
            <span className="sr-only">Resolution note</span>
            <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What was done, or why no action is needed" className={inputCls} />
          </label>
          <div className="flex flex-wrap gap-2">
            <Btn variant="outline" disabled={pending || !note.trim()} onClick={() => resolve("actioned")}>Mark actioned</Btn>
            <Btn variant="ghost" disabled={pending || !note.trim()} onClick={() => resolve("dismissed")}>Dismiss</Btn>
            {r.seriesId && r.seriesStatus !== "removed" && (
              <Btn variant="danger" disabled={pending || !note.trim()} onClick={() => setConfirmRemove(true)}>Remove series</Btn>
            )}
          </div>
        </>
      ) : (
        r.resolution && <p className="text-xs text-mist">Resolution: {r.resolution}</p>
      )}
      {message && <p role="status" className="text-sm text-lavender">{message}</p>}
      <ConfirmModal
        open={confirmRemove}
        title="Remove this series?"
        body="It will be hidden from every listener and its creator will be notified with your note. You can restore it later from the overview."
        confirmLabel="Remove series"
        busy={pending}
        onCancel={() => setConfirmRemove(false)}
        onConfirm={async () => {
          const ok = await call(`/api/admin/series/${r.seriesId}`, "PATCH", { status: "removed", reason: note });
          if (ok) await resolve("actioned", `Series removed. ${note}`);
          setConfirmRemove(false);
        }}
      />
    </li>
  );
}

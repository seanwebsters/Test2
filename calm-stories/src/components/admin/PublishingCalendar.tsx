"use client";

import { useMemo, useState } from "react";
import type { Episode } from "@/lib/types";
import { cx, formatDateTime } from "@/lib/util";
import { Btn, Field, StatusPill, inputCls, useMounted } from "@/components/storymaker/ui";
import { ConfirmModal } from "./ConfirmModal";
import { toLocalInput } from "./ReviewQueue";
import { useAdminAction } from "./useAdminAction";

export interface CalendarEpisode {
  id: string;
  title: string;
  number: number;
  series: string;
  official: boolean;
  status: Episode["status"];
  releaseAt: string | null;
  hasAudio: boolean;
}

const DAYS = 28;
const DEFAULT_HOUR = 20;

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Moves an ISO time to another day, keeping its local time of day (or the default evening slot). */
function onDay(day: Date, existing: string | null): string {
  const t = existing ? new Date(existing) : null;
  const d = new Date(day);
  d.setHours(t ? t.getHours() : DEFAULT_HOUR, t ? t.getMinutes() : 0, 0, 0);
  return d.toISOString();
}

export function PublishingCalendar({ episodes }: { episodes: CalendarEpisode[] }) {
  const { call, pending, message } = useAdminAction();
  const [selected, setSelected] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const mounted = useMounted();

  const days = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // Monday of this week
    return Array.from({ length: DAYS }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, []);
  const today = dayKey(new Date());
  const byDay = useMemo(() => {
    const m = new Map<string, CalendarEpisode[]>();
    for (const e of episodes) {
      if (!e.releaseAt) continue;
      const k = dayKey(new Date(e.releaseAt));
      m.set(k, [...(m.get(k) ?? []), e].sort((a, b) => a.releaseAt!.localeCompare(b.releaseAt!)));
    }
    return m;
  }, [episodes]);
  const tray = episodes.filter((e) => !e.releaseAt && e.status !== "published");
  const sel = episodes.find((e) => e.id === selected) ?? null;

  const schedule = (id: string, releaseAt: string) => call("/api/admin/schedule", "POST", { episodeId: id, action: "schedule", releaseAt }, "Release time saved.");
  const drop = (day: Date) => {
    const ep = episodes.find((e) => e.id === dragging);
    setDragging(null);
    setOver(null);
    if (!ep || ep.status === "published") return;
    void schedule(ep.id, onDay(day, ep.releaseAt));
  };

  const chip = (e: CalendarEpisode) => (
    <button
      key={e.id}
      draggable={e.status !== "published"}
      onDragStart={(ev) => {
        ev.dataTransfer.setData("text/plain", e.id);
        ev.dataTransfer.effectAllowed = "move";
        setDragging(e.id);
      }}
      onDragEnd={() => setDragging(null)}
      onClick={() => setSelected(e.id)}
      aria-pressed={selected === e.id}
      aria-label={`${e.series}: ${e.title}, ${e.status.replace(/_/g, " ")}${e.releaseAt ? `, ${formatDateTime(e.releaseAt)}` : ", unscheduled"}`}
      className={cx(
        "block w-full truncate rounded-lg px-2 py-1 text-left text-[11px] leading-tight",
        e.status === "published" ? "bg-emerald-300/15 text-emerald-100" : e.status === "approved" ? "bg-lavender/25 text-white" : "bg-amber-300/15 text-amber-100",
        e.status !== "published" && "cursor-grab",
        selected === e.id && "ring-2 ring-white/70",
        dragging === e.id && "opacity-50",
      )}
    >
      {e.releaseAt && <span className="mr-1 opacity-70">{new Date(e.releaseAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
      {e.title}
    </button>
  );

  // The grid is laid out in the viewer's own time zone, so it renders in the browser only.
  if (!mounted) return <div className="h-96 animate-pulse rounded-3xl bg-white/5" aria-busy="true" aria-label="Loading calendar" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 text-xs text-mist" aria-hidden>
        <span><span className="mr-1 inline-block size-2 rounded-full bg-lavender" />Approved</span>
        <span><span className="mr-1 inline-block size-2 rounded-full bg-amber-300" />In review</span>
        <span><span className="mr-1 inline-block size-2 rounded-full bg-emerald-300" />Published</span>
      </div>

      <div className="overflow-x-auto">
        <div role="grid" aria-label="Next four weeks" className="grid min-w-[44rem] grid-cols-7 gap-1.5">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} role="columnheader" className="px-1 text-xs text-mist">{d}</div>
          ))}
          {days.map((d) => {
            const k = dayKey(d);
            const past = d.getTime() < new Date().setHours(0, 0, 0, 0);
            return (
              <div
                key={k}
                role="gridcell"
                aria-label={d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
                onDragOver={(ev) => {
                  if (past || !dragging) return;
                  ev.preventDefault();
                  setOver(k);
                }}
                onDragLeave={() => setOver((o) => (o === k ? null : o))}
                onDrop={(ev) => {
                  ev.preventDefault();
                  if (!past) drop(d);
                }}
                className={cx("min-h-28 space-y-1 rounded-xl border p-1.5", k === today ? "border-lavender/50" : "border-white/10", past && "opacity-50", over === k && "bg-lavender/10")}
              >
                <div className="text-right text-[11px] text-mist">{d.getDate() === 1 || d === days[0] ? d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : d.getDate()}</div>
                {(byDay.get(k) ?? []).map(chip)}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section
          aria-labelledby="tray-title"
          onDragOver={(ev) => dragging && ev.preventDefault()}
          onDrop={(ev) => {
            ev.preventDefault();
            const id = dragging;
            setDragging(null);
            if (id && episodes.find((e) => e.id === id)?.releaseAt) void call("/api/admin/schedule", "POST", { episodeId: id, action: "unschedule" }, "Moved to unscheduled.");
          }}
          className="card-surface p-4"
        >
          <h2 id="tray-title" className="font-serif text-xl font-semibold">Unscheduled</h2>
          <p className="text-xs text-mist">Approved or in-review episodes without a release time. Drop an episode here to clear its slot.</p>
          <div className="mt-3 space-y-1.5">
            {tray.map(chip)}
            {!tray.length && <p className="text-sm text-mist">Nothing waiting.</p>}
          </div>
        </section>

        <section aria-labelledby="sel-title" className="card-surface p-4">
          <h2 id="sel-title" className="font-serif text-xl font-semibold">{sel ? sel.title : "Select an episode"}</h2>
          {sel ? <EpisodeControls key={sel.id} ep={sel} pending={pending} onSchedule={schedule} onUnschedule={() => call("/api/admin/schedule", "POST", { episodeId: sel.id, action: "unschedule" }, "Unscheduled.")} onPublish={() => setConfirmPublish(true)} /> : <p className="text-sm text-mist">Choose an episode to move it with the keyboard, clear its slot or publish it now.</p>}
          {message && <p role="status" className="mt-3 text-sm text-lavender">{message}</p>}
        </section>
      </div>

      <ConfirmModal
        open={confirmPublish && !!sel}
        title="Publish now?"
        body={sel ? `“${sel.title}” will be released to all listeners immediately and followers will be notified. This can’t be undone from here.` : ""}
        confirmLabel="Publish now"
        busy={pending}
        onCancel={() => setConfirmPublish(false)}
        onConfirm={async () => {
          if (sel) await call("/api/admin/schedule", "POST", { episodeId: sel.id, action: "publish_now" }, "Published.");
          setConfirmPublish(false);
        }}
      />
    </div>
  );
}

function EpisodeControls({ ep, pending, onSchedule, onUnschedule, onPublish }: { ep: CalendarEpisode; pending: boolean; onSchedule: (id: string, at: string) => void; onUnschedule: () => void; onPublish: () => void }) {
  const [at, setAt] = useState(toLocalInput(ep.releaseAt));
  if (ep.status === "published") {
    return <p className="mt-2 text-sm text-mist">Published {ep.releaseAt ? formatDateTime(ep.releaseAt) : ""}. {ep.series}, episode {ep.number}.</p>;
  }
  return (
    <div className="mt-2 space-y-3">
      <p className="flex flex-wrap items-center gap-2 text-sm text-mist">
        {ep.official ? "Calm Original" : "Community"} · {ep.series} · Ep {ep.number} <StatusPill status={ep.status} />
      </p>
      {!ep.hasAudio && <p className="text-xs text-rose-200">No audio yet: it will not release until it has a mix.</p>}
      <Field label="Release time (your local time)">
        <input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} className={inputCls} />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Btn variant="outline" disabled={pending || !at} onClick={() => onSchedule(ep.id, new Date(at).toISOString())}>{ep.releaseAt ? "Move" : "Schedule"}</Btn>
        {ep.releaseAt && <Btn variant="ghost" disabled={pending} onClick={onUnschedule}>Unschedule</Btn>}
        <Btn variant="primary" disabled={pending || ep.status !== "approved" || !ep.hasAudio} onClick={onPublish} title={ep.status !== "approved" ? "Only approved episodes can be published" : undefined}>Publish now</Btn>
      </div>
    </div>
  );
}

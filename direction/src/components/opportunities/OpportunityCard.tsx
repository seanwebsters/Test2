"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bookmark, BookmarkCheck, ExternalLink, MapPin, ShieldCheck, FlaskConical, Radio } from "lucide-react";
import { useCelebrate } from "@/components/app/Celebrate";
import { api } from "@/lib/client";
import { cn } from "@/lib/cn";
import { OPPORTUNITY_TYPE_LABELS, type Opportunity } from "@/lib/content/opportunities";
import type { BookmarkStatus } from "@/lib/engine/model";

const STATUSES: { id: BookmarkStatus; label: string }[] = [
  { id: "saved", label: "Saved" },
  { id: "applied", label: "Applied" },
  { id: "interviewing", label: "Interviewing" },
  { id: "secured", label: "Secured 🎉" },
  { id: "closed", label: "Closed" },
];

export function SourceBadge({ source }: { source: Opportunity["source"] }) {
  if (source === "directory")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-teal-soft px-2 py-0.5 text-[11px] font-bold text-teal-deep dark:text-teal">
        <ShieldCheck size={12} /> Verified source
      </span>
    );
  if (source === "api")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-lavender-soft px-2 py-0.5 text-[11px] font-bold text-[#5B47C9] dark:text-lavender">
        <Radio size={12} /> Live listing
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-sun-soft px-2 py-0.5 text-[11px] font-bold text-[#9A6A00] dark:text-sun">
      <FlaskConical size={12} /> Sample · not a real listing
    </span>
  );
}

export function OpportunityCard({ o, reasons, status, notes }: { o: Opportunity; reasons: string[]; status: BookmarkStatus | null; notes?: string }) {
  const router = useRouter();
  const { toast, celebrate } = useCelebrate();
  const [busy, setBusy] = useState(false);
  const [noteText, setNoteText] = useState(notes ?? "");
  const [showNotes, setShowNotes] = useState(false);

  const save = async (s: BookmarkStatus, n = noteText) => {
    setBusy(true);
    try {
      const r = await api<{ newAchievements: { id: string; name: string; emoji: string; xp: number }[] }>("/api/bookmarks", { body: { opportunityId: o.id, status: s, notes: n, snapshot: o.source === "api" ? o : undefined } });
      if (r.newAchievements.length) celebrate({ kind: "achievement", title: s === "secured" ? "Your first break!" : "Brave move!", subtitle: s === "secured" ? "Huge. Pip is doing a little dance." : "Every application is practice.", achievements: r.newAchievements });
      else toast(s === "saved" ? "Saved to your tracker" : `Marked as ${s}`);
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    setBusy(true);
    try {
      await api(`/api/bookmarks/${encodeURIComponent(o.id)}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wide text-ink-3">{OPPORTUNITY_TYPE_LABELS[o.type]}</span>
            <SourceBadge source={o.source} />
          </div>
          <h3 className="mt-1 font-display text-lg font-bold leading-snug">{o.title}</h3>
          <div className="text-sm font-semibold text-ink-2">{o.organisation}</div>
        </div>
        <button onClick={() => (status ? remove() : save("saved"))} disabled={busy} className="focus-ring rounded-full p-2 text-ink-3 hover:bg-surface-2" aria-label={status ? "Remove from tracker" : "Save"} aria-pressed={!!status}>
          {status ? <BookmarkCheck size={22} className="text-teal" /> : <Bookmark size={22} />}
        </button>
      </div>
      <p className="mt-2 text-sm text-ink-2">{o.summary}</p>
      <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-ink-3">
        <MapPin size={13} /> {o.location}
        {o.remote && " · Online"}
      </div>
      {reasons.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {reasons.map((r) => (
            <li key={r} className="rounded-full bg-mint-soft px-2.5 py-1 text-[11px] font-bold text-teal-deep dark:text-mint">
              ✦ {r}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {o.url ? (
          <a href={o.url} target="_blank" rel="noopener noreferrer" className="btn-primary btn-sm">
            {o.source === "directory" ? "Search live listings" : "View & apply"} <ExternalLink size={14} />
          </a>
        ) : (
          <span className="text-xs font-semibold text-ink-3">Demo example — use it to practise tracking applications.</span>
        )}
        {status && (
          <select value={status} onChange={(e) => save(e.target.value as BookmarkStatus)} disabled={busy} className="rounded-xl border-2 border-line bg-surface px-2 py-1.5 text-sm font-bold" aria-label="Application status">
            {STATUSES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        )}
        {status && (
          <button className="text-xs font-bold text-ink-3 underline" onClick={() => setShowNotes((v) => !v)}>
            {showNotes ? "Hide notes" : notes ? "Notes" : "Add notes"}
          </button>
        )}
      </div>
      {status && showNotes && (
        <div className="mt-3">
          <textarea className={cn("input min-h-[80px] text-sm")} value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Deadlines, contacts, what you sent…" maxLength={2000} />
          <button className="btn-ghost btn-sm mt-2" disabled={busy} onClick={() => save(status, noteText)}>
            Save notes
          </button>
        </div>
      )}
    </article>
  );
}

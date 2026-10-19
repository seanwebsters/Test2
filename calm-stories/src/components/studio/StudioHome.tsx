"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AGENTS } from "@/lib/studio/agents";
import type { AgentState } from "@/lib/studio/team";
import { SimsOffice, type ReviewItem } from "./SimsOffice";
import { AgentDrawer } from "./AgentDrawer";
import { AgentFace } from "./AgentFace";
import { cx } from "@/lib/util";

export type InboxCard = { id: string; kind: "approval" | "question"; title: string; sub: string; cover: string | null; since: string; href: string; cta: string };
export type ActivityRow = { id: string; text: string; since: string; tone: "done" | "warn" | "info" };

const ago = (iso?: string) => {
  if (!iso) return "";
  const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  return m < 1 ? "just now" : m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`;
};

function Cover({ src, className }: { src: string | null; className?: string }) {
  return (
    <div className={cx("relative overflow-hidden rounded-xl bg-[linear-gradient(180deg,#24306e,#5a3f8a)]", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
          <circle cx="70" cy="28" r="7" fill="#f3eaff" />
          <path d="M0 100 L22 58 L38 76 L58 46 L100 100Z" fill="#141b45" />
          <path d="M0 100 L30 72 L52 88 L74 66 L100 100Z" fill="#0d1236" />
        </svg>
      )}
    </div>
  );
}

const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
);

/** The shared studio home: live 3D office in the middle, inbox and recent activity on the right. */
export function StudioHome({ initial, review, inbox, activity }: { initial: AgentState[]; review: ReviewItem[]; inbox: InboxCard[]; activity: ActivityRow[] }) {
  const [agents, setAgents] = useState(initial);
  const [open, setOpen] = useState<string | null>(null);
  const [night, setNight] = useState(false); // the soft light gradient is the default look
  const stage = useRef<HTMLDivElement>(null);
  const inboxRef = useRef<HTMLElement>(null);
  useEffect(() => {
    let alive = true;
    const t = setInterval(async () => {
      try {
        const res = await fetch("/api/studio/team", { cache: "no-store" });
        if (res.ok && alive) setAgents(((await res.json()) as { agents: AgentState[] }).agents);
      } catch {
        /* keep last state */
      }
    }, 4000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);
  const working = agents.filter((a) => ["typing", "reading", "thinking", "handing_off"].includes(a.activity));
  const faces = (working.length ? working : agents.filter((a) => !AGENTS.find((d) => d.key === a.key)?.human)).slice(0, 3);

  return (
    <div className={cx("min-h-screen transition-colors duration-700", night ? "text-white" : "studio-day text-[#1b2150]", night ? "bg-[#0b0f2a]" : "bg-[linear-gradient(180deg,#7d93ea_0%,#a39be6_40%,#d5b0dd_75%,#b4b7ec_100%)]")}>
      <div className="grid min-h-screen lg:grid-cols-[260px_minmax(0,1fr)_380px]">
        {/* left menu */}
        <aside className={cx("flex flex-col gap-6 border-r px-5 py-7", night ? "border-white/5 bg-[#0d1233]" : "border-white/30 bg-white/20 backdrop-blur")}>
          <div className="flex items-center gap-3 px-1">
            <svg viewBox="0 0 40 40" className="h-11 w-11 text-[#d9d2ff]" aria-hidden><path d="M27 6a15 15 0 1 0 7 25A13 13 0 0 1 27 6Z" fill="currentColor" /></svg>
            <div>
              <div className="font-serif text-[26px] leading-none">Sleep Stories</div>
              <div className="mt-1.5 text-[11px] tracking-[0.45em] text-white/80">STUDIO</div>
            </div>
          </div>
          <nav className="space-y-2">
            <span className="flex items-center gap-4 rounded-2xl border border-lavender/60 bg-lavender/15 px-4 py-3">
              <Icon d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
              <span><span className="block text-[15px] font-medium">Studio</span><span className="block text-[12.5px] text-white/70">Your AI team</span></span>
            </span>
            <button onClick={() => inboxRef.current?.scrollIntoView({ behavior: "smooth" })} className="flex w-full items-center gap-4 rounded-2xl px-4 py-3 text-left hover:bg-white/5">
              <Icon d="M3 6h18v12H3zM3 7l9 6 9-6" />
              <span className="flex-1"><span className="block text-[15px] font-medium">Inbox</span><span className="block text-[12.5px] text-white/70">Needs your review</span></span>
              {inbox.length > 0 && <span className="rounded-full bg-lavender/80 px-2.5 py-0.5 text-xs font-semibold text-[#141a3a]">{inbox.length}</span>}
            </button>
            <Link href="/studio/series" className="flex items-center gap-4 rounded-2xl px-4 py-3 hover:bg-white/5">
              <Icon d="M4 5h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6z" />
              <span className="flex-1"><span className="block text-[15px] font-medium">Library</span><span className="block text-[12.5px] text-white/70">All stories &amp; assets</span></span>
              <span className="text-xs text-white/40" title="Sean access only">🔒</span>
            </Link>
            <Link href="/studio" className="flex items-center gap-4 rounded-2xl px-4 py-3 hover:bg-white/5">
              <Icon d="M8 9l-3 3 3 3M16 9l3 3-3 3M13.5 6l-3 12" />
              <span className="flex-1"><span className="block text-[15px] font-medium">Dev</span><span className="block text-[12.5px] text-white/70">Full studio · Sean only</span></span>
              <span className="text-xs text-white/40" title="Sean access only">🔒</span>
            </Link>
          </nav>
          <div className={cx("mt-auto rounded-2xl border p-4", night ? "border-white/10 bg-white/[0.03]" : "border-white/40 bg-white/25")}>
            <div className="flex items-center justify-between text-[15px] font-medium">What&apos;s happening now <span className={cx("h-2 w-2 rounded-full", working.length ? "bg-emerald-400" : "bg-white/30")} /></div>
            <div className="mt-3 space-y-2.5">
              <div className="flex shrink-0 -space-x-3">
                {faces.map((a) => {
                  const def = AGENTS.find((d) => d.key === a.key)!;
                  return <AgentFace key={a.key} agent={def} activity={a.activity} size="sm" className="!h-11 w-11 shrink-0 overflow-hidden rounded-full border-2 border-white/60" />;
                })}
              </div>
              <p className="text-[12.5px] leading-snug text-white/75">{working.length ? `${working.length} agent${working.length === 1 ? " is" : "s are"} writing, creating and producing new stories.` : "The team is resting – nothing in production right now."}</p>
            </div>
          </div>
        </aside>

        {/* office */}
        <main className="relative flex min-w-0 flex-col">
          <div className="flex items-center justify-between px-6 pt-6">
            <span className={cx("inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm", night ? "border-white/10 bg-white/[0.04]" : "border-white/40 bg-white/25")}>
              <span className={cx("h-2 w-2 rounded-full", working.length ? "bg-emerald-400" : "bg-white/40")} />
              {working.length ? "AI team working" : "AI team resting"} · {AGENTS.filter((a) => !a.human).length} agents
            </span>
          </div>
          <div ref={stage} className={cx("relative flex flex-1 items-center", night ? "bg-[#0b0f2a]" : "bg-[linear-gradient(180deg,#7d93ea_0%,#a39be6_40%,#d5b0dd_75%,#b4b7ec_100%)] lg:bg-none")}>
            <div className={cx("w-full transition-[filter] duration-700", !night && "brightness-[1.08] saturate-[1.05]")}>
              <SimsOffice agents={agents} onOpen={(k) => setOpen(k)} canEdit={false} review={review} legend={false} bare />
            </div>
            <Link href="/studio/releases" className="absolute bottom-[12%] left-[10%] rounded-full bg-[#c7b8ff] px-5 py-2.5 text-[15px] font-semibold text-[#141a3a] shadow-lg shadow-black/40 hover:bg-[#d6cbff]">Review &amp; Approve</Link>
            <div className="absolute bottom-5 right-6 flex items-center gap-3">
              <div className={cx("flex items-center gap-1 rounded-full border p-1 text-sm", night ? "border-white/10 bg-[#11163a]/90" : "border-white/40 bg-white/40")}>
                <button onClick={() => setNight(false)} className={cx("flex items-center gap-1.5 rounded-full px-4 py-1.5", !night ? "bg-[#c7b8ff] text-[#141a3a]" : "text-white/80 hover:text-white")}>☀︎ Day</button>
                <button onClick={() => setNight(true)} className={cx("flex items-center gap-1.5 rounded-full px-4 py-1.5", night ? "bg-[#c7b8ff] text-[#141a3a]" : "text-[#141a3a]/80 hover:text-[#141a3a]")}>☾ Night</button>
              </div>
              <button onClick={() => (document.fullscreenElement ? document.exitFullscreen() : stage.current?.requestFullscreen())} className={cx("grid h-11 w-11 place-items-center rounded-xl border", night ? "border-white/10 bg-[#11163a]/90" : "border-white/40 bg-white/40")} aria-label="Full screen">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
              </button>
            </div>
          </div>
        </main>

        {/* inbox + activity */}
        <aside ref={inboxRef} className={cx("flex flex-col gap-4 border-l p-5", night ? "border-white/5 bg-[#0d1233]" : "border-white/30 bg-white/20 backdrop-blur")}>
          <div className="flex items-center gap-3 px-1">
            <h2 className="text-2xl font-medium">Inbox</h2>
            <span className="rounded-full bg-lavender/80 px-2.5 py-0.5 text-xs font-semibold text-[#141a3a]">{inbox.length}</span>
            <Link href="/studio/approvals" className="ml-auto text-sm text-[#c7b8ff] hover:text-white">View all →</Link>
          </div>
          {inbox.length === 0 && <p className={cx("rounded-2xl border p-5 text-sm text-white/70", night ? "border-white/10 bg-white/[0.03]" : "border-white/40 bg-white/25")}>All caught up – nothing needs you right now.</p>}
          <ul className="space-y-3">
            {inbox.slice(0, 4).map((m) => (
              <li key={m.id} className={cx("rounded-2xl border p-4", night ? "border-white/10 bg-white/[0.04]" : "border-white/40 bg-white/30")}>
                <div className="flex items-center gap-2 text-[11.5px] font-semibold tracking-wide">
                  <span className={cx("h-2.5 w-2.5 rounded-full", m.kind === "approval" ? "bg-amber-300" : "bg-[#a78bfa]")} />
                  <span className={m.kind === "approval" ? "text-amber-200" : "text-[#c7b8ff]"}>{m.kind === "approval" ? "READY FOR APPROVAL" : "QUESTION FROM TEAM"}</span>
                  <span className="ml-auto font-normal text-white/60">{ago(m.since)}</span>
                </div>
                <div className="mt-3 flex gap-3">
                  <Cover src={m.cover} className="h-28 w-28 shrink-0" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="text-[17px] font-medium leading-snug">{m.title}</div>
                    <div className="mt-1 line-clamp-2 text-[13px] text-white/70">{m.sub}</div>
                    <Link href={m.href} className={cx("mt-auto rounded-full px-4 py-2 text-center text-sm font-semibold", m.kind === "approval" ? "bg-[#c7b8ff] text-[#141a3a] hover:bg-[#d6cbff]" : "border border-[#c7b8ff]/50 text-[#d9d2ff] hover:bg-white/5")}>{m.cta} →</Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-2 border-t border-white/10 pt-4">
            <div className="flex items-center px-1">
              <h3 className="text-lg font-medium">Recent activity</h3>
              <Link href="/studio/now" className="ml-auto text-sm text-[#c7b8ff] hover:text-white">View all →</Link>
            </div>
            <ul className="mt-3 space-y-3 text-[13.5px]">
              {activity.length === 0 && <li className="text-white/60">No activity yet.</li>}
              {activity.map((a) => (
                <li key={a.id} className="flex items-center gap-3">
                  <span className={cx("h-2.5 w-2.5 shrink-0 rounded-full", a.tone === "done" ? "bg-emerald-400" : a.tone === "warn" ? "bg-amber-300" : "bg-[#a78bfa]")} />
                  <span className="min-w-0 flex-1 truncate text-white/85">{a.text}</span>
                  <span className="shrink-0 text-xs text-white/50">{ago(a.since)}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
      {open && <AgentDrawer agentKey={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AGENTS } from "@/lib/studio/agents";
import type { AgentState } from "@/lib/studio/team";
import { SimsOffice, type ReviewItem } from "./SimsOffice";
import { AgentDrawer } from "./AgentDrawer";
import { AgentFace } from "./AgentFace";
import { cx } from "@/lib/util";
import { BrandLogo } from "@/components/layout/BrandLogo";

/** Where the team can listen to published stories. */
const LISTEN_URL = "https://seanidealink.xyz/";

export type InboxCard = { id: string; kind: "approval" | "question"; title: string; sub: string; cover: string | null; seconds: number; since: string; href: string; cta: string };
export type ActivityRow = { id: string; text: string; since: string; tone: "done" | "warn" | "info" };
export type LatestCard = { id: string; title: string; number: number; cover: string | null; stage: "ready" | "changes" | "approved" | "published" | "production" | "audio"; seconds: number };

const STAGE: Record<LatestCard["stage"], [string, string]> = {
  ready: ["READY FOR APPROVAL", "bg-amber-300"],
  changes: ["CHANGES REQUESTED", "bg-rose-300"],
  approved: ["APPROVED", "bg-emerald-300"],
  published: ["PUBLISHED", "bg-emerald-400"],
  production: ["IN PRODUCTION", "bg-sky-300"],
  audio: ["FINALISING AUDIO", "bg-sky-300"],
};

const ago = (iso?: string) => {
  if (!iso) return "";
  const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  return m < 1 ? "just now" : m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`;
};
const mmss = (s: number) => (s > 0 ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}` : "");

function Cover({ src, className, children }: { src: string | null; className?: string; children?: React.ReactNode }) {
  return (
    <div className={cx("relative overflow-hidden bg-[linear-gradient(180deg,#24306e,#5a3f8a)]", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <svg viewBox="0 0 100 60" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
          <circle cx="72" cy="16" r="5" fill="#f3eaff" />
          <path d="M0 60 L22 30 L38 44 L58 24 L100 60Z" fill="#1a2152" />
          <path d="M0 60 L30 42 L52 54 L74 38 L100 60Z" fill="#0f1438" />
        </svg>
      )}
      {children}
    </div>
  );
}

const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
);

/** The shared studio home: greeting, live 3D office, inbox, and the latest stories along the bottom. */
export function StudioHome({ initial, review, inbox, latest, isOwner }: { initial: AgentState[]; review: ReviewItem[]; inbox: InboxCard[]; activity: ActivityRow[]; latest: LatestCard[]; isOwner: boolean }) {
  const [agents, setAgents] = useState(initial);
  const [open, setOpen] = useState<string | null>(null);
  const [night, setNight] = useState(false); // the soft light gradient is the default look
  const [greeting, setGreeting] = useState("Hello");
  const stage = useRef<HTMLDivElement>(null);
  const inboxRef = useRef<HTMLElement>(null);
  const strip = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening");
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
  const crew = AGENTS.filter((a) => !a.human);
  const shownFaces = (working.length ? crew.filter((d) => working.some((w) => w.key === d.key)) : crew).slice(0, 4);
  const panel = night ? "border-white/10 bg-[#11163a]/80" : "border-white/50 bg-white/30 backdrop-blur-md";
  const card = night ? "border-white/10 bg-white/[0.04]" : "border-white/50 bg-white/35";

  return (
    <div className={cx("min-h-screen p-3 transition-colors duration-700 sm:p-4", night ? "bg-[#0b0f2a] text-white" : "studio-day bg-[linear-gradient(180deg,#7d93ea_0%,#a39be6_38%,#d5b0dd_72%,#b4b7ec_100%)] text-[#1b2150]")}>
      <div className="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)_380px]">
        {/* left menu card */}
        <aside className={cx("flex flex-col gap-6 rounded-3xl border p-4 xl:min-h-[calc(100vh-290px)]", panel)}>
          <div className="px-2 pt-3">
            <BrandLogo onDark={night} width={196} />
          </div>
          <a href={LISTEN_URL} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(90deg,#2346c4,#7a3fc0)] px-4 py-3 text-[15px] font-semibold text-white shadow-lg shadow-[#3b2a8a]/30 hover:brightness-110">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
            Listen Now
          </a>
          <nav className="space-y-1.5">
            <span className="flex items-center gap-4 rounded-2xl border border-lavender/60 bg-lavender/15 px-4 py-3">
              <Icon d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
              <span><span className="block text-[15px] font-medium">Studio</span><span className="block text-[12.5px] text-white/70">Your AI team</span></span>
            </span>
            <button onClick={() => inboxRef.current?.scrollIntoView({ behavior: "smooth" })} className="flex w-full items-center gap-4 rounded-2xl px-4 py-3 text-left hover:bg-white/10">
              <Icon d="M3 6h18v12H3zM3 7l9 6 9-6" />
              <span className="flex-1"><span className="block text-[15px] font-medium">Inbox</span><span className="block text-[12.5px] text-white/70">Needs your review</span></span>
              {inbox.length > 0 && <span className="rounded-full bg-[#8b7cf0] px-2.5 py-0.5 text-xs font-semibold text-white">{inbox.length}</span>}
            </button>
            <Link href="/studio/series" className="flex items-center gap-4 rounded-2xl px-4 py-3 hover:bg-white/10">
              <Icon d="M4 5h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6z" />
              <span className="flex-1"><span className="block text-[15px] font-medium">Library</span><span className="block text-[12.5px] text-white/70">All stories &amp; assets</span></span>
              {!isOwner && <span className="text-xs" title="Sean access only">🔒</span>}
            </Link>
            <Link href="/studio" className="flex items-center gap-4 rounded-2xl px-4 py-3 hover:bg-white/10">
              <Icon d="M8 9l-3 3 3 3M16 9l3 3-3 3M13.5 6l-3 12" />
              <span className="flex-1"><span className="block text-[15px] font-medium">Dev</span><span className="block text-[12.5px] text-white/70">Full studio · Sean only</span></span>
              {!isOwner && <span className="text-xs" title="Sean access only">🔒</span>}
            </Link>
          </nav>
          <div className="mt-auto flex items-center gap-3 px-2 pb-1">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#2a2f5e] text-xs font-semibold text-white">{isOwner ? "SW" : "T"}</span>
            <span className="flex-1 text-sm">{isOwner ? "Sean" : "Team (view only)"}</span>
            {isOwner && <Link href="/studio/settings" aria-label="Settings" className="text-white/70 hover:text-white"><Icon d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.6 7.6 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.6 7.6 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z" /></Link>}
          </div>
        </aside>

        {/* greeting + office */}
        <main ref={stage} className={cx("relative flex min-w-0 flex-col rounded-3xl", night && "bg-[#0b0f2a]")}>
          <div className="px-3 pt-2">
            <h1 className="font-serif text-4xl sm:text-5xl">{greeting}, {isOwner ? "Sean" : "team"}</h1>
            <p className="mt-1 text-[16px] text-white/80">Your AI team is creating, producing and refining new Sleep Stories.</p>
          </div>
          <div className="relative flex flex-1 items-center">
            <div className={cx("w-full transition-[filter] duration-700", !night && "brightness-[1.06]")}>
              <SimsOffice agents={agents} onOpen={(k) => setOpen(k)} canEdit={false} review={review} legend={false} bare />
            </div>
            <Link href="/studio/releases" className="absolute bottom-[10%] left-[8%] rounded-full bg-[#c7b8ff] px-5 py-2.5 text-[15px] font-semibold text-[#141a3a] shadow-lg shadow-black/30 hover:bg-[#d6cbff]">Review &amp; Approve</Link>
            <div className="absolute bottom-3 right-3 flex items-center gap-3">
              <div className={cx("flex items-center gap-1 rounded-full border p-1 text-sm", panel)}>
                <button onClick={() => setNight(false)} className={cx("rounded-full px-4 py-1.5", !night ? "bg-[#c7b8ff] text-[#141a3a]" : "text-white/80 hover:text-white")}>☀︎ Day</button>
                <button onClick={() => setNight(true)} className={cx("rounded-full px-4 py-1.5", night ? "bg-[#c7b8ff] text-[#141a3a]" : "hover:opacity-80")}>☾ Night</button>
              </div>
              <button onClick={() => (document.fullscreenElement ? document.exitFullscreen() : stage.current?.requestFullscreen())} className={cx("grid h-11 w-11 place-items-center rounded-xl border", panel)} aria-label="Full screen">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
              </button>
            </div>
          </div>
        </main>

        {/* status + inbox */}
        <div className="flex flex-col gap-4">
          <div className={cx("flex items-center gap-3 rounded-full border py-2 pl-4 pr-2", panel)}>
            <span className={cx("h-2.5 w-2.5 rounded-full", working.length ? "bg-emerald-400" : "bg-white/50")} />
            <span className="flex-1 text-sm">{working.length ? `${working.length} agent${working.length === 1 ? "" : "s"} working` : "Team resting"}</span>
            <span className="flex -space-x-2">
              {shownFaces.map((d) => <AgentFace key={d.key} agent={d} size="sm" className="!h-9 w-9 overflow-hidden rounded-full border-2 border-white/70" />)}
            </span>
            {crew.length > shownFaces.length && <span className="rounded-full bg-[#2a2f5e] px-2.5 py-1.5 text-xs font-semibold text-white">+{crew.length - shownFaces.length}</span>}
          </div>
          <aside ref={inboxRef} className={cx("flex-1 rounded-3xl border p-4", panel)}>
            <div className="flex items-center gap-3 px-1 pb-3">
              <h2 className="text-2xl font-medium">Inbox</h2>
              <span className="rounded-full bg-[#8b7cf0] px-2.5 py-0.5 text-xs font-semibold text-white">{inbox.length}</span>
              <Link href="/studio/approvals" className="ml-auto text-sm text-[#c7b8ff] hover:text-white">View all →</Link>
            </div>
            {inbox.length === 0 && <p className={cx("rounded-2xl border p-5 text-sm text-white/70", card)}>All caught up – nothing needs you right now.</p>}
            <ul className="space-y-3">
              {inbox.slice(0, 3).map((m) => (
                <li key={m.id} className={cx("rounded-2xl border p-3.5", card)}>
                  <div className="flex items-center gap-2 text-[11.5px] font-semibold tracking-wide">
                    <span className={cx("h-2.5 w-2.5 rounded-full", m.kind === "approval" ? "bg-amber-300" : "bg-[#a78bfa]")} />
                    <span className={m.kind === "approval" ? "text-amber-200" : "text-[#c7b8ff]"}>{m.kind === "approval" ? "READY FOR APPROVAL" : "QUESTION FROM TEAM"}</span>
                    <span className="ml-auto font-normal text-white/60">{ago(m.since)}</span>
                  </div>
                  <div className="mt-3 flex gap-3">
                    <Cover src={m.cover} className="h-[118px] w-[128px] shrink-0 rounded-xl">
                      {m.seconds > 0 && <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] text-white">{mmss(m.seconds)}</span>}
                    </Cover>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="text-[16px] font-medium leading-snug">{m.title}</div>
                      <div className="mt-1 line-clamp-2 text-[12.5px] text-white/70">{m.sub}</div>
                      <div className="mt-auto flex items-center gap-2 pt-2">
                        <Link href={m.href} className={cx("flex-1 rounded-full px-4 py-2 text-center text-sm font-semibold", m.kind === "approval" ? "bg-[#c7b8ff] text-[#141a3a] hover:bg-[#d6cbff]" : "border border-[#8b7cf0] text-[#c7b8ff] hover:bg-white/10")}>{m.kind === "approval" ? "Review" : m.cta} →</Link>
                        <Link href={m.href} aria-label="More" className="px-1 text-lg leading-none text-white/60 hover:text-white">⋮</Link>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>

      {/* latest from the studio */}
      <section className={cx("mt-4 rounded-3xl border p-4", panel)}>
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-1 pb-3">
          <h2 className="text-xl font-medium">Latest from the studio</h2>
          <span className="text-sm text-white/60">Stories in progress, ready for review or recently published.</span>
          <Link href="/studio/series" className="ml-auto text-sm text-[#c7b8ff] hover:text-white">View all stories →</Link>
        </div>
        <div className="relative">
          <ul ref={strip} className="flex snap-x gap-3 overflow-x-auto pb-1 [scrollbar-width:none]">
            {latest.length === 0 && <li className="px-1 text-sm text-white/60">No stories yet.</li>}
            {latest.map((c) => (
              <li key={c.id} className="snap-start">
                <Cover src={c.cover} className="h-[150px] w-[280px] rounded-2xl">
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f2a]/90 via-[#0b0f2a]/20 to-transparent" />
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-[#0b0f2a]/70 px-2.5 py-1 text-[10.5px] font-semibold tracking-wide text-white">
                    <span className={cx("h-2 w-2 rounded-full", STAGE[c.stage][1])} />
                    {STAGE[c.stage][0]}
                  </span>
                  <div className="absolute inset-x-3 bottom-3 flex items-end gap-2 text-white">
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] opacity-80">Episode {c.number}</div>
                      <div className="line-clamp-2 font-serif text-[19px] leading-tight">{c.title}</div>
                    </div>
                    {c.seconds > 0 && <span className="rounded-md bg-black/60 px-1.5 py-0.5 text-[11px]">{mmss(c.seconds)}</span>}
                  </div>
                </Cover>
              </li>
            ))}
          </ul>
          {latest.length > 4 && (
            <button onClick={() => strip.current?.scrollBy({ left: 600, behavior: "smooth" })} aria-label="More stories" className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-[#0b0f2a]/80 text-white shadow-lg">›</button>
          )}
        </div>
      </section>
      {open && <AgentDrawer agentKey={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { AGENT_BY_KEY } from "@/lib/studio/agents";
import type { AgentState } from "@/lib/studio/team";
import { cx } from "@/lib/util";

const ago = (iso?: string) => {
  if (!iso) return "";
  const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  return m < 1 ? "now" : m < 60 ? `${m}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`;
};

/** Anything the team needs from you, shown as an email inbox. Built from live workflow state. */
export function StudioInbox({ agents, onOpen }: { agents: AgentState[]; onOpen: (key: string) => void }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const mail = agents
    .filter((a) => a.activity === "asking_for_help")
    .map((a) => {
      const def = AGENT_BY_KEY[a.key];
      const blocked = a.task?.kind === "blocked";
      return {
        id: `${a.key}-${a.task?.step_key ?? ""}`,
        key: a.key,
        from: def.human ? "Approvals desk" : def.name,
        address: def.human ? "approvals@studio.calm" : `${a.key.replace(/_/g, ".")}@studio.calm`,
        subject: blocked ? `Stuck: ${a.task?.label ?? "a step"}` : `Your decision: ${a.task?.label ?? "approval needed"}`,
        body: blocked
          ? `Hi – I'm stuck on “${a.task?.label}”${a.task?.run_title ? ` for ${a.task.run_title}` : ""}. What I need: ${a.needs ?? "a hand from you"}. Quick fix on the banner above can often sort it, or open the pipeline to see the details.`
          : `Hi – “${a.task?.label}”${a.task?.run_title ? ` for ${a.task.run_title}` : ""} is ready for your review. Nothing gets published until you approve it.`,
        since: a.task?.since,
        href: blocked ? `/studio/pipeline?run=${a.task?.run_id ?? ""}` : "/studio/approvals",
        cta: blocked ? "Open the pipeline" : "Review in Approvals",
      };
    })
    .sort((x, y) => (y.since ?? "").localeCompare(x.since ?? ""));

  return (
    <section className="mb-4 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
      <header className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <span aria-hidden>✉️</span>
        <h2 className="text-sm font-medium text-white">Inbox</h2>
        <span className={cx("rounded-full px-2 py-0.5 text-[11px]", mail.length ? "bg-amber-300/90 text-[#2a1a00]" : "bg-white/10 text-mist")}>{mail.length ? `${mail.length} new` : "All caught up"}</span>
      </header>
      {mail.length === 0 ? (
        <p className="px-4 py-3 text-[13px] text-mist">No emails – the team doesn&apos;t need anything from you right now.</p>
      ) : (
        <ul className="max-h-72 divide-y divide-white/5 overflow-y-auto">
          {mail.map((m) => (
            <li key={m.id}>
              <button onClick={() => setOpenId(openId === m.id ? null : m.id)} className="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-white/[0.04]">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-sky-300" aria-label="Unread" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="truncate text-[13px] font-semibold text-white">{m.from}</span>
                    <span className="ml-auto shrink-0 text-[11px] text-mist">{ago(m.since)}</span>
                  </span>
                  <span className="block truncate text-[13px] text-white/90">{m.subject}</span>
                  {openId !== m.id && <span className="block truncate text-[12px] text-mist">{m.body}</span>}
                </span>
              </button>
              {openId === m.id && (
                <div className="space-y-3 px-9 pb-4 text-[13px]">
                  <p className="text-[11px] text-mist">From {m.from} &lt;{m.address}&gt; · to you</p>
                  <p className="leading-relaxed text-white/90">{m.body}</p>
                  <div className="flex flex-wrap gap-2">
                    <Link href={m.href} className="rounded-full bg-lavender/90 px-3 py-1.5 font-medium text-[#0b1430] hover:bg-lavender">{m.cta}</Link>
                    <button onClick={() => onOpen(m.key)} className="rounded-full border border-white/15 px-3 py-1.5 text-white/90 hover:bg-white/10">See what they&apos;re working on</button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

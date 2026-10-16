"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AGENT_BY_KEY } from "@/lib/studio/agents";
import type { AgentKey } from "@/lib/studio/types";
import { cx, formatCents, relativeTime } from "@/lib/util";
import { AgentBedroom } from "./AgentBedroom";

interface Detail {
  agent: { key: AgentKey; name: string; title: string; human: boolean };
  state: { activity: string; task: { label: string; run_id: string; run_title: string } | null; needs: string | null; next: { agent: AgentKey; label: string }[] } | undefined;
  history: { run_id: string; key: string; label: string; status: string; summary: string | null; error: string | null; cost_cents: number; at: string }[];
  outputs: { id: string; title: string; kind: string; version: number; reasoning: string; episode_id: string | null; series_id: string | null; created_at: string }[];
  feedback: { id: string; title: string; agent: AgentKey; summary: string }[];
}

export function AgentDrawer({ agentKey, onClose }: { agentKey: string; onClose: () => void }) {
  const [d, setD] = useState<Detail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const res = await fetch(`/api/studio/agents/${agentKey}`, { cache: "no-store" });
      if (!alive) return;
      if (res.ok) setD((await res.json()) as Detail);
      else setErr("Couldn't load this agent.");
    };
    void load();
    const t = setInterval(load, 4000);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      alive = false;
      clearInterval(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [agentKey, onClose]);
  const def = AGENT_BY_KEY[agentKey as AgentKey];
  const outputHref = (o: Detail["outputs"][number]) => (o.episode_id ? `/studio/writers-room/${o.episode_id}#${o.id}` : o.series_id ? `/studio/series/${o.series_id}#${o.id}` : "#");
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-label={`${def.name} details`}>
      <aside className="h-full w-full max-w-lg overflow-y-auto border-l border-white/10 bg-[#0c1129] p-6 animate-fade-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-lavender">AI Team</p>
            <h2 className="font-serif text-3xl text-white">{def.name}</h2>
            <p className="text-sm text-mist">{def.title}</p>
          </div>
          <button onClick={onClose} className="rounded-full px-3 py-1 text-mist hover:bg-white/5" aria-label="Close">✕</button>
        </div>
        <div className="mt-4 overflow-hidden rounded-3xl border border-white/10">
          <AgentBedroom agent={def} activity={(d?.state?.activity as never) ?? "sleeping"} className="block w-full" />
        </div>
        {err && <p className="mt-4 text-rose-300">{err}</p>}
        {d && (
          <div className="mt-6 space-y-6 text-sm">
            <section>
              <h3 className="label">Current task</h3>
              {d.state?.task ? (
                <Link href={`/studio/pipeline?run=${d.state.task.run_id}`} className="block rounded-2xl bg-white/[0.04] p-3 hover:bg-white/[0.07]">
                  <div className="text-white">{d.state.task.label}</div>
                  <div className="text-xs text-mist">{d.state.task.run_title}</div>
                  {d.state.needs && <div className="mt-1 text-xs text-amber-200">Waiting on {d.state.needs}</div>}
                </Link>
              ) : (
                <p className="text-mist">{def.human ? "Nothing needs your decision right now." : "Resting – no task assigned."}</p>
              )}
            </section>
            {d.state?.next.length ? (
              <section>
                <h3 className="label">Next handoff</h3>
                <ul className="space-y-1">{d.state.next.map((n, i) => <li key={i} className="text-white/90">→ {AGENT_BY_KEY[n.agent].name}: {n.label}</li>)}</ul>
              </section>
            ) : null}
            <section>
              <h3 className="label">Latest reasoning</h3>
              <p className="whitespace-pre-line text-white/90">{d.outputs[0]?.reasoning || "—"}</p>
            </section>
            <section>
              <h3 className="label">Outputs</h3>
              <ul className="space-y-1.5">
                {d.outputs.map((o) => (
                  <li key={o.id}>
                    <Link href={outputHref(o)} className="flex justify-between gap-3 rounded-xl px-2 py-1.5 hover:bg-white/5">
                      <span className="truncate text-white/90">{o.title} <span className="text-mist">v{o.version}</span></span>
                      <span className="shrink-0 text-xs text-mist">{relativeTime(o.created_at)}</span>
                    </Link>
                  </li>
                ))}
                {!d.outputs.length && <li className="text-mist">No deliverables yet.</li>}
              </ul>
            </section>
            {d.feedback.length > 0 && (
              <section>
                <h3 className="label">Feedback from the team</h3>
                <ul className="space-y-2">
                  {d.feedback.map((f) => (
                    <li key={f.id} className="rounded-xl bg-white/[0.04] p-2.5">
                      <div className="text-xs text-lavender">{AGENT_BY_KEY[f.agent].name} · {f.title}</div>
                      <p className="mt-0.5 line-clamp-3 text-white/85">{f.summary}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <section>
              <h3 className="label">Job history</h3>
              <ul className="space-y-1.5">
                {d.history.map((h) => (
                  <li key={`${h.run_id}-${h.key}`} className="rounded-xl px-2 py-1.5 hover:bg-white/5">
                    <div className="flex justify-between gap-3">
                      <span className="text-white/90">{h.label}</span>
                      <span className={cx("shrink-0 text-xs", h.status === "failed" ? "text-rose-300" : h.status === "succeeded" ? "text-emerald-200" : "text-mist")}>{h.status.replace("_", " ")}</span>
                    </div>
                    <div className="text-xs text-mist">{relativeTime(h.at)} · {formatCents(h.cost_cents)}{h.summary ? ` · ${h.summary.slice(0, 90)}` : ""}</div>
                    {h.error && <div className="text-xs text-rose-300">{h.error.slice(0, 160)}</div>}
                  </li>
                ))}
                {!d.history.length && <li className="text-mist">No jobs yet.</li>}
              </ul>
            </section>
          </div>
        )}
      </aside>
    </div>
  );
}

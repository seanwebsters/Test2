"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Page, PageHeader } from "@/components/shell/app-shell";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { AGENTS } from "@/lib/agents/meta";
import { AGENT_IDS, type AgentId, type Job } from "@/lib/types";
import { api } from "@/lib/api";
import { useData } from "@/lib/use-data";
import { useSettings } from "@/lib/use-settings";
import { useStudio } from "@/lib/client-store";
import { timeAgo, usd } from "@/lib/utils";

const OUTPUTS: Record<AgentId, string> = {
  ideation: "Concept, emotional goal, player objective, interaction model, archetype, visual direction, variations",
  design: "Core loop, rules, controls, progression, win condition, feedback, rewards, stress safeguards, level notes",
  art: "Palette, environment, visual elements, particles, motion tempo, transitions, sound mood, SVG motifs",
  development: "A validated game configuration for the runtime (or a freeform HTML document)",
  qa: "A report of real browser checks, console errors, and repair requests",
  insights: "Quality score, risks, recommendations labelled observed or hypothesis, next concepts",
};

export default function AgentsPage() {
  const toast = useStudio((s) => s.toast);
  const { data: s, refresh } = useSettings();
  const { data: analytics } = useData<{ byAgent: { agent: string; calls: number; usd: number }[] }>("/api/analytics");
  const { data: jobs } = useData<{ jobs: Job[] }>("/api/jobs?limit=12");

  async function setModel(agent: AgentId, model: string) {
    if (!s) return;
    await api("/api/settings", { method: "PUT", json: { ...s.settings, models: { ...s.settings.models, [agent]: model } } });
    toast({ title: `${AGENTS[agent].name} now uses ${s.models.find((m) => m.id === model)?.name}` });
    await refresh();
  }

  return (
    <Page>
      <PageHeader eyebrow="AI agents" title="The studio team" description="Six independent agents, each with its own brief, typed output schema and model. They run in sequence and hand validated JSON to each other." />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {AGENT_IDS.map((id, i) => {
          const meta = AGENTS[id];
          const stats = analytics?.byAgent.find((a) => a.agent === id);
          return (
            <motion.div key={id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.6 }} className="flex flex-col rounded-3xl border border-line/80 bg-paper/85 p-6 shadow-soft">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-2xl font-display text-lg text-white" style={{ background: meta.color }}>{i + 1}</span>
                <div>
                  <p className="font-display text-xl text-midnight">{meta.name}</p>
                  <p className="text-[12.5px] text-muted">{meta.role}</p>
                </div>
              </div>
              <p className="mt-4 text-[13.5px] leading-relaxed text-ink/80">{meta.short}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">{meta.responsibilities.map((r) => <Badge key={r} tone={meta.tone === "rose" ? "rose" : meta.tone === "midnight" ? "neutral" : meta.tone}>{r}</Badge>)}</div>
              <p className="eyebrow mt-5 mb-1">Output</p>
              <p className="text-[12.5px] leading-relaxed text-muted">{OUTPUTS[id]}</p>
              <div className="mt-auto pt-5">
                {id === "qa" ? (
                  <p className="text-[12.5px] text-muted">Runs Playwright and Chromium locally; repairs are written by the Development agent&apos;s model.</p>
                ) : s ? (
                  <Select value={s.settings.models[id]} onChange={(e) => void setModel(id, e.target.value)} aria-label={`${meta.name} model`}>
                    {s.models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </Select>
                ) : (
                  <div className="skeleton h-10 rounded-full" />
                )}
                <p className="mt-2 text-[12px] text-muted">{stats ? `${stats.calls} call${stats.calls === 1 ? "" : "s"} · ${usd(stats.usd)} so far` : "No calls yet"}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <section className="mt-14">
        <h2 className="mb-4 font-display text-2xl text-midnight">Recent runs</h2>
        <div className="overflow-hidden rounded-3xl border border-line/80 bg-paper/85">
          {jobs?.jobs.length ? (
            jobs.jobs.map((j) => (
              <Link key={j.id} href={j.gameId ? `/games/${j.gameId}` : "/lab"} className="flex items-center justify-between gap-4 border-b border-line/60 px-5 py-3.5 last:border-0 hover:bg-ivory/60">
                <div className="min-w-0">
                  <p className="truncate text-[14px] text-midnight">{j.kind === "lab" ? "Creative Lab concepts" : j.kind === "refine" ? `Refine: ${(j.input as { instruction: string }).instruction}` : (j.input as { prompt: string }).prompt}</p>
                  <p className="text-[12px] text-muted">{timeAgo(j.createdAt)} · {j.steps.filter((x) => x.status === "complete").length}/{j.steps.length} agents · {usd(j.costUsd)}</p>
                </div>
                <Badge tone={j.status === "complete" ? "sage" : j.status === "failed" || j.status === "interrupted" ? "rose" : "lavender"}>{j.status}</Badge>
              </Link>
            ))
          ) : (
            <p className="px-5 py-8 text-center text-[14px] text-muted">No runs yet. They&apos;ll appear here with every agent&apos;s status and cost.</p>
          )}
        </div>
      </section>
    </Page>
  );
}

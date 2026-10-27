"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Hammer, Loader2, Sparkles } from "lucide-react";
import { Page, PageHeader } from "@/components/shell/app-shell";
import { AgentTimeline } from "@/components/studio/agent-timeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useData } from "@/lib/use-data";
import { useStudio } from "@/lib/client-store";
import { useSettings } from "@/lib/use-settings";
import type { ConceptBatch, Game, Job } from "@/lib/types";
import type { LabConcept } from "@/lib/agents/schemas";
import { cn, timeAgo, usd } from "@/lib/utils";

const ARCH: Record<string, string> = { "tile-path": "Tile path", garden: "Mindful garden", constellation: "Constellation", freeform: "Freeform" };

export default function LabPage() {
  const router = useRouter();
  const toast = useStudio((s) => s.toast);
  const { data: settings } = useSettings();
  const [brief, setBrief] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [building, setBuilding] = useState<string | null>(null);
  const { data: batches, refresh } = useData<{ batches: ConceptBatch[] }>("/api/lab");
  const { data: jobData } = useData<{ job: Job }>(jobId ? `/api/jobs/${jobId}` : null, {
    poll: (d) => {
      const live = d.job.status === "running" || d.job.status === "queued";
      if (!live) void refresh();
      return live;
    },
  });
  const job = jobData?.job;
  const running = job && (job.status === "running" || job.status === "queued");
  const batch = batches?.batches[0];

  async function generate() {
    try {
      const { job } = await api<{ job: Job }>("/api/jobs", { method: "POST", json: { kind: "lab", brief, count: 5 } });
      setJobId(job.id);
    } catch (e) {
      toast({ title: "Couldn't start the lab", body: (e as Error).message, tone: "error" });
    }
  }
  async function build(c: LabConcept) {
    setBuilding(c.name);
    try {
      const { game } = await api<{ game: Game }>("/api/jobs", { method: "POST", json: { kind: "generate", prompt: `${c.name}: ${c.description}`, category: c.category, archetype: c.archetype, fromConcept: c } });
      router.push(`/games/${game.id}`);
    } catch (e) {
      setBuilding(null);
      toast({ title: "Couldn't start the build", body: (e as Error).message, tone: "error" });
    }
  }

  return (
    <Page>
      <PageHeader eyebrow="Creative Lab" title="Explore what could be next" description="The Ideation agent invents five genuinely different concepts; the Game Design agent assesses each one's complexity and feasibility. Pick one and the full studio builds it." />
      <div className="mb-10 flex flex-col gap-3 rounded-[28px] border border-line bg-paper p-2 shadow-lift sm:flex-row">
        <Input value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="Optional theme: e.g. rituals for the end of a working day" className="h-12 border-0 bg-transparent text-[15px] focus:ring-0" aria-label="Lab brief" onKeyDown={(e) => e.key === "Enter" && !running && generate()} />
        <Button size="lg" onClick={generate} disabled={!!running || (!!settings && !settings.status.anthropic)}>
          {running ? <Loader2 className="animate-spin" /> : <Sparkles />} Generate five new calming game concepts
        </Button>
      </div>
      {settings && !settings.status.anthropic && <p className="-mt-6 mb-8 text-[13px] text-[#8f3f3f]">The lab needs ANTHROPIC_API_KEY on the server. See Settings.</p>}
      {settings && <p className="-mt-6 mb-8 text-[12px] text-muted">Estimated cost {usd(settings.estimate.lab.typicalUsd)} per batch.</p>}

      {job && (running || job.status === "failed") && (
        <div className="mb-10 max-w-md rounded-3xl border border-line/80 bg-paper/85 p-5 shadow-soft">
          <AgentTimeline job={job} compact />
        </div>
      )}

      {batch ? (
        <section>
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="eyebrow mb-1">Latest batch · {timeAgo(batch.createdAt)}</p>
              <h2 className="font-display text-2xl text-midnight">{batch.brief ? `“${batch.brief}”` : "Open brief"}</h2>
            </div>
          </div>
          <div className="-mx-4 flex snap-x gap-5 overflow-x-auto px-4 pb-4">
            {batch.concepts.map((c, i) => (
              <motion.article key={c.name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07, duration: 0.6 }} className="flex w-[320px] shrink-0 snap-start flex-col rounded-3xl border border-line/80 bg-paper p-6 shadow-soft">
                <div className="mb-4 flex flex-wrap gap-1.5">
                  <Badge tone="lavender">{c.category}</Badge>
                  <Badge tone="coastal">{ARCH[c.archetype]}</Badge>
                </div>
                <h3 className="font-display text-2xl leading-tight text-midnight">{c.name}</h3>
                {c.hook && <p className="mt-2 text-[13px] italic text-[#6a5aa8]">{c.hook}</p>}
                <p className="mt-3 text-[13.5px] leading-relaxed text-ink/80">{c.description}</p>
                <dl className="mt-5 space-y-3 text-[12.5px]">
                  {[["Mechanic", c.mechanic], ["Emotional goal", c.emotionalGoal], ["Visual direction", c.visualDirection]].map(([k, v]) => (
                    <div key={k}><dt className="eyebrow mb-0.5">{k}</dt><dd className="leading-relaxed text-muted">{v}</dd></div>
                  ))}
                </dl>
                <div className="mt-5 grid grid-cols-2 gap-2 border-t border-line/70 pt-4 text-[12px]">
                  <div><p className="eyebrow mb-0.5">Complexity</p><p className="text-ink">{c.complexity ?? "—"}</p></div>
                  <div><p className="eyebrow mb-0.5">Feasibility</p><p className={cn(c.feasibility === "Ready now" ? "text-[#4f7a4b]" : "text-[#b07a3e]")}>{c.feasibility ?? "—"}</p></div>
                </div>
                {c.feasibilityNote && <p className="mt-2 text-[12px] leading-snug text-muted">{c.feasibilityNote}</p>}
                <Button className="mt-auto translate-y-0 self-stretch" style={{ marginTop: 20 }} onClick={() => build(c)} disabled={!!building}>
                  {building === c.name ? <Loader2 className="animate-spin" /> : <Hammer />} Build this game
                </Button>
              </motion.article>
            ))}
          </div>
          {batches!.batches.length > 1 && <p className="mt-6 text-[12.5px] text-muted">{batches!.batches.length - 1} earlier batch{batches!.batches.length > 2 ? "es are" : " is"} saved.</p>}
        </section>
      ) : (
        !running && (
          <div className="rounded-3xl border border-dashed border-line p-14 text-center">
            <p className="font-display text-2xl text-midnight">No concepts yet</p>
            <p className="mt-2 text-[14px] text-muted">Run the lab to compare five ideas side by side.</p>
          </div>
        )
      )}
    </Page>
  );
}

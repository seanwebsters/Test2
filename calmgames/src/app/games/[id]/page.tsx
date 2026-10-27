"use client";
import { use, useEffect, useMemo, useState } from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Download, Hammer, Loader2 } from "lucide-react";
import { AgentTimeline, OutputView } from "@/components/studio/agent-timeline";
import { GamePlayer } from "@/components/studio/game-player";
import { RefinePanel } from "@/components/studio/refine-panel";
import { QAReportView } from "@/components/studio/qa-report";
import { GameActions } from "@/components/games/game-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { useStudio } from "@/lib/client-store";
import { useData } from "@/lib/use-data";
import type { Asset, Game, GameVersion, Job, QAReport } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface Detail {
  game: Game;
  versions: GameVersion[];
  job: Job | null;
  assets: Asset[];
}
const live = (j: Job | null | undefined) => !!j && (j.status === "running" || j.status === "queued");

function GameStudio({ id }: { id: string }) {
  const params = useSearchParams();
  const toast = useStudio((s) => s.toast);
  const { data, error, refresh } = useData<Detail>(`/api/games/${id}`, { poll: (d) => live(d.job), interval: 1200 });
  const [selected, setSelected] = useState<number | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [testing, setTesting] = useState(false);

  const game = data?.game;
  const versions = useMemo(() => data?.versions ?? [], [data?.versions]);
  const current = game?.currentVersion ?? 0;
  useEffect(() => {
    // Follow the newest version as soon as a run finishes.
    if (game && (selected === null || selected > game.latestVersion)) setSelected(game.currentVersion || null);
  }, [game, selected]);
  const lastLatest = useMemo(() => ({ n: 0 }), []);
  useEffect(() => {
    if (game && lastLatest.n && game.latestVersion > lastLatest.n) {
      setSelected(game.latestVersion);
      toast({ title: `Version ${game.latestVersion} is ready`, body: "Play it now. Earlier versions are kept in the history." });
    }
    if (game) lastLatest.n = game.latestVersion;
  }, [game, lastLatest, toast]);

  const version = versions.find((v) => v.number === selected) ?? versions.at(-1);
  const versionJob = useData<{ job: Job }>(version?.jobId && !live(data?.job) ? `/api/jobs/${version.jobId}` : null);
  const job = live(data?.job) || data?.job?.status === "failed" || data?.job?.status === "interrupted" ? data!.job : (versionJob.data?.job ?? data?.job ?? null);

  if (error) return <div className="p-12 text-center text-muted">{error} <Link href="/games" className="underline">Back to the library</Link></div>;
  if (!data || !game) return <div className="grid h-[70vh] place-items-center"><Loader2 className="size-6 animate-spin text-muted" /></div>;

  async function refine(instruction: string) {
    try {
      await api(`/api/games/${id}/refine`, { method: "POST", json: { instruction, baseVersion: version?.number } });
      await refresh();
    } catch (e) {
      toast({ title: "Couldn't start the change", body: (e as Error).message, tone: "error" });
    }
  }
  async function resume() {
    if (!job) return;
    try {
      await api(`/api/jobs/${job.id}/resume`, { method: "POST" });
      await refresh();
    } catch (e) {
      toast({ title: "Couldn't resume", body: (e as Error).message, tone: "error" });
    }
  }
  async function save() {
    if (!version) return;
    await api(`/api/games/${id}/versions/${version.number}`, { method: "PATCH", json: { saved: true, label: label.trim() || undefined } });
    setSaveOpen(false);
    toast({ title: `Version ${version.number} saved`, body: "It's now the version the library plays and exports." });
    await refresh();
  }
  async function runQA() {
    if (!version) return;
    setTesting(true);
    try {
      const { qa } = await api<{ qa: QAReport }>(`/api/games/${id}/versions/${version.number}/qa`, { method: "POST" });
      toast({ title: qa.passed ? "QA passed" : "QA found issues", body: `${qa.checks.filter((c) => c.status === "pass").length} of ${qa.checks.length} checks passed.`, tone: qa.passed ? "default" : "error" });
      await refresh();
    } catch (e) {
      toast({ title: "QA couldn't run", body: (e as Error).message, tone: "error" });
    } finally {
      setTesting(false);
    }
  }

  const specs = version?.specs;
  const config = version?.build?.mode === "template" ? version.build.config : undefined;
  const emblem = data.assets.find((a) => a.id === version?.assetIds[0]);

  return (
    <div className="mx-auto max-w-[1680px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button asChild size="icon-sm" variant="ghost" aria-label="Back to library">
            <Link href="/games"><ArrowLeft /></Link>
          </Button>
          {emblem && <img src={`data:${emblem.mime};utf8,${encodeURIComponent(emblem.data)}`} alt="" className="size-9 rounded-xl bg-paper p-1 shadow-soft" />}
          <div className="min-w-0">
            <p className="eyebrow">{game.category} · {game.origin === "seed" ? "Studio original, hand-authored" : "Made by the agents"}</p>
            <h1 className="truncate font-display text-2xl text-midnight sm:text-3xl">{game.name}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {version?.build?.mode === "freeform" && <Badge tone="peach">Experimental freeform</Badge>}
          {version && (
            <Button size="sm" variant="secondary" asChild>
              <a href={`/api/games/${id}/export?version=${version.number}`}><Download /> Export</a>
            </Button>
          )}
          <GameActions game={game} />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_300px] 2xl:grid-cols-[320px_minmax(0,1fr)_340px]">
        {/* Left: agents and game information */}
        <aside className="order-2 space-y-5 xl:order-1">
          <section className="rounded-3xl border border-line/80 bg-paper/85 p-5 shadow-soft">
            <p className="mb-4 font-display text-xl text-midnight">{live(job) ? "The studio is working" : "Agents"}</p>
            {job ? (
              <AgentTimeline job={job} onResume={resume} />
            ) : (
              <p className="text-[13px] leading-relaxed text-muted">
                {game.origin === "seed" ? "This is a hand-authored studio original. No agents were run to make it, so there is nothing to inspect here. Ask for a change on the right and the agents will create version 2 from it." : "No agent run is recorded for this version."}
              </p>
            )}
          </section>
          {version && (
            <section className="rounded-3xl border border-line/80 bg-paper/85 p-5 shadow-soft">
              <Tabs defaultValue="qa">
                <TabsList className="mb-4">
                  <TabsTrigger value="qa">QA</TabsTrigger>
                  <TabsTrigger value="about">About</TabsTrigger>
                  <TabsTrigger value="review">Review</TabsTrigger>
                </TabsList>
                <TabsContent value="qa">
                  <QAReportView qa={version.qa} onRun={runQA} running={testing} />
                </TabsContent>
                <TabsContent value="about" className="space-y-4">
                  <Info label="Original prompt" value={game.prompt} />
                  {specs?.ideation && <Info label="Emotional goal" value={specs.ideation.emotionalGoal} />}
                  {specs?.design && <Info label="Core loop" value={specs.design.coreLoop} />}
                  {config && <Info label="Engine" value={`${config.archetype} · ${config.levels.length} level${config.levels.length > 1 ? "s" : ""}`} />}
                  {config && (
                    <div>
                      <p className="eyebrow mb-1.5">Palette</p>
                      <div className="flex gap-1.5">{[...config.theme.sky, config.theme.surface, config.theme.accent, config.theme.glow].map((c, i) => <span key={i} className="size-6 rounded-full border border-black/10" style={{ background: c }} title={c} />)}</div>
                    </div>
                  )}
                  <Info label="Created" value={`${formatDate(version.createdAt)} · version ${version.number}`} />
                </TabsContent>
                <TabsContent value="review">
                  {version.review ? (
                    <div className="space-y-4">
                      <div className="flex items-baseline gap-2"><span className="font-display text-4xl text-midnight">{version.review.qualityScore}</span><span className="text-[13px] text-muted">/ 10 · Insights agent&apos;s judgement</span></div>
                      <p className="text-[13.5px] leading-relaxed text-ink/85">{version.review.summary}</p>
                      <div className="space-y-2">
                        {version.review.recommendations.map((r) => (
                          <div key={r.title} className="rounded-2xl bg-ivory/80 p-3">
                            <div className="flex items-center justify-between gap-2"><p className="text-[13px] font-medium text-midnight">{r.title}</p><Badge tone={r.basis === "observed" ? "sage" : "neutral"}>{r.basis === "observed" ? "Observed in play data" : "Hypothesis"}</Badge></div>
                            <p className="mt-1 text-[12.5px] text-muted">{r.detail}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[13px] text-muted">No review yet. Reviews are written by the Insights agent at the end of each run, or from <Link className="underline" href="/analytics">Analytics</Link> once there is play data.</p>
                  )}
                </TabsContent>
              </Tabs>
            </section>
          )}
        </aside>

        {/* Centre: playable preview */}
        <section className="order-1 h-[min(78vh,820px)] min-h-[520px] xl:order-2">
          {version?.build ? (
            <GamePlayer gameId={id} version={version.number} title={game.name} saved={version.saved && version.number === current} onSave={() => (setLabel(version.label ?? ""), setSaveOpen(true))} />
          ) : (
            <Building game={game} job={job} />
          )}
        </section>

        {/* Right: conversational refinement */}
        <aside className="order-3 h-[min(78vh,820px)] min-h-[520px] rounded-3xl border border-line/80 bg-paper/85 p-5 shadow-soft">
          <RefinePanel
            versions={versions}
            selected={version?.number ?? 0}
            current={current}
            job={data.job}
            autoFocus={params.get("focus") === "refine"}
            disabledReason={!versions.length ? (game.status === "concept" ? "Build this concept first, then refine it here." : "Refinement opens once the first version is ready.") : undefined}
            onSelect={setSelected}
            onRefine={refine}
          />
        </aside>
      </div>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogTitle>Save version {version?.number}</DialogTitle>
          <DialogDescription>Saving pins this version and makes it the one the library plays and exports. Every other version is kept.</DialogDescription>
          <form className="mt-5 space-y-4" onSubmit={(e) => (e.preventDefault(), void save())}>
            <Input placeholder="Optional label, e.g. Warmer palette" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={60} aria-label="Version label" />
            <Button type="submit">Save version</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="eyebrow mb-1">{label}</p>
      <OutputView value={value} />
    </div>
  );
}

function Building({ game, job }: { game: Game; job: Job | null }) {
  const working = job?.steps.find((s) => s.status === "working");
  const done = job?.steps.filter((s) => s.status === "complete").length ?? 0;
  if (game.status === "concept")
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-[28px] border border-dashed border-line bg-paper/60 p-10 text-center">
        <p className="eyebrow">Concept</p>
        <h2 className="mt-2 max-w-md font-display text-3xl text-midnight">{game.name}</h2>
        <p className="mt-3 max-w-md text-[14px] text-muted">{game.description}</p>
        {game.concept && <p className="mt-4 max-w-lg text-[13px] leading-relaxed text-ink/70">{game.concept.mechanic}</p>}
        <p className="mt-6 text-[12.5px] text-muted">Not yet implemented. It has no playable build.</p>
        <Button asChild className="mt-4"><Link href={`/create?concept=${game.id}`}><Hammer /> Build this game</Link></Button>
      </div>
    );
  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden rounded-[28px] bg-gradient-to-b from-lavender-soft via-peach-soft/70 to-coastal-soft p-10 text-center">
      <motion.div className="absolute size-72 rounded-full bg-white/40 blur-2xl" animate={{ scale: [1, 1.12, 1], opacity: [0.6, 1, 0.6] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} />
      <div className="relative">
        {game.status === "failed" ? (
          <>
            <h2 className="font-display text-3xl text-midnight">This run stopped</h2>
            <p className="mt-3 max-w-md text-[14px] text-muted">{job?.error ?? "Generation failed."} Resume it from the agent panel.</p>
          </>
        ) : (
          <>
            <p className="eyebrow">{done} of 6 agents complete</p>
            <h2 className="mt-3 font-display text-4xl font-light text-midnight">Composing your game</h2>
            <p className="mt-3 text-[14px] text-muted">{working ? `${working.agent === "qa" ? "Quality Assurance" : working.agent[0].toUpperCase() + working.agent.slice(1)}: ${working.activity ?? "working"}…` : "Waiting for the next agent…"}</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense>
      <GameStudio id={id} />
    </Suspense>
  );
}

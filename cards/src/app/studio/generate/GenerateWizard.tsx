"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, CircleDashed, Loader2, RotateCcw, Sparkles, X } from "lucide-react";
import { Art } from "@/components/art/Art";
import { RarityGem } from "@/components/cards/RarityGem";
import { TradingCard } from "@/components/cards/TradingCard";
import { btn } from "@/components/ui/styles";
import type { GenerationJob, GenerationStepRun } from "@/lib/db/types";
import { RARITIES, type Rarity } from "@/lib/content/types";
import type { AnalyticsPlan, Cards, Characters, Concept, Publishing, Review, Story, Visual, World } from "@/lib/studio/schemas";
import { ApiError, post } from "@/lib/view/client-api";

interface StepInfo {
  key: string;
  agent: string;
  title: string;
  description: string;
  needs: string[];
  ruleBased: boolean;
}

const EXAMPLES = [
  "Create a universe about tiny creatures living inside an abandoned shopping mall, with a warm, nostalgic visual style and a mystery-driven narrative.",
  "A rival family of lighthouse keepers on a chain of islands where the sea changes shape every night. Moody, gothic, romantic.",
  "Teenage couriers deliver messages between floating cities in a sky ocean. Bright, adventurous, anime-inspired, with sky-whale creatures.",
];

const latest = (job: GenerationJob, key: string): GenerationStepRun | undefined => job.steps[key]?.[job.steps[key]!.length - 1];
const approved = (job: GenerationJob, key: string) => [...(job.steps[key] ?? [])].reverse().find((r) => r.status === "succeeded" && r.approval === "approved");

export function GenerateWizard({ initialJob, steps, ai, universe, recent }: { initialJob: GenerationJob | null; steps: StepInfo[]; ai: { label: string; model: string } | null; universe: { id: string; slug: string; status: string } | null; recent: { id: string; brief: string; status: string }[] }) {
  const router = useRouter();
  const [job, setJob] = useState<GenerationJob | null>(initialJob);
  const [brief, setBrief] = useState("");
  const [mode, setMode] = useState<"ai" | "template">(ai ? "ai" : "template");
  const [active, setActive] = useState<string>(() => (initialJob ? steps.find((s) => !approved(initialJob, s.key))?.key ?? "review" : "concept"));
  const [viewVersion, setViewVersion] = useState<number | undefined>();
  const [err, setErr] = useState<string>();
  const [editing, setEditing] = useState<string>();

  const busy = !!job && Object.values(job.steps).some((runs) => runs.some((r) => r.status === "queued" || r.status === "running"));
  const refresh = useCallback(async () => {
    if (!job) return;
    const r = await fetch(`/api/studio/jobs?id=${job.id}`).then((x) => x.json() as Promise<{ job: GenerationJob }>);
    if (r.job) setJob(r.job);
  }, [job]);
  useEffect(() => {
    if (!busy) return;
    const t = setInterval(refresh, 1200);
    return () => clearInterval(t);
  }, [busy, refresh]);

  const act = async (fn: () => Promise<unknown>) => {
    setErr(undefined);
    try {
      await fn();
      await refresh();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Something went wrong");
    }
  };

  if (!job) {
    return (
      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-ember-2">AI Studio</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight">Describe your universe.</h1>
          <p className="mt-2 max-w-2xl text-bone-3">Ten agents take it from a sentence to a publishable franchise: concept, world, cast, visual identity, a season of episodes, a 24-card set, continuity and QA checks, a launch plan and a measurement plan. You approve every step.</p>
          <textarea value={brief} onChange={(e) => setBrief(e.target.value)} className="mt-6 min-h-40 w-full rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-[15px] focus:border-white/30 focus:outline-none" placeholder="A universe about…" maxLength={2000} aria-label="Universe brief" />
          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLES.map((e) => <button key={e} onClick={() => setBrief(e)} className="rounded-full border border-white/10 px-3 py-1.5 text-left text-[12px] text-bone-3 hover:border-white/30">{e.slice(0, 64)}…</button>)}
          </div>
          <fieldset className="mt-6 grid gap-3 sm:grid-cols-2">
            <label className={`cursor-pointer rounded-2xl border p-4 ${mode === "ai" ? "border-ember" : "border-white/10"} ${!ai ? "opacity-50" : ""}`}>
              <input type="radio" name="mode" className="sr-only" checked={mode === "ai"} disabled={!ai} onChange={() => setMode("ai")} />
              <p className="font-bold">AI agents</p>
              <p className="text-[12.5px] text-bone-3">{ai ? `${ai.label} · ${ai.model}. Costs are logged per step.` : "Not configured — set ANTHROPIC_API_KEY on the server."}</p>
            </label>
            <label className={`cursor-pointer rounded-2xl border p-4 ${mode === "template" ? "border-ember" : "border-white/10"}`}>
              <input type="radio" name="mode" className="sr-only" checked={mode === "template"} onChange={() => setMode("template")} />
              <p className="font-bold">Offline template</p>
              <p className="text-[12.5px] text-bone-3">Deterministic rule-based drafts from your brief. No AI, no cost — useful for testing the pipeline. Clearly labelled as template output.</p>
            </label>
          </fieldset>
          <button
            className={`${btn("primary", "lg")} mt-6`}
            onClick={() =>
              act(async () => {
                const r = await post<{ job: GenerationJob }>("/api/studio/jobs", { brief });
                setJob(r.job);
                router.replace(`/studio/generate?job=${r.job.id}`);
              })
            }
          >
            <Sparkles size={18} /> Start production
          </button>
          {err && <p className="mt-3 text-sm text-red-300" role="alert">{err}</p>}
        </div>
        <aside>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-bone-3">Recent jobs</p>
          <ul className="mt-3 space-y-2">
            {recent.map((j) => <li key={j.id}><Link href={`/studio/generate?job=${j.id}`} className="block rounded-xl bg-white/[0.03] p-3 text-sm hover:bg-white/[0.06]"><span className="line-clamp-2">{j.brief}</span><span className="text-[11px] text-bone-4">{j.status}</span></Link></li>)}
            {!recent.length && <li className="text-sm text-bone-4">None yet.</li>}
          </ul>
        </aside>
      </div>
    );
  }

  const step = steps.find((s) => s.key === active)!;
  const runs = job.steps[step.key] ?? [];
  const shown = viewVersion ? runs.find((r) => r.version === viewVersion) : runs[runs.length - 1];
  const ready = step.needs.every((n) => approved(job, n));
  const allApproved = ["concept", "world", "characters", "visual", "story", "cards", "review", "publishing"].every((k) => approved(job, k));
  const visual = approved(job, "visual")?.output as Visual | undefined;
  const concept = approved(job, "concept")?.output as Concept | undefined;
  const world = approved(job, "world")?.output as World | undefined;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-ember-2">AI Studio · job {job.id.slice(-8)}</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">{concept?.title ?? "Untitled universe"}</h1>
          <p className="mt-1 text-sm text-bone-3">{job.brief}</p>
        </div>
        <div className="text-right text-[12px] text-bone-3">
          <p>Status: <b className="text-bone">{job.status}</b></p>
          <p>Logged cost: <b className="text-bone">${job.totalCostUsd.toFixed(4)}</b></p>
          <Link href="/studio/generate" className="text-bone-2 underline">New job</Link>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
        <ol className="space-y-1" aria-label="Pipeline">
          <li className="rounded-xl px-3 py-2 text-[13px] text-bone-3"><Check size={14} className="mr-2 inline text-uncommon" />Describe your universe</li>
          {steps.map((s, i) => {
            const r = latest(job, s.key);
            const ok = approved(job, s.key);
            const icon = ok ? <Check size={14} className="text-uncommon" /> : r?.status === "running" || r?.status === "queued" ? <Loader2 size={14} className="animate-spin text-ember-2" /> : r?.status === "failed" ? <AlertTriangle size={14} className="text-red-300" /> : r?.status === "succeeded" ? <CircleDashed size={14} className="text-amber-300" /> : <CircleDashed size={14} className="text-bone-4" />;
            return (
              <li key={s.key}>
                <button onClick={() => { setActive(s.key); setViewVersion(undefined); setEditing(undefined); }} className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] font-semibold ${active === s.key ? "bg-white/10" : "hover:bg-white/5"}`} aria-current={active === s.key ? "step" : undefined}>
                  {icon}
                  <span className="flex-1">{i + 1}. {s.title}</span>
                  {s.ruleBased && <span className="text-[9px] font-bold uppercase text-bone-4">rules</span>}
                </button>
              </li>
            );
          })}
          <li className="mt-3 border-t border-white/5 pt-3">
            <div className="rounded-xl bg-white/[0.03] p-3 text-[12.5px]">
              <p className="font-bold">Review and publish</p>
              {universe ? (
                <>
                  <p className="mt-1 text-bone-3">Draft universe: <b>{universe.status}</b></p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Link className={btn("glass", "sm")} href={`/universes/${universe.slug}`}>Preview</Link>
                    <Link className={btn("glass", "sm")} href={`/studio/universes/${universe.id}`}>Edit</Link>
                    {universe.status !== "published" && (
                      <button className={btn("primary", "sm")} onClick={() => act(async () => { await post("/api/studio/universe/status", { universeId: universe.id, status: "published" }); router.refresh(); })}>Publish</button>
                    )}
                  </div>
                  {allApproved && <button className="mt-2 text-[11px] text-bone-3 underline" onClick={() => act(async () => { await post("/api/studio/job/assemble", { jobId: job.id }); router.refresh(); })}>Re-assemble from approved outputs</button>}
                </>
              ) : (
                <>
                  <p className="mt-1 text-bone-3">Approve every step to assemble a draft universe for final review.</p>
                  <button disabled={!allApproved} className={`${btn("primary", "sm")} mt-2`} onClick={() => act(async () => { await post("/api/studio/job/assemble", { jobId: job.id }); router.refresh(); })}>Assemble draft</button>
                </>
              )}
            </div>
          </li>
        </ol>

        <section className="min-w-0 rounded-2xl border border-white/10 bg-ink-2 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-bone-3">{step.agent}</p>
              <h2 className="text-xl font-extrabold">{step.title}</h2>
              <p className="text-sm text-bone-3">{step.description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                disabled={!ready || busy}
                className={btn(runs.length ? "glass" : "primary", "sm")}
                onClick={() => act(async () => { setViewVersion(undefined); await post("/api/studio/job/run", { jobId: job.id, step: step.key, mode }); })}
              >
                {runs.length ? <RotateCcw size={14} /> : <Sparkles size={14} />} {runs.length ? "Regenerate (new version)" : step.ruleBased ? "Run checks" : "Generate"}
              </button>
            </div>
          </div>
          {!ready && <p className="mt-3 text-sm text-amber-200">Approve {step.needs.filter((n) => !approved(job, n)).map((n) => steps.find((s) => s.key === n)!.title).join(", ")} first.</p>}
          {!step.ruleBased && <p className="mt-2 text-[11.5px] text-bone-4">Mode: {mode === "ai" ? (ai ? `${ai.label} (${ai.model})` : "AI unavailable") : "Offline template (not AI-written)"} · <button className="underline" onClick={() => setMode(mode === "ai" ? "template" : "ai")} disabled={!ai && mode === "template"}>switch</button></p>}
          {err && <p className="mt-3 rounded-lg bg-red-500/10 p-2 text-sm text-red-200" role="alert">{err}</p>}

          {runs.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/5 pt-4 text-[12px]">
              <span className="text-bone-4">Versions:</span>
              {runs.map((r) => (
                <button key={r.version} onClick={() => setViewVersion(r.version)} className={`rounded-full border px-2.5 py-1 ${shown?.version === r.version ? "border-bone" : "border-white/10"}`}>
                  v{r.version} {r.approval === "approved" ? "✓" : r.approval === "rejected" ? "✕" : ""} <span className="text-bone-4">{r.provider}</span>
                </button>
              ))}
            </div>
          )}

          {shown && (
            <div className="mt-4">
              <div className="flex flex-wrap items-center gap-3 text-[12px] text-bone-3">
                <span>Status: <b className="text-bone">{shown.status}</b></span>
                <span>Attempts: {shown.attempts}</span>
                {shown.model && <span>Model: {shown.model}</span>}
                {shown.inputTokens !== undefined && <span>Tokens: {shown.inputTokens} in / {shown.outputTokens} out</span>}
                <span>Cost: ${shown.costUsd.toFixed(4)}</span>
                {shown.provider === "template" && <span className="rounded-full bg-amber-400/15 px-2 py-0.5 font-bold text-amber-200">Template draft — not AI-written</span>}
                {shown.provider === "rules" && <span className="rounded-full bg-white/10 px-2 py-0.5 font-bold">Rule-based</span>}
                {shown.provider === "human-edit" && <span className="rounded-full bg-white/10 px-2 py-0.5 font-bold">Edited by a human</span>}
              </div>
              {(shown.status === "queued" || shown.status === "running") && <p className="mt-6 flex items-center gap-2 text-bone-2"><Loader2 className="animate-spin" size={16} /> {shown.error ?? `${step.agent} is working…`}</p>}
              {shown.status === "failed" && <p className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-200">Failed after {shown.attempts} attempts: {shown.error}</p>}
              {shown.status === "succeeded" && (
                <>
                  <div className="mt-4">
                    {editing !== undefined ? (
                      <div>
                        <textarea value={editing} onChange={(e) => setEditing(e.target.value)} className="min-h-[420px] w-full rounded-xl border border-white/10 bg-black/40 p-3 font-mono text-[12px]" aria-label="Edit output JSON" />
                        <div className="mt-2 flex gap-2">
                          <button className={btn("primary", "sm")} onClick={() => act(async () => { await post("/api/studio/job/edit", { jobId: job.id, step: step.key, output: JSON.parse(editing) }); setEditing(undefined); setViewVersion(undefined); })}>Save as new approved version</button>
                          <button className={btn("ghost", "sm")} onClick={() => setEditing(undefined)}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <OutputView stepKey={step.key} output={shown.output} visual={visual} concept={concept} world={world} />
                    )}
                  </div>
                  {editing === undefined && (
                    <div className="mt-5 flex flex-wrap gap-2 border-t border-white/5 pt-4">
                      <button className={btn(shown.approval === "approved" ? "glass" : "primary", "sm")} disabled={shown.approval === "approved"} onClick={() => act(() => post("/api/studio/job/approve", { jobId: job.id, step: step.key, version: shown.version, approval: "approved" }))}>
                        <Check size={14} /> {shown.approval === "approved" ? "Approved" : "Approve"}
                      </button>
                      <button className={btn("ghost", "sm")} onClick={() => act(() => post("/api/studio/job/approve", { jobId: job.id, step: step.key, version: shown.version, approval: "rejected" }))}><X size={14} /> Reject</button>
                      {!step.ruleBased && <button className={btn("ghost", "sm")} onClick={() => setEditing(JSON.stringify(shown.output, null, 2))}>Edit</button>}
                      {shown.approval === "approved" && (() => { const i = steps.findIndex((s) => s.key === step.key); const nx = steps[i + 1]; return nx ? <button className={btn("light", "sm")} onClick={() => { setActive(nx.key); setViewVersion(undefined); }}>Next: {nx.title} →</button> : null; })()}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          {!shown && ready && <p className="mt-8 text-center text-sm text-bone-3">Nothing generated yet for this step.</p>}
        </section>
      </div>
    </div>
  );
}

function OutputView({ stepKey, output, visual, concept, world }: { stepKey: string; output: unknown; visual?: Visual; concept?: Concept; world?: World }) {
  const K = "text-[10.5px] font-bold uppercase tracking-[0.16em] text-bone-4";
  switch (stepKey) {
    case "concept": {
      const c = output as Concept;
      return (
        <div className="space-y-3">
          <p className="text-3xl font-extrabold">{c.title}</p>
          <p className="text-lg text-bone-2">{c.tagline}</p>
          <p>{c.premise}</p>
          <p className="text-bone-2">{c.synopsis}</p>
          <p className="text-sm"><span className={K}>Genres</span> {c.genres.join(", ")}</p>
          <p className="text-sm"><span className={K}>Audience</span> {c.audience}</p>
          <p className="text-sm"><span className={K}>Differentiation</span> {c.differentiation}</p>
        </div>
      );
    }
    case "world": {
      const w = output as World;
      return (
        <div className="grid gap-4 md:grid-cols-2">
          {(["history", "geography", "culture", "mythology"] as const).map((k) => <div key={k}><p className={K}>{k}</p><p className="mt-1 text-sm text-bone-2">{w[k]}</p></div>)}
          <div><p className={K}>Rules</p><ul className="mt-1 list-disc pl-4 text-sm text-bone-2">{w.rules.map((r) => <li key={r}>{r}</li>)}</ul></div>
          <div><p className={K}>Conflicts</p><ul className="mt-1 list-disc pl-4 text-sm text-bone-2">{w.conflicts.map((r) => <li key={r}>{r}</li>)}</ul></div>
          <div className="md:col-span-2"><p className={K}>Factions</p><div className="mt-2 grid gap-2 sm:grid-cols-3">{w.factions.map((f) => <div key={f.id} className="rounded-xl border-l-4 bg-white/[0.03] p-3 text-sm" style={{ borderColor: f.color }}><b>{f.name}</b><p className="italic text-bone-3">{f.motto}</p><p className="text-bone-3">{f.description}</p></div>)}</div></div>
          <div className="md:col-span-2"><p className={K}>Locations</p><ul className="mt-1 text-sm text-bone-2">{w.locations.map((l) => <li key={l.id}><b>{l.name}</b> — {l.description}</li>)}</ul></div>
          <div className="md:col-span-2"><p className={K}>Secrets</p><ul className="mt-1 list-disc pl-4 text-sm text-bone-2">{w.secrets.map((r) => <li key={r}>{r}</li>)}</ul></div>
        </div>
      );
    }
    case "characters": {
      const c = output as Characters;
      return (
        <div className="grid gap-3 md:grid-cols-2">
          {c.characters.map((p) => (
            <div key={p.id} className="rounded-xl bg-white/[0.03] p-4 text-sm">
              <p className="font-bold">{p.name} <span className="font-normal text-bone-3">· {p.title} · {p.role}</span></p>
              <p className="mt-1 text-bone-2">{p.bio}</p>
              <p className="mt-1 text-[12.5px] text-bone-3"><b>Wants:</b> {p.motivation} <b>Look:</b> {p.visual} <b>Arc:</b> {p.arc}</p>
              {p.relationships.length > 0 && <p className="mt-1 text-[12px] text-bone-4">{p.relationships.map((r) => `${r.type} → ${r.to}`).join(" · ")}</p>}
            </div>
          ))}
        </div>
      );
    }
    case "visual": {
      const v = output as Visual;
      return (
        <div className="grid gap-5 md:grid-cols-[1fr_1fr]">
          <div className="nx-animate overflow-hidden rounded-2xl"><Art style={v.artStyle} palette={v.palette} seed={42} aspect="hero" sceneOnly className="w-full" /></div>
          <div className="space-y-2 text-sm">
            <p className={`ff-${v.displayFont} text-4xl`} style={{ color: v.palette.ink }}>{concept?.title}</p>
            <div className="flex gap-1.5">{[v.palette.bg, v.palette.surface, v.palette.accent, v.palette.accent2, v.palette.ink, ...v.palette.art].map((c, i) => <span key={i} className="h-7 w-7 rounded-md border border-white/10" style={{ background: c }} title={c} />)}</div>
            <p><span className={K}>Style</span> {v.artStyle} · <span className={K}>Type</span> {v.displayFont}</p>
            <p className="text-bone-2"><span className={K}>Lighting</span> {v.lighting}</p>
            <p className="text-bone-2"><span className={K}>Characters</span> {v.characterRules}</p>
            <p className="text-bone-2"><span className={K}>Frame</span> {v.frameStyle}</p>
            <p className="text-bone-2"><span className={K}>Logo</span> {v.logoDirection}</p>
            <p className="text-bone-2"><span className={K}>Key art prompt</span> {v.keyArtPrompt}</p>
          </div>
        </div>
      );
    }
    case "story": {
      const s = output as Story;
      return (
        <div>
          <p className="text-xl font-bold">{s.seasonTitle}</p>
          <p className="text-bone-2">{s.seasonSynopsis} <span className="text-bone-4">({s.plannedEpisodes} planned)</span></p>
          <div className="mt-3 space-y-2">
            {s.episodes.map((e, i) => (
              <details key={i} className="rounded-xl bg-white/[0.03] p-3">
                <summary className="cursor-pointer font-semibold">E{i + 1} · {e.title} <span className="font-normal text-bone-3">— {e.synopsis}</span></summary>
                <div className="mt-2 space-y-2 text-sm text-bone-2">{e.body.map((p, k) => <p key={k}>{p}</p>)}<p className="italic text-bone-3">{e.cliffhanger}</p></div>
              </details>
            ))}
          </div>
          {s.spinoffs.length > 0 && <p className="mt-3 text-sm text-bone-3"><span className={K}>Spin-offs</span> {s.spinoffs.join(" · ")}</p>}
        </div>
      );
    }
    case "cards": {
      const c = output as Cards;
      const counts = Object.fromEntries(RARITIES.map((r) => [r, c.cards.filter((x) => x.rarity === r).length]));
      const pal = visual?.palette;
      return (
        <div>
          <p className="font-bold">{c.setName} · {c.setCode} · {c.cards.length} cards</p>
          <p className="mt-1 flex flex-wrap gap-3 text-[12px]">{RARITIES.map((r) => <span key={r} className="flex items-center gap-1"><RarityGem rarity={r} /> {counts[r]}</span>)}</p>
          {visual && pal && (
            <div className="no-scrollbar -mx-2 mt-4 flex gap-3 overflow-x-auto px-2 pb-2">
              {c.cards.slice(0, 12).map((x, i) => (
                <div key={i} className="w-36 shrink-0">
                  <TradingCard face={{ id: `preview-${i}`, name: x.name, number: i + 1, setCode: c.setCode, setSize: c.cards.length, season: 1, kind: x.kind, rarity: x.rarity as Rarity, description: x.description, artSeed: 1000 + i * 37, factionName: world?.factions.find((f) => f.id === x.factionId)?.name, factionColor: world?.factions.find((f) => f.id === x.factionId)?.color, universe: { id: "preview", slug: "preview", title: concept?.title ?? "", style: visual.artStyle, font: visual.displayFont, palette: pal } }} />
                </div>
              ))}
            </div>
          )}
          <table className="mt-4 w-full text-[12.5px]">
            <thead className="text-left text-bone-4"><tr><th>#</th><th>Name</th><th>Kind</th><th>Rarity</th><th>Ep</th><th>Description</th></tr></thead>
            <tbody>{c.cards.map((x, i) => <tr key={i} className="border-t border-white/5"><td className="py-1 text-bone-4">{i + 1}</td><td className="font-semibold">{x.name}</td><td>{x.kind}</td><td>{x.rarity}</td><td>{x.episodeNumber}</td><td className="text-bone-3">{x.description}</td></tr>)}</tbody>
          </table>
        </div>
      );
    }
    case "review": {
      const r = output as Review;
      return (
        <div>
          <p className={`text-lg font-bold ${r.passed ? "text-uncommon" : "text-red-300"}`}>{r.passed ? "Ready for publication review" : "Blocking issues found"}</p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {r.issues.map((i, k) => <li key={k} className="flex gap-2"><span className={`w-16 shrink-0 text-[11px] font-bold uppercase ${i.severity === "error" ? "text-red-300" : i.severity === "warning" ? "text-amber-200" : "text-uncommon"}`}>{i.severity}</span><span className="text-bone-3">{i.agent}:</span> {i.message}</li>)}
          </ul>
          <p className="mt-3 text-[12px] text-bone-4">{Object.entries(r.stats).map(([k, v]) => `${k}: ${v}`).join(" · ")}</p>
        </div>
      );
    }
    case "publishing": {
      const p = output as Publishing;
      return (
        <div className="space-y-3 text-sm">
          <p><span className={K}>Teaser</span><br />{p.teaser}</p>
          <p><span className={K}>Launch copy</span><br />{p.launchCopy}</p>
          <p><span className={K}>Featured cards</span><br />{p.featuredCardNames.join(", ")}</p>
          <div><p className={K}>Release schedule</p><ul className="mt-1">{p.schedule.map((s) => <li key={s.episodeNumber}>Episode {s.episodeNumber}: launch day + {s.dayOffset}</li>)}</ul></div>
          <div><p className={K}>Campaign</p><ul className="mt-1 list-disc pl-4">{p.campaign.map((c) => <li key={c}>{c}</li>)}</ul></div>
        </div>
      );
    }
    case "analytics": {
      const a = output as AnalyticsPlan;
      return (
        <div className="text-sm">
          <ul className="space-y-2">{a.kpis.map((k) => <li key={k.name} className="rounded-xl bg-white/[0.03] p-3"><b>{k.name}</b> — {k.target}<p className="text-bone-3">{k.why}</p></li>)}</ul>
          <p className="mt-3 text-bone-3">Tracked events: {a.events.join(", ")}</p>
        </div>
      );
    }
    default:
      return <pre className="overflow-x-auto text-[12px]">{JSON.stringify(output, null, 2)}</pre>;
  }
}

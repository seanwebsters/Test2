"use client";
import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Page, PageHeader } from "@/components/shell/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AGENTS } from "@/lib/agents/meta";
import { api } from "@/lib/api";
import { useData } from "@/lib/use-data";
import { useStudio } from "@/lib/client-store";
import type { AgentId } from "@/lib/types";
import type { ReviewOutput } from "@/lib/agents/schemas";
import { usd } from "@/lib/utils";

interface Stats {
  sessions: number;
  completions: number;
  levels: { level: number; starts: number; completes: number; medianSeconds: number | null }[];
  restarts: number;
  errors: number;
}
interface Analytics {
  totals: { usd: number; calls: number; inputTokens: number; outputTokens: number; jobs: number; jobsComplete: number; jobsFailed: number; sessions: number };
  byAgent: { agent: string; calls: number; input: number; output: number; usd: number }[];
  byDay: { day: string; usd: number }[];
  perGame: { id: string; name: string; stats: Stats; dropOff: string | null }[];
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-3xl border border-line/70 bg-paper/80 p-5">
      <p className="eyebrow">{label}</p>
      <p className="mt-2 font-display text-3xl text-midnight">{value}</p>
      {note && <p className="mt-1 text-[12px] text-muted">{note}</p>}
    </div>
  );
}

export default function AnalyticsPage() {
  const toast = useStudio((s) => s.toast);
  const { data } = useData<Analytics>("/api/analytics");
  const [busy, setBusy] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Record<string, ReviewOutput>>({});
  async function analyse(id: string) {
    setBusy(id);
    try {
      const r = await api<{ review: ReviewOutput }>(`/api/games/${id}/insights`, { method: "POST" });
      setReviews((x) => ({ ...x, [id]: r.review }));
    } catch (e) {
      toast({ title: "Insights couldn't run", body: (e as Error).message, tone: "error" });
    } finally {
      setBusy(null);
    }
  }
  if (!data) return <Page><div className="skeleton h-96 rounded-3xl" /></Page>;
  const max = Math.max(0.0001, ...data.byAgent.map((a) => a.usd));
  const playedGames = data.perGame.filter((g) => g.stats.sessions > 0);
  return (
    <Page>
      <PageHeader eyebrow="Analytics" title="Usage and play" description="API usage is recorded from every model response. Play data comes only from real sessions in this studio's previews; nothing is sampled or simulated." />
      <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Estimated API spend" value={usd(data.totals.usd)} note={`${data.totals.calls} calls · ${(data.totals.inputTokens / 1000).toFixed(1)}k in / ${(data.totals.outputTokens / 1000).toFixed(1)}k out`} />
        <Stat label="Generation runs" value={String(data.totals.jobs)} note={`${data.totals.jobsComplete} complete · ${data.totals.jobsFailed} failed`} />
        <Stat label="Play sessions" value={String(data.totals.sessions)} note="Recorded from the preview player" />
        <Stat label="Games with play data" value={String(playedGames.length)} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader><CardTitle>Spend by agent</CardTitle><CardDescription>List-price estimate from recorded tokens. Check your Anthropic console for billing.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {data.byAgent.length ? data.byAgent.map((a) => (
              <div key={a.agent}>
                <div className="mb-1 flex justify-between text-[13px]"><span className="text-ink">{AGENTS[a.agent as AgentId]?.name ?? "Creative Lab"}</span><span className="text-muted">{usd(a.usd)} · {a.calls} calls</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-ivory-deep"><div className="h-full rounded-full" style={{ width: `${(a.usd / max) * 100}%`, background: AGENTS[a.agent as AgentId]?.color ?? "#B9AEDC" }} /></div>
              </div>
            )) : <p className="text-[13px] text-muted">No API calls yet.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Play sessions by game</CardTitle><CardDescription>Observed behaviour. The Insights agent can interpret it; its suggestions are labelled as hypotheses unless the numbers support them.</CardDescription></CardHeader>
          <CardContent className="space-y-5">
            {playedGames.length ? playedGames.map((g) => (
              <div key={g.id} className="rounded-2xl border border-line/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-display text-lg text-midnight">{g.name}</p>
                  <Button size="sm" variant="secondary" onClick={() => analyse(g.id)} disabled={busy === g.id}>{busy === g.id ? <Loader2 className="animate-spin" /> : <Sparkles />} Ask Insights</Button>
                </div>
                <p className="mt-1 text-[12.5px] text-muted">{g.stats.sessions} sessions · {g.stats.completions} completed the game · {g.stats.restarts} restarts{g.stats.errors ? ` · ${g.stats.errors} errors` : ""}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {g.stats.levels.map((l) => <Badge key={l.level}>L{l.level}: {l.completes}/{l.starts} finished{l.medianSeconds !== null ? ` · median ${l.medianSeconds}s` : ""}</Badge>)}
                </div>
                {g.dropOff ? <p className="mt-3 text-[12.5px] text-[#86492b]">Drop-off (observed): {g.dropOff}</p> : <p className="mt-3 text-[12px] text-muted">{g.stats.sessions < 3 ? "Too few sessions to call a drop-off point." : "No level loses more than 40% of the players who start it."}</p>}
                {reviews[g.id] && (
                  <div className="mt-4 space-y-2 border-t border-line/70 pt-4">
                    <p className="text-[13px] text-ink/85">{reviews[g.id].summary}</p>
                    {reviews[g.id].recommendations.map((r) => (
                      <div key={r.title} className="rounded-xl bg-ivory/80 p-3">
                        <div className="flex items-center justify-between gap-2"><p className="text-[13px] font-medium text-midnight">{r.title}</p><Badge tone={r.basis === "observed" ? "sage" : "neutral"}>{r.basis === "observed" ? "Observed" : "Hypothesis"}</Badge></div>
                        <p className="mt-1 text-[12.5px] text-muted">{r.detail}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )) : <p className="text-[13px] text-muted">No play sessions recorded yet. Play a game in its preview and the sessions appear here.</p>}
          </CardContent>
        </Card>
      </div>
    </Page>
  );
}

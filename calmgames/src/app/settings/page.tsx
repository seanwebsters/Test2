"use client";
import { CheckCircle2, CircleAlert, Plug } from "lucide-react";
import { Page, PageHeader } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AGENTS } from "@/lib/agents/meta";
import { api } from "@/lib/api";
import { useSettings } from "@/lib/use-settings";
import { useStudio } from "@/lib/client-store";
import { AGENT_IDS, type Settings } from "@/lib/types";
import { usd } from "@/lib/utils";

function Status({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <div className="flex gap-3">
      {ok ? <CheckCircle2 className="mt-0.5 size-5 text-[#4f7a4b]" /> : <CircleAlert className="mt-0.5 size-5 text-[#b07a3e]" />}
      <div>
        <p className="text-[14px] font-medium text-midnight">{label}</p>
        <p className="text-[13px] leading-relaxed text-muted">{detail}</p>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const toast = useStudio((s) => s.toast);
  const { data, refresh } = useSettings();
  async function update(patch: Partial<Settings>) {
    if (!data) return;
    await api("/api/settings", { method: "PUT", json: { ...data.settings, ...patch } });
    toast({ title: "Settings saved" });
    await refresh();
  }
  if (!data) return <Page><div className="skeleton h-96 rounded-3xl" /></Page>;
  const { settings, status } = data;
  return (
    <Page>
      <PageHeader eyebrow="Settings" title="Studio settings" description="Credentials are read from server environment variables only and never reach the browser." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Connections</CardTitle><CardDescription>What this studio can reach right now.</CardDescription></CardHeader>
          <CardContent className="space-y-5">
            <Status ok={status.anthropic} label={status.anthropic ? "Anthropic API connected" : "Anthropic API key missing"} detail={status.anthropic ? "Agents call Claude through the server-side proxy." : "Set ANTHROPIC_API_KEY in calmgames/.env.local and restart. Without it, generation and refinement are disabled; nothing is simulated."} />
            <Status ok={!status.storage.problem} label={status.storage.kind === "supabase" ? "Supabase storage" : "Local storage"} detail={status.storage.problem ?? (status.storage.kind === "supabase" ? "Games, versions, jobs and events are stored in Supabase." : "Everything is saved as JSON under calmgames/.data. Set DATA_BACKEND=supabase to switch.")} />
            <Status ok label="Automated QA" detail="Playwright drives headless Chromium on this machine to play every build." />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Generation</CardTitle><CardDescription>Applies to every new run.</CardDescription></CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="effort">Reasoning effort</Label>
                <Select id="effort" value={settings.effort} onChange={(e) => void update({ effort: e.target.value as Settings["effort"] })}>
                  <option value="low">Low · fastest</option>
                  <option value="medium">Medium · balanced</option>
                  <option value="high">High · most considered</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="repairs">QA repair attempts</Label>
                <Select id="repairs" value={settings.maxRepairs} onChange={(e) => void update({ maxRepairs: Number(e.target.value) })}>
                  {[0, 1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
                </Select>
              </div>
            </div>
            <label className="flex items-center justify-between gap-4 rounded-2xl bg-ivory/70 p-4">
              <span>
                <span className="block text-[14px] font-medium text-midnight">Run automated QA</span>
                <span className="block text-[12.5px] text-muted">When off, builds are marked untested.</span>
              </span>
              <input type="checkbox" className="size-5 accent-[#14213d]" checked={settings.qaEnabled} onChange={(e) => void update({ qaEnabled: e.target.checked })} />
            </label>
            <div className="rounded-2xl bg-ivory/70 p-4 text-[13px] text-muted">
              Estimated cost per new game: <b className="text-ink">{usd(data.estimate.generate.typicalUsd)}</b>, up to {usd(data.estimate.generate.worstCaseUsd)} with repairs. Hard cap per run: {usd(status.costCapUsd)} (JOB_COST_CAP_USD). Rate limit: {status.rateLimitPerMinute} runs per minute.
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Models</CardTitle><CardDescription>Claude Opus 5.5 is the default for every agent. Cheaper models trade some quality for cost.</CardDescription></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {AGENT_IDS.filter((a) => a !== "qa").map((a) => (
              <div key={a}>
                <Label htmlFor={`m-${a}`}>{AGENTS[a].name}</Label>
                <Select id={`m-${a}`} value={settings.models[a]} onChange={(e) => void update({ models: { ...settings.models, [a]: e.target.value } })}>
                  {data.models.map((m) => <option key={m.id} value={m.id}>{m.name} · ${m.input}/${m.output} per M tokens</option>)}
                </Select>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Future providers</CardTitle><CardDescription>Interfaces exist in src/lib/providers.ts. None are connected, so none are called.</CardDescription></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {data.providers.map((p) => (
              <div key={p.kind} className="rounded-2xl border border-line/70 p-4">
                <div className="flex items-center justify-between"><p className="flex items-center gap-2 text-[14px] font-medium text-midnight"><Plug className="size-4" />{p.kind}</p><Badge tone={p.connected ? "sage" : "neutral"}>{p.connected ?? "Not connected"}</Badge></div>
                <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{p.current}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Scheduled generation</CardTitle><CardDescription>Not configured.</CardDescription></CardHeader>
          <CardContent className="text-[13.5px] leading-relaxed text-muted">
            The studio does not run on its own overnight. To schedule Creative Lab runs, point a real scheduler (cron, a CI schedule or a hosted job runner) at <code className="rounded bg-ivory-deep px-1">POST /api/jobs</code> with <code className="rounded bg-ivory-deep px-1">{`{"kind":"lab","count":5}`}</code>.
            <div className="mt-3"><Button variant="secondary" size="sm" onClick={() => void refresh()}>Refresh status</Button></div>
          </CardContent>
        </Card>
      </div>
    </Page>
  );
}

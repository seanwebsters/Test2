import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/policy";
import { getDb } from "@/lib/db";
import { getAiSettings, providerStatus } from "@/lib/ai";
import { findFfmpeg } from "@/lib/audio/ffmpeg";
import { env } from "@/lib/env";
import { formatCents, relativeTime } from "@/lib/util";
import { SettingsForm } from "./SettingsForm";

export const metadata = { title: "AI settings" };

export default async function AiSettingsPage() {
  const viewer = await getViewer();
  if (!isAdmin(viewer)) redirect("/admin");
  const db = getDb();
  const [settings, costs, calls] = await Promise.all([
    getAiSettings(),
    db.list("production_costs", { orderBy: { column: "created_at", ascending: false } }),
    db.list("ai_tool_calls", { orderBy: { column: "created_at", ascending: false }, limit: 25 }),
  ]);
  const status = providerStatus();
  const ffmpeg = Boolean(findFfmpeg(env.ffmpegPath));
  const byModel = new Map<string, { provider: string; model: string; category: string; cost: number; ops: number; simulated: boolean }>();
  for (const c of costs) {
    const k = `${c.provider}:${c.model}:${c.category}`;
    const row = byModel.get(k) ?? { provider: c.provider, model: c.model, category: c.category, cost: 0, ops: 0, simulated: c.simulated };
    row.cost += c.cost_cents;
    row.ops += 1;
    byModel.set(k, row);
  }
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const monthSpend = costs.filter((c) => !c.simulated && new Date(c.created_at) >= monthStart).reduce((n, c) => n + c.cost_cents, 0);
  const Provider = ({ name, ok, note }: { name: string; ok: boolean; note: string }) => (
    <li className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.03] px-4 py-3 text-sm">
      <span><span className="font-medium">{name}</span><span className="block text-xs text-mist">{note}</span></span>
      <span className={ok ? "text-emerald-200" : "text-amber-200"}>{ok ? "Connected" : "Not configured"}</span>
    </li>
  );
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="space-y-8">
        <section aria-labelledby="prov-h">
          <h2 id="prov-h" className="headline text-3xl">Providers</h2>
          <p className="text-sm text-mist">API credentials live only in server environment variables and are never sent to the browser or stored in the database.</p>
          <ul className="mt-4 grid gap-2 md:grid-cols-2">
            <Provider name="Anthropic (writing)" ok={status.anthropic} note="ANTHROPIC_API_KEY · Claude models via the official SDK" />
            <Provider name="OpenAI (writing, images)" ok={status.openai} note="OPENAI_API_KEY · chat models & image generation" />
            <Provider name="ElevenLabs (voice)" ok={status.elevenlabs} note="ELEVENLABS_API_KEY · licensed, consented voices only" />
            <Provider name="FFmpeg (mastering)" ok={ffmpeg} note="Loudness normalisation & MP3 encoding" />
            <Provider name="Supabase (database)" ok={status.supabase} note="DATA_BACKEND=supabase · otherwise local JSON store" />
            <Provider name="Cloudflare R2 (audio storage)" ok={status.r2} note="STORAGE_BACKEND=r2 · otherwise local storage" />
            <Provider name="Trigger.dev (jobs)" ok={status.trigger} note="JOB_DRIVER=trigger · otherwise in-process runner" />
            <Provider name="PostHog (analytics)" ok={status.posthog} note="POSTHOG_KEY · otherwise local events only" />
          </ul>
          {!status.anthropic && !status.openai && (
            <p className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-300/5 px-4 py-3 text-sm text-amber-100">No writing model is configured – Storymaker and the production engine use the deterministic simulator, and every output is labelled “simulated”.</p>
          )}
        </section>
        <SettingsForm initial={settings} />
      </div>
      <aside className="space-y-6">
        <section className="card p-5" aria-labelledby="cost-h">
          <h2 id="cost-h" className="font-medium">Cost audit</h2>
          <p className="mt-1 text-sm">This month: <strong>{formatCents(monthSpend)}</strong> of {formatCents(settings.monthly_cost_limit_cents)} limit</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-lavender" style={{ width: `${Math.min(100, (monthSpend / Math.max(1, settings.monthly_cost_limit_cents)) * 100)}%` }} /></div>
          <table className="mt-4 w-full text-left text-xs">
            <thead className="text-mist"><tr><th className="py-1">Provider · model</th><th>Use</th><th className="text-right">Ops</th><th className="text-right">Cost</th></tr></thead>
            <tbody>
              {[...byModel.values()].sort((a, b) => b.cost - a.cost).map((r) => (
                <tr key={`${r.provider}${r.model}${r.category}`} className="border-t border-white/5">
                  <td className="py-1.5">{r.provider} · {r.model}{r.simulated ? <span className="text-mist"> (sim)</span> : ""}</td>
                  <td>{r.category}</td>
                  <td className="text-right">{r.ops}</td>
                  <td className="text-right">{formatCents(r.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="card p-5" aria-labelledby="audit-h">
          <h2 id="audit-h" className="font-medium">Recent AI actions</h2>
          <ul className="mt-3 space-y-2 text-xs">
            {calls.map((c) => {
              const meta = (c.output as { meta?: { model?: string; simulated?: boolean } } | null)?.meta;
              return (
                <li key={c.id} className="flex justify-between gap-2">
                  <span>{c.tool} <span className="text-mist">· {c.status}{meta?.model ? ` · ${meta.model}` : ""}{meta?.simulated ? " (sim)" : ""}</span></span>
                  <span className="shrink-0 text-mist">{relativeTime(c.created_at)}</span>
                </li>
              );
            })}
          </ul>
        </section>
        <section className="card p-5 text-xs text-mist">
          <h2 className="mb-2 text-sm font-medium text-white">Rights safeguards</h2>
          <p>Voice cloning is not available: narrators come only from the approved voice catalogue, each with a recorded consent/licence. Prompts instruct models never to use copyrighted characters, worlds or music, and the review queue screens for third-party IP before release.</p>
        </section>
      </aside>
    </div>
  );
}

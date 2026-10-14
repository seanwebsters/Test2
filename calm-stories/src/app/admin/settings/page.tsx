import { describeWriter, getAiSettings } from "@/lib/ai";
import { DEFAULT_PROMPTS } from "@/lib/ai/prompts";
import { keyStatus } from "@/lib/admin";
import { getDb } from "@/lib/db";
import { env } from "@/lib/env";
import { monthCosts } from "@/lib/jobs/engine";
import { formatCents, formatDateTime } from "@/lib/util";
import { AiSettingsForm } from "@/components/admin/AiSettingsForm";

export const metadata = { title: "AI settings" };

const KEY_LABELS: Record<string, [string, string]> = {
  anthropic: ["Anthropic", "Writing (preferred)"],
  openai: ["OpenAI", "Writing fallback, cover art"],
  elevenlabs: ["ElevenLabs", "Narration"],
  trigger: ["Trigger.dev", "Background jobs"],
  posthog: ["PostHog", "Analytics"],
  r2: ["Cloudflare R2", "Audio storage"],
  supabase: ["Supabase", "Database and auth"],
};

export default async function SettingsPage() {
  const db = getDb();
  const [settings, costs, writer, calls, users] = await Promise.all([
    getAiSettings(),
    monthCosts(),
    describeWriter(),
    db.list("ai_tool_calls", { orderBy: { column: "created_at", ascending: false }, limit: 40 }),
    db.list("users"),
  ]);
  const keys = keyStatus(env);
  const userById = new Map(users.map((u) => [u.id, u.display_name]));
  const voiceReal = settings.voice_provider !== "mock" && !!env.elevenLabsApiKey;

  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-serif text-4xl font-semibold">AI settings</h1>
        <p className="mt-1 text-sm text-mist">Providers, models, prompts and spending limits. API keys are read from server environment variables and are never shown here.</p>
      </header>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card-surface p-5 lg:col-span-2">
          <h2 className="font-serif text-2xl font-semibold">Integrations</h2>
          <p className="mt-1 text-xs text-mist">Anything not configured runs as a clearly labelled simulation. See docs/INTEGRATIONS.md.</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {Object.entries(keys).map(([k, ok]) => (
              <li key={k} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-sm">
                <span>
                  {KEY_LABELS[k]?.[0] ?? k}
                  <span className="block text-[11px] text-mist">{KEY_LABELS[k]?.[1]}</span>
                </span>
                <span className={ok ? "text-xs text-emerald-200" : "text-xs text-mist"}>{ok ? "Configured" : "Not configured"}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm">
            Writing currently uses <strong>{writer.simulated ? "the simulated writer" : `${writer.provider} · ${writer.model}`}</strong>; narration uses <strong>{voiceReal ? "ElevenLabs" : "the simulated narrator"}</strong>; jobs run <strong>{env.jobDriver === "trigger" && env.triggerSecretKey ? "on Trigger.dev" : "inline on this server"}</strong>.
          </p>
        </div>
        <div className="card-surface p-5">
          <h2 className="font-serif text-2xl font-semibold">This month</h2>
          <p className="mt-2 font-serif text-4xl font-semibold">{formatCents(costs.totalCents)}</p>
          <p className="text-xs text-mist">of {formatCents(settings.monthly_cost_limit_cents)} limit · {costs.calls} calls, {costs.simulatedCalls} simulated at no cost</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10" role="meter" aria-label="Monthly budget used" aria-valuemin={0} aria-valuemax={settings.monthly_cost_limit_cents} aria-valuenow={costs.totalCents}>
            <div className="h-full bg-lavender" style={{ width: `${Math.min(100, (costs.totalCents / Math.max(1, settings.monthly_cost_limit_cents)) * 100)}%` }} />
          </div>
          <dl className="mt-4 space-y-1 text-xs">
            {costs.byProvider.slice(0, 6).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2"><dt className="truncate text-mist">{k}</dt><dd>{formatCents(v)}</dd></div>
            ))}
            {!costs.byProvider.length && <p className="text-mist">No paid usage yet.</p>}
          </dl>
          <p className="mt-3 text-[11px] text-mist">Costs are estimates from token and character counts; check provider invoices for exact figures.</p>
        </div>
      </section>

      <AiSettingsForm settings={settings} defaults={DEFAULT_PROMPTS} />

      <section>
        <h2 className="font-serif text-2xl font-semibold">Audit trail</h2>
        <p className="mt-1 text-xs text-mist">The latest AI generations, Storymaker tool calls and admin changes.</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="text-xs text-mist">
              <tr><th className="py-2 pr-3 font-normal">When</th><th className="py-2 pr-3 font-normal">Action</th><th className="py-2 pr-3 font-normal">By</th><th className="py-2 pr-3 font-normal">Status</th><th className="py-2 font-normal">Detail</th></tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {calls.map((c) => (
                <tr key={c.id}>
                  <td className="py-2 pr-3 text-xs text-mist">{formatDateTime(c.created_at)}</td>
                  <td className="py-2 pr-3 font-mono text-xs">{c.tool}</td>
                  <td className="py-2 pr-3 text-xs">{userById.get(c.user_id) ?? "System"}</td>
                  <td className="py-2 pr-3 text-xs">{c.status.replace(/_/g, " ")}</td>
                  <td className="max-w-md truncate py-2 text-xs text-mist">{c.error ?? summarise(c.output ?? c.input)}</td>
                </tr>
              ))}
              {!calls.length && <tr><td colSpan={5} className="py-3 text-mist">Nothing recorded yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function summarise(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return s.length > 140 ? `${s.slice(0, 140)}…` : s;
}

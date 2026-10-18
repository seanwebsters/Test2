import { OddsEditor } from "@/components/studio/OddsEditor";
import { getStore } from "@/lib/db";
import { aiProvider } from "@/lib/studio/providers";

export const metadata = { title: "Economy & Settings" };

export default async function StudioSettings() {
  const state = getStore().read();
  const ai = aiProvider();
  const integrations = [
    { name: "AI agents", status: ai ? `Connected · ${ai.label} (${ai.model})` : "Not configured — offline template mode", ok: !!ai, env: "ANTHROPIC_API_KEY, ANTHROPIC_MODEL" },
    { name: "Database", status: "Local transactional JSON store (single instance)", ok: true, env: "DATA_DIR · Supabase schema in supabase/migrations" },
    { name: "Supabase", status: process.env.SUPABASE_URL ? "Credentials present — see docs/SUPABASE.md for the runtime adapter status" : "Not configured", ok: false, env: "SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY" },
    { name: "Authentication", status: "Built-in guest sessions + username/password (scrypt)", ok: true, env: "SESSION_SECRET, STUDIO_ADMIN_PASSWORD" },
    { name: "Payments", status: "Demo billing only — no real charges. Stripe provider interface is stubbed.", ok: false, env: "STRIPE_SECRET_KEY (not used yet)" },
    { name: "Asset storage", status: "Local disk under DATA_DIR/uploads", ok: true, env: "DATA_DIR" },
    { name: "Email / push", status: "Not configured — in-app notifications only", ok: false, env: "—" },
  ];
  const audit = [...state.audit].reverse().slice(0, 40);
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-extrabold tracking-tight">Economy & Settings</h1>
      <section className="rounded-2xl border border-white/10 bg-ink-2 p-5">
        <h2 className="font-bold">Integrations</h2>
        <ul className="mt-3 divide-y divide-white/5 text-sm">
          {integrations.map((i) => (
            <li key={i.name} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <span className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${i.ok ? "bg-uncommon" : "bg-amber-400"}`} /> <b>{i.name}</b></span>
              <span className="text-bone-2">{i.status}</span>
              <span className="w-full font-mono text-[11px] text-bone-4 sm:w-auto">{i.env}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-2xl border border-white/10 bg-ink-2 p-5">
        <h2 className="font-bold">Pack odds</h2>
        <p className="mb-4 mt-1 text-sm text-bone-3">Integer basis points; each table must total 10,000. The guaranteed slot can't contain Common or Uncommon. Every change is written to the audit log with the previous values. Last change {new Date(state.economy.updatedAt).toUTCString()} by {state.economy.updatedBy}.</p>
        <OddsEditor initial={{ standardSlot: state.economy.standardSlot, rarePlusSlot: state.economy.rarePlusSlot, variants: state.economy.variants }} />
      </section>
      <section className="rounded-2xl border border-white/10 bg-ink-2 p-5">
        <h2 className="font-bold">Rewards</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-bone-4">Daily track (Shards, day 1–7)</dt><dd>{state.economy.dailyTrack.join(" · ")} (+ Premium token on day 7)</dd></div>
          <div><dt className="text-bone-4">Episode completion</dt><dd>{state.economy.episodeCompletionShards} Shards + one free Episode Pack</dd></div>
          <div><dt className="text-bone-4">Duplicate Stardust</dt><dd>{Object.entries(state.economy.duplicateDust).map(([k, v]) => `${k} ${v}`).join(" · ")}</dd></div>
          <div><dt className="text-bone-4">Craft cost (Stardust)</dt><dd>{Object.entries(state.economy.craftCost).map(([k, v]) => `${k} ${v}`).join(" · ")}</dd></div>
        </dl>
      </section>
      <section className="rounded-2xl border border-white/10 bg-ink-2 p-5">
        <h2 className="font-bold">Audit log</h2>
        <ul className="mt-3 space-y-1 font-mono text-[12px]">
          {audit.map((a) => <li key={a.id} className="text-bone-3"><span className="text-bone-4">{a.at.slice(0, 19).replace("T", " ")}</span> {state.users[a.actorId]?.username ?? a.actorId} <b className="text-bone">{a.action}</b> {a.target} {a.detail && <span className="text-bone-4">{a.detail.slice(0, 120)}</span>}</li>)}
          {!audit.length && <li className="text-bone-4">No entries yet.</li>}
        </ul>
      </section>
    </div>
  );
}

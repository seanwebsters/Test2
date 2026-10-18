import { Check, Minus } from "lucide-react";
import { Pip } from "@/components/brand/Pip";
import { UpgradeButton } from "@/components/settings/UpgradeButton";
import { Pill } from "@/components/ui/primitives";
import { PLANS } from "@/lib/engine/entitlements";
import { billingMode } from "@/lib/server/env";
import { getSession } from "@/lib/server/page";

export const metadata = { title: "Direction Plus" };

const ROWS: [string, string | boolean, string | boolean][] = [
  ["Career discovery & 120+ careers", true, true],
  ["Active career paths", "1", "Up to 3"],
  ["Daily missions & streaks", true, true],
  ["AI coach messages", "10 a day", "Unlimited (fair use)"],
  ["Achievements & Passport", true, true],
  ["Interview practice mode", false, true],
  ["Portfolio feedback", false, true],
  ["Detailed skill analysis", false, true],
  ["Enhanced opportunity matching", false, true],
  ["Advanced progress insights", false, true],
];

export default async function PlusPage({ searchParams }: { searchParams: Promise<{ success?: string; cancelled?: string }> }) {
  const sp = await searchParams;
  const s = await getSession();
  const plan = s?.state.profile.plan ?? "free";
  const mode = billingMode();
  const cell = (v: string | boolean) => (v === true ? <Check className="mx-auto text-teal" size={20} /> : v === false ? <Minus className="mx-auto text-ink-3" size={18} /> : <span className="text-sm font-bold">{v}</span>);
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <section className="relative overflow-hidden rounded-5xl bg-gradient-to-br from-lavender-soft via-mint-soft to-sun-soft p-6 text-center md:p-10">
        <Pip mood="excited" size={110} className="mx-auto" />
        <h1 className="h-display mt-3 text-4xl">Direction Plus</h1>
        <p className="mx-auto mt-2 max-w-md text-ink-2">For when you&apos;re serious about building your future. Explore more paths, get unlimited coaching and practise for the real thing.</p>
        <div className="mt-4 font-display text-4xl font-extrabold">
          £6.99<span className="text-base font-bold text-ink-3"> / month</span>
        </div>
        {mode === "mock" && <Pill tone="sun" className="mt-3">Demo mode · checkout is simulated, no payment taken</Pill>}
      </section>

      {sp.success && <div className="rounded-3xl bg-teal-soft p-4 text-center font-bold">Payment received — welcome to Plus! It may take a moment to activate.</div>}
      {sp.cancelled && <div className="rounded-3xl bg-surface-2 p-4 text-center text-sm">Checkout cancelled. No worries — Direction Free is still yours.</div>}

      <div className="card overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-line">
              <th className="p-4 text-sm font-bold text-ink-3">Feature</th>
              <th className="p-4 text-center font-display font-bold">Free</th>
              <th className="bg-lavender-soft/50 p-4 text-center font-display font-bold">Plus</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map(([f, a, b]) => (
              <tr key={f} className="border-b border-line/60 last:border-0">
                <td className="p-4 text-sm font-semibold">{f}</td>
                <td className="p-4 text-center">{cell(a)}</td>
                <td className="bg-lavender-soft/30 p-4 text-center">{cell(b)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {plan === "plus" ? (
        <div className="card p-5 text-center">
          <div className="font-display text-lg font-bold">You&apos;re on Plus ✦</div>
          <p className="text-sm text-ink-2">Thanks for supporting Direction. Manage your plan in Settings.</p>
        </div>
      ) : (
        <UpgradeButton mode={mode} signedIn={!!s} />
      )}
      <p className="text-center text-xs text-ink-3">
        {PLANS.plus.name} renews monthly. Cancel any time and keep everything you&apos;ve earned. We never sell your personal or career data. Student, university and employer-sponsored plans coming soon.
      </p>
    </div>
  );
}

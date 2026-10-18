"use client";
import Link from "next/link";
import { useState } from "react";
import { useApp } from "@/components/providers/AppState";
import { useCheckout } from "@/components/billing/Checkout";
import { ChevronLeft, Crown, Loader2, Wallet } from "@/components/ui/Icon";
import { pounds, cn } from "@/lib/cn";
import { UNLOCK_COST } from "@/lib/entitlements";

const PACKS = [
  { id: "credits_10", credits: 10, pence: 199, note: "3 episodes" },
  { id: "credits_30", credits: 30, pence: 499, note: "10 episodes · popular", hot: true },
  { id: "credits_80", credits: 80, pence: 999, note: "26 episodes · best value" },
];

export function WalletView({ stripe }: { stripe: boolean }) {
  const { state, api, toast } = useApp();
  const { start, busy } = useCheckout();
  const [canceling, setCanceling] = useState(false);
  if (!state) return <div className="p-4 md:p-10"><div className="skeleton h-48" /></div>;

  const cancel = async () => {
    if (!confirm("Cancel KNOWHOW+? You'll keep access until the end of this billing period.")) return;
    setCanceling(true);
    try {
      await api("/api/billing/cancel", { body: {} });
      toast({ title: "Subscription cancelled", body: "Access continues until the period ends.", tone: "plain" });
    } finally {
      setCanceling(false);
    }
  };

  return (
    <div className="pb-safe-nav px-4 pt-[calc(20px+var(--safe-top))] md:px-10 md:pt-10">
      <Link href="/profile" className="inline-grid h-10 w-10 place-items-center rounded-full bg-white/10" aria-label="Back"><ChevronLeft size={20} /></Link>
      <h1 className="display mt-4 text-[40px] md:text-[64px]">Wallet</h1>
      {!stripe && <p className="mt-2 max-w-xl rounded-2xl bg-coral/10 px-4 py-2 text-sm text-coral">Prototype: purchases on this server are simulated. No payment provider is configured and nothing is ever charged.</p>}

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <div className="relative overflow-hidden rounded-[28px] bg-lime p-6 text-ink">
          <Wallet size={24} />
          <div className="display mt-8 text-6xl">{state.credits}</div>
          <div className="font-semibold">credits · {UNLOCK_COST} unlock one premium episode forever</div>
          <div className="mt-1 text-sm opacity-70">{state.unlocked.length} episodes unlocked</div>
        </div>
        <div className="rounded-[28px] bg-ink-2 p-6">
          <Crown size={24} className="text-lime" />
          <div className="display mt-8 text-3xl">{state.plus ? "KNOWHOW+" : "Free plan"}</div>
          {state.plus ? (
            <>
              <p className="text-sm text-cream-dim">
                {state.subscription.status === "canceled" ? `Cancelled · access until ${new Date(state.subscription.renewsAt!).toLocaleDateString()}` : `Renews ${new Date(state.subscription.renewsAt!).toLocaleDateString()} · £9.99`}
                {state.subscription.provider === "simulated" && " · simulated"}
              </p>
              {state.subscription.status === "active" && <button onClick={cancel} disabled={canceling} className="btn-ghost mt-4 h-10 px-4">{canceling && <Loader2 size={14} className="animate-spin" />} Cancel subscription</button>}
            </>
          ) : (
            <>
              <p className="text-sm text-cream-dim">{Math.round(state.todaySeconds / 60)} of {state.dailyLimitSeconds / 60} free minutes used today.</p>
              <Link href="/plus" className="btn-lime mt-4 h-10 px-4">Upgrade · £9.99/mo</Link>
            </>
          )}
        </div>
      </div>

      <h2 className="mt-10 text-2xl font-bold">Top up</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {PACKS.map((p) => (
          <button key={p.id} onClick={() => start(p.id)} disabled={Boolean(busy)} className={cn("relative rounded-[28px] border p-5 text-left transition hover:-translate-y-0.5", p.hot ? "border-lime/50 bg-lime/[0.06]" : "border-white/10 bg-ink-2")}>
            {p.hot && <span className="absolute right-4 top-4 rounded-full bg-lime px-2 py-0.5 text-[10px] font-bold uppercase text-ink">Popular</span>}
            <div className="display text-4xl">{p.credits}</div>
            <div className="text-sm text-cream-dim">credits · {p.note}</div>
            <div className="mt-4 flex items-center gap-2 font-bold">{busy === p.id && <Loader2 size={14} className="animate-spin" />}{pounds(p.pence)}</div>
          </button>
        ))}
      </div>

      <h2 className="mt-10 text-2xl font-bold">History</h2>
      <ul className="mt-3 divide-y divide-white/[0.06]">
        {state.transactions.map((t) => (
          <li key={t.id} className="flex items-center justify-between gap-4 py-3 text-sm">
            <div className="min-w-0">
              <div className="truncate font-medium">{t.description}</div>
              <div className="text-xs text-cream-mute">{new Date(t.at).toLocaleString()} · {t.provider}</div>
            </div>
            <div className="shrink-0 text-right">
              {t.credits !== 0 && <div className={cn("font-bold", t.credits > 0 ? "text-lime" : "text-cream-dim")}>{t.credits > 0 ? "+" : ""}{t.credits} cr</div>}
              {t.amountPence && <div className="text-xs text-cream-mute">{pounds(t.amountPence)}</div>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { useApp } from "@/components/providers/AppState";
import { useCheckout } from "@/components/billing/Checkout";
import { Check, Crown, Loader2, X } from "@/components/ui/Icon";
import { useCatalog } from "@/components/providers/CatalogProvider";
import { Cover } from "@/components/art/Cover";
import { DAILY_FREE_SECONDS, AI_ALLOWANCE, UNLOCK_COST } from "@/lib/entitlements";

const ROWS: [string, string | boolean, string | boolean][] = [
  ["Discover previews", true, true],
  ["Free episodes of every series", true, true],
  ["Daily listening", `${DAILY_FREE_SECONDS / 60} min`, "Unlimited"],
  ["Every episode of every series", `Unlock with ${UNLOCK_COST} credits`, true],
  ["AI personal series", `${AI_ALLOWANCE.free} / month`, `${AI_ALLOWANCE.plus} / month`],
  ["Knowledge universe", "Basic", "Advanced insights"],
  ["Offline downloads", false, "Where supported"],
];

export function PlusView({ stripe }: { stripe: boolean }) {
  const { state } = useApp();
  const { start, busy } = useCheckout();
  const { series } = useCatalog();
  const plus = state?.plus;
  return (
    <div className="pb-safe-nav relative overflow-hidden px-4 pt-[calc(24px+var(--safe-top))] md:px-10 md:pt-12">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent)]">
        <div className="flex animate-marquee gap-3">{[...series, ...series].slice(0, 30).map((s, i) => <Cover key={i} art={s.art} seed={s.slug} label={null} title={s.title} className="aspect-square w-40 shrink-0" />)}</div>
      </div>
      <div className="relative mx-auto max-w-4xl text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-lime text-ink"><Crown size={30} /></motion.div>
        <h1 className="display mt-6 text-[48px] md:text-[96px]">KNOWHOW<span className="text-lime">+</span></h1>
        <p className="editorial mt-2 text-[26px] text-cream md:text-[34px]">Binge everything. Get unreasonably interesting.</p>
        <div className="mt-8 inline-flex items-baseline gap-1 rounded-full bg-white/[0.06] px-6 py-3">
          <span className="display text-4xl">£9.99</span><span className="text-cream-dim">/month · cancel anytime</span>
        </div>
        <div className="mt-6">
          {plus ? (
            <Link href="/wallet" className="btn-lime h-14 px-8 text-base"><Check size={18} /> You&apos;re on KNOWHOW+ · Manage</Link>
          ) : (
            <button onClick={() => start("plus_monthly")} disabled={busy === "plus_monthly" || !state} className="btn-lime h-14 px-10 text-base">
              {busy === "plus_monthly" ? <Loader2 size={18} className="animate-spin" /> : <Crown size={18} />} Get KNOWHOW+
            </button>
          )}
          <p className="mt-3 text-xs text-cream-mute">{stripe ? "Secure checkout by Stripe." : "Prototype: payments are simulated on this server — nothing is charged."}</p>
        </div>
      </div>

      <div className="relative mx-auto mt-12 max-w-3xl overflow-hidden rounded-[28px] border border-white/10">
        <div className="grid grid-cols-[1.4fr_1fr_1fr] bg-ink-2 px-5 py-4 text-sm font-bold">
          <span />
          <span className="text-center text-cream-dim">Free</span>
          <span className="text-center text-lime">Plus</span>
        </div>
        {ROWS.map(([label, free, p]) => (
          <div key={label} className="grid grid-cols-[1.4fr_1fr_1fr] items-center border-t border-white/[0.06] px-5 py-3.5 text-sm">
            <span>{label}</span>
            <Cell v={free} />
            <Cell v={p} plus />
          </div>
        ))}
      </div>

      <div className="relative mx-auto mt-8 max-w-3xl rounded-[28px] bg-ink-2 p-6 text-center">
        <div className="font-bold">Not ready to subscribe?</div>
        <p className="mt-1 text-sm text-cream-dim">Buy credits and unlock individual episodes, forever. {UNLOCK_COST} credits per episode.</p>
        <Link href="/wallet" className="btn-ghost mt-4 h-11 px-6">See credit packs</Link>
      </div>
    </div>
  );
}

function Cell({ v, plus }: { v: string | boolean; plus?: boolean }) {
  if (v === true) return <span className="flex justify-center"><Check size={18} className={plus ? "text-lime" : "text-cream-dim"} /></span>;
  if (v === false) return <span className="flex justify-center"><X size={16} className="text-cream-mute" /></span>;
  return <span className={`text-center text-xs ${plus ? "font-semibold text-lime" : "text-cream-dim"}`}>{v}</span>;
}

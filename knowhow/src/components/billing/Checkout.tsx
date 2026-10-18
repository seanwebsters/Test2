"use client";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "@/components/providers/AppState";
import { CircleAlert, Loader2, X } from "@/components/ui/Icon";
import { pounds } from "@/lib/cn";

interface Pending { token: string; product: { id: string; name: string; pence: number; credits: number; kind: string; blurb: string } }
const Ctx = createContext<{ start: (product: string) => Promise<void>; busy: string | null } | null>(null);

/**
 * Starts a purchase. With Stripe configured it redirects to Stripe Checkout. Otherwise it
 * opens a clearly labelled SIMULATED checkout that needs an explicit confirmation and
 * never collects card details or moves money.
 */
export function CheckoutProvider({ children }: { children: ReactNode }) {
  const { api, toast } = useApp();
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const start = useCallback(
    async (product: string) => {
      setBusy(product);
      try {
        const res = await api<{ mode: "stripe"; url: string } | ({ mode: "simulated" } & Pending)>("/api/billing/checkout", { body: { product } });
        if (res.mode === "stripe") window.location.href = res.url;
        else setPending({ token: res.token, product: res.product });
      } catch (e) {
        toast({ title: "Checkout unavailable", body: e instanceof Error ? e.message : undefined, tone: "coral" });
      } finally {
        setBusy(null);
      }
    },
    [api, toast],
  );

  const confirm = async () => {
    if (!pending) return;
    setConfirming(true);
    try {
      await api("/api/billing/confirm", { body: { token: pending.token, confirm: true } });
      toast({ title: pending.product.kind === "subscription" ? "Welcome to KNOWHOW+" : `+${pending.product.credits} credits`, body: "Simulated purchase — no payment was taken.", tone: "lime" });
      setPending(null);
    } catch (e) {
      toast({ title: "Couldn't complete", body: e instanceof Error ? e.message : undefined, tone: "coral" });
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Ctx.Provider value={{ start, busy }}>
      {children}
      <AnimatePresence>
        {pending && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-end justify-center bg-black/75 backdrop-blur-sm md:items-center" onClick={() => setPending(null)}>
            <motion.div role="dialog" aria-modal aria-labelledby="sim-title" initial={{ y: 50 }} animate={{ y: 0 }} exit={{ y: 50 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-t-[32px] border border-white/10 bg-ink-2 p-6 pb-[calc(24px+var(--safe-bottom))] md:rounded-[32px]">
              <div className="flex items-start justify-between">
                <span className="rounded-full bg-coral/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-coral">Simulated checkout</span>
                <button onClick={() => setPending(null)} className="grid h-9 w-9 place-items-center rounded-full bg-white/10" aria-label="Cancel"><X size={16} /></button>
              </div>
              <h2 id="sim-title" className="display mt-5 text-2xl">{pending.product.name}</h2>
              <p className="mt-1 text-sm text-cream-dim">{pending.product.blurb}</p>
              <div className="mt-5 flex items-baseline justify-between rounded-2xl bg-black/30 p-4">
                <span className="text-sm text-cream-dim">Total {pending.product.kind === "subscription" && "· monthly"}</span>
                <span className="display text-3xl">{pounds(pending.product.pence)}</span>
              </div>
              <div className="mt-4 flex gap-3 rounded-2xl border border-white/10 p-3 text-xs leading-relaxed text-cream-dim">
                <CircleAlert size={16} className="mt-0.5 shrink-0 text-coral" />
                <span>This server has no payment provider configured, so this is a <strong className="text-cream">prototype simulation</strong>. No card details are collected and <strong className="text-cream">no money will be charged</strong>. Confirming grants the item to this demo account only.</span>
              </div>
              <button onClick={confirm} disabled={confirming} className="btn-lime mt-5 w-full">{confirming && <Loader2 size={16} className="animate-spin" />} Confirm simulated purchase</button>
              <button onClick={() => setPending(null)} className="mt-2 w-full py-2 text-sm text-cream-mute hover:text-cream">Cancel</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Ctx.Provider>
  );
}

export function useCheckout() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCheckout outside provider");
  return c;
}

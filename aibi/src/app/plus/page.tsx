"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Confetti from "@/components/Confetti";
import Mascot from "@/components/Mascot";
import { Button, Sheet } from "@/components/ui";
import { Crown, IconArrowLeft, IconCheck } from "@/components/icons";
import { PLAYGROUND_LIMIT, useStore } from "@/lib/store";
import { PRICES } from "@/lib/billing";

const FEATURES = [
  { icon: "🌍", title: "All 8 learning worlds", sub: "Creativity, building, automation and mastery" },
  { icon: "❤️", title: "Unlimited hearts", sub: "Learn at your pace — mistakes welcome" },
  { icon: "🧪", title: `${PLAYGROUND_LIMIT.plus} AI Playground uses a day`, sub: `Up from ${PLAYGROUND_LIMIT.free} on Free` },
  { icon: "🎓", title: "Advanced certificates", sub: "Show off skills from every world" },
  { icon: "🧑‍🏫", title: "Personalised AI coaching", sub: "Detailed feedback on every prompt" },
  { icon: "👑", title: "Exclusive mascot gear", sub: "Shades, beanie and wizard hat for Aibi" },
];

const COMPARE: [string, string, string][] = [
  ["Core daily lessons", "✓", "✓"],
  ["Daily challenges", "✓", "✓"],
  ["Worlds 1–4", "✓", "✓"],
  ["Worlds 5–8 (advanced)", "—", "✓"],
  ["Hearts", "5", "Unlimited"],
  ["AI Playground", `${PLAYGROUND_LIMIT.free}/day`, `${PLAYGROUND_LIMIT.plus}/day`],
  ["Certificates", "Worlds 1–4", "All worlds"],
  ["Mascot accessories", "Earned", "+ exclusives"],
];

export default function PlusPage() {
  const router = useRouter();
  const s = useStore();
  const [period, setPeriod] = useState<"yearly" | "monthly">("yearly");
  const [checkout, setCheckout] = useState(false);
  const [done, setDone] = useState(false);
  const [cancel, setCancel] = useState(false);

  if (done)
    return (
      <div className="relative flex min-h-[100dvh] flex-1 flex-col items-center overflow-hidden bg-gradient-to-b from-[#2E1870] via-grape-700 to-grape-500 px-6 pt-[calc(48px+var(--safe-top))] text-center text-white">
        <Confetti count={100} />
        <Mascot size={180} mood="cheer" sparkles equipped={{ head: "crown" }} />
        <h1 className="mt-3 font-display text-[34px] font-semibold">Welcome to Plus!</h1>
        <p className="mt-2 max-w-[300px] font-semibold text-white/85">Every world is unlocked, your hearts are unlimited and Aibi has some new outfits to try.</p>
        <div className="mt-auto w-full pb-[calc(28px+var(--safe-bottom))]">
          <Button variant="gold" full onClick={() => router.replace("/learn")}>Start exploring</Button>
        </div>
      </div>
    );

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-[#2E1870] via-[#43209C] to-lav-50 pb-10">
      <header className="flex items-center px-4 pt-[calc(14px+var(--safe-top))]">
        <button aria-label="Back" onClick={() => (history.length > 1 ? router.back() : router.push("/learn"))} className="grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur active:scale-95">
          <IconArrowLeft size={20} />
        </button>
      </header>
      <div className="flex flex-col items-center px-6 text-center text-white">
        <Mascot size={150} mood="cheer" sparkles equipped={{ head: "crown", face: "sunglasses" }} />
        <div className="mt-1 flex items-center gap-2 font-display text-[32px] font-semibold">
          <Crown size={30} /> AIBI Plus
        </div>
        <p className="mt-1 max-w-[300px] text-[16px] font-semibold text-white/85">Go from curious to confident — faster.</p>
      </div>

      {s.plan === "plus" ? (
        <div className="mx-5 mt-6 rounded-[28px] bg-white p-5 shadow-float">
          <div className="font-display text-xl font-semibold">You&apos;re on Plus 🎉</div>
          <p className="mt-1 text-sm text-ink-soft">
            {s.planPeriod === "yearly" ? `Yearly plan · ${PRICES.yearly.label}` : `Monthly plan · ${PRICES.monthly.label}`} · since {s.planSince ? new Date(s.planSince).toLocaleDateString("en-GB", { day: "numeric", month: "long" }) : "today"}
          </p>
          <div className="mt-4 space-y-2">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-center gap-2 text-[14px] font-semibold"><span className="text-mint-500"><IconCheck size={16} strokeWidth={3} /></span>{f.title}</div>
            ))}
          </div>
          <Button full className="mt-5" href="/learn">Back to learning</Button>
          <button onClick={() => setCancel(true)} className="mt-3 w-full text-center text-sm font-bold text-ink-mute">Cancel subscription</button>
        </div>
      ) : (
        <>
          <div className="mx-5 mt-6 rounded-[28px] bg-white p-4 shadow-float">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }} className="flex items-center gap-3 py-2">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-lav-100 text-xl">{f.icon}</span>
                <div className="flex-1">
                  <div className="font-display text-[15.5px] font-semibold leading-tight">{f.title}</div>
                  <div className="text-xs text-ink-mute">{f.sub}</div>
                </div>
                <span className="grid h-6 w-6 place-items-center rounded-full bg-mint-500 text-white"><IconCheck size={14} strokeWidth={3} /></span>
              </motion.div>
            ))}
          </div>

          <div className="mx-5 mt-5 grid grid-cols-2 gap-3">
            {(["yearly", "monthly"] as const).map((p) => {
              const on = period === p;
              const price = PRICES[p];
              return (
                <button key={p} onClick={() => setPeriod(p)} className={`relative rounded-3xl border-[3px] bg-white p-4 text-left transition-all ${on ? "border-sun-400 shadow-float" : "border-transparent shadow-card"}`}>
                  {p === "yearly" && <span className="absolute -top-3 left-3 rounded-full bg-gradient-to-r from-sun-300 to-sun-400 px-2.5 py-0.5 text-[11px] font-black text-ink">SAVE 37%</span>}
                  <div className="text-sm font-black uppercase tracking-wider text-ink-mute">{p}</div>
                  <div className="mt-1 font-display text-2xl font-semibold">{price.label}</div>
                  <div className="text-xs font-bold text-ink-mute">{p === "yearly" ? "Just £5.00 a month" : "Billed monthly"}</div>
                </button>
              );
            })}
          </div>

          <div className="mx-5 mt-5">
            <Button variant="gold" full onClick={() => setCheckout(true)}>
              Start 7-day free trial
            </Button>
            <p className="mt-2 text-center text-xs font-semibold text-white/75">Cancel any time. No commitment.</p>
          </div>

          <div className="mx-5 mt-7 overflow-hidden rounded-[24px] bg-white shadow-card">
            <div className="grid grid-cols-[1.6fr_1fr_1fr] bg-lav-100 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-ink-mute">
              <span>Feature</span><span className="text-center">Free</span><span className="text-center text-grape-600">Plus</span>
            </div>
            {COMPARE.map(([f, a, b]) => (
              <div key={f} className="grid grid-cols-[1.6fr_1fr_1fr] border-t border-grape-100 px-4 py-2.5 text-[13.5px]">
                <span className="font-semibold">{f}</span><span className="text-center text-ink-mute">{a}</span><span className="text-center font-bold text-grape-600">{b}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <Sheet open={checkout} onClose={() => setCheckout(false)} title="Confirm your trial">
        <div className="rounded-2xl bg-sun-100 p-3 text-sm font-bold text-[#7A5200]">
          Demo checkout — this prototype doesn&apos;t take payments. Confirming unlocks Plus on this device so you can explore everything.
        </div>
        <div className="mt-4 space-y-2 text-[15px]">
          <div className="flex justify-between"><span>AIBI Plus · {period}</span><span className="font-bold">{PRICES[period].label}</span></div>
          <div className="flex justify-between"><span>Due today</span><span className="font-bold text-mint-600">£0.00</span></div>
          <div className="flex justify-between text-ink-mute"><span>First charge after trial</span><span>{new Date(Date.now() + 7 * 864e5).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span></div>
        </div>
        <Button
          variant="gold"
          full
          className="mt-5"
          onClick={() => {
            s.subscribe(period);
            setCheckout(false);
            setDone(true);
          }}
        >
          <Crown size={18} /> Confirm free trial
        </Button>
      </Sheet>

      <Sheet open={cancel} onClose={() => setCancel(false)} title="Cancel Plus?">
        <div className="flex flex-col items-center text-center">
          <Mascot size={100} mood="oops" />
          <p className="mt-2 text-ink-soft">You&apos;ll keep your progress, XP and certificates — but worlds 5–8, unlimited hearts and exclusive gear will be locked again.</p>
          <div className="mt-4 flex w-full flex-col gap-3">
            <Button full onClick={() => setCancel(false)}>Keep Plus</Button>
            <Button full variant="secondary" onClick={() => { s.cancelPlan(); setCancel(false); router.replace("/profile"); }}>Cancel subscription</Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}

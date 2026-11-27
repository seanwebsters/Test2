"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getWorld } from "@/content/curriculum";
import { play } from "@/lib/feedback";
import { ACCESSORIES, ACHIEVEMENTS, LEVEL_TITLES } from "@/lib/gamification";
import { shareCard } from "@/lib/share";
import { useStore } from "@/lib/store";
import Confetti from "./Confetti";
import Mascot from "./Mascot";
import { Button } from "./ui";
import { IconShare } from "./icons";

export default function Celebrations() {
  const c = useStore((s) => s.celebrations[0]);
  const shift = useStore((s) => s.shiftCelebration);
  const name = useStore((s) => s.profile?.name);
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (c) play(c.type === "achievement" ? "unlock" : "levelup");
  }, [c]);

  let content: { badge: React.ReactNode; eyebrow: string; title: string; sub: string; share: Parameters<typeof shareCard>[0]; extra?: React.ReactNode; cta?: { label: string; go: string } } | null = null;

  if (c?.type === "level") {
    const title = LEVEL_TITLES[Math.min(c.level - 1, LEVEL_TITLES.length - 1)];
    const unlocked = ACCESSORIES.filter((a) => a.unlock.type === "level" && a.unlock.level === c.level);
    content = {
      badge: (
        <div className="relative grid h-28 w-28 place-items-center rounded-full bg-gradient-to-b from-sun-300 to-sun-500 shadow-float">
          <span className="font-display text-5xl font-bold text-white drop-shadow">{c.level}</span>
        </div>
      ),
      eyebrow: "Level up!",
      title: `You're now a ${title}`,
      sub: unlocked.length ? `New accessory unlocked: ${unlocked.map((u) => u.name).join(", ")}` : "Keep going — every lesson makes you more confident with AI.",
      share: { eyebrow: "Level up", title: `Level ${c.level}: ${title}`, subtitle: `${name ?? "I"} just levelled up on AIBI`, badge: "⭐", accent: "#F5A70B" },
    };
  } else if (c?.type === "achievement") {
    const a = ACHIEVEMENTS.find((x) => x.id === c.id);
    if (a) {
      const acc = ACCESSORIES.find((x) => x.unlock.type === "achievement" && x.unlock.id === a.id);
      content = {
        badge: (
          <div className="grid h-28 w-28 place-items-center rounded-[36px] text-6xl shadow-float" style={{ background: `linear-gradient(160deg, ${a.tint}33, ${a.tint}66)` }}>
            {a.icon}
          </div>
        ),
        eyebrow: "Badge earned",
        title: a.title,
        sub: acc ? `${a.desc}. Aibi unlocked the ${acc.name.toLowerCase()}!` : a.desc,
        share: { eyebrow: "Badge earned", title: a.title, subtitle: a.desc, badge: a.icon, accent: a.tint },
      };
    }
  } else if (c?.type === "world") {
    const w = getWorld(c.worldId);
    if (w) {
      content = {
        badge: <div className="grid h-28 w-28 place-items-center rounded-full text-6xl shadow-float" style={{ background: `linear-gradient(160deg, ${w.theme.from}, ${w.theme.to})` }}>{w.theme.icon}</div>,
        eyebrow: `World ${w.n} complete`,
        title: w.title,
        sub: "You've earned a certificate for this world. Claim it and share your new skills!",
        share: { eyebrow: `World ${w.n} complete`, title: w.title, subtitle: w.description, badge: w.theme.icon, accent: w.theme.from },
        cta: { label: "View certificate", go: `/certificate/${w.id}` },
      };
    }
  }

  useEffect(() => {
    if (c && !content) shift();
  }, [c, content, shift]);

  return (
    <AnimatePresence>
      {c && content && (
        <motion.div key={JSON.stringify(c)} className="fixed inset-0 z-[60] flex items-center justify-center px-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-gradient-to-b from-grape-700/80 to-ink/85 backdrop-blur-sm" />
          <Confetti />
          <motion.div
            className="relative z-50 w-full max-w-[380px] rounded-[36px] bg-white p-6 pt-8 text-center shadow-float"
            initial={{ scale: 0.7, y: 40 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
          >
            <div className="absolute -top-20 left-1/2 -translate-x-1/2">
              <Mascot size={110} mood="cheer" />
            </div>
            <div className="mt-10 flex justify-center">{content.badge}</div>
            <div className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-grape-500">{content.eyebrow}</div>
            <h2 className="mt-1 font-display text-[28px] font-semibold leading-tight">{content.title}</h2>
            <p className="mt-2 text-[15px] text-ink-soft">{content.sub}</p>
            <div className="mt-6 flex flex-col gap-3">
              {content.cta ? (
                <Button full onClick={() => { const go = content!.cta!.go; shift(); router.push(go); }}>{content.cta.label}</Button>
              ) : (
                <Button full onClick={shift}>Brilliant!</Button>
              )}
              <Button
                variant="secondary"
                full
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  await shareCard(content!.share, `${content!.title} on AIBI — learning AI a little every day.`);
                  setBusy(false);
                }}
              >
                <IconShare size={18} /> {busy ? "Preparing…" : "Share"}
              </Button>
              {content.cta && (
                <button onClick={shift} className="text-sm font-bold text-ink-mute">Later</button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

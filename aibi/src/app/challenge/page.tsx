"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Confetti from "@/components/Confetti";
import Mascot from "@/components/Mascot";
import { WriteStep } from "@/components/lesson/steps";
import { Button } from "@/components/ui";
import { IconClose, IconShare } from "@/components/icons";
import { todaysChallenge } from "@/content/challenges";
import { dayKey } from "@/lib/date";
import { play } from "@/lib/feedback";
import { shareCard } from "@/lib/share";
import { useStore } from "@/lib/store";

export default function ChallengePlay() {
  const router = useRouter();
  const profile = useStore((s) => s.profile);
  const already = useStore((s) => s.challenges[dayKey()]);
  const complete = useStore((s) => s.completeChallenge);
  const [ch] = useState(() => todaysChallenge(profile, dayKey()));
  const [score, setScore] = useState<number | null>(already?.score ?? null);
  const [sharing, setSharing] = useState(false);

  if (score !== null)
    return (
      <div className="relative flex min-h-[100dvh] flex-1 flex-col items-center overflow-hidden px-6 pt-[calc(40px+var(--safe-top))] text-center text-white" style={{ background: `linear-gradient(160deg, ${ch.gradient[0]}, ${ch.gradient[1]})` }}>
        <Confetti />
        <Mascot size={160} mood="cheer" sparkles />
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-2 text-6xl">{ch.emoji}</motion.div>
        <h1 className="mt-2 font-display text-[30px] font-semibold leading-tight">Challenge complete!</h1>
        <p className="mt-1 font-semibold text-white/90">{ch.title}</p>
        <div className="mt-5 flex gap-3">
          <div className="rounded-3xl bg-white/20 px-5 py-3"><div className="font-display text-3xl font-semibold">{score}</div><div className="text-xs font-black uppercase tracking-wider text-white/80">Score</div></div>
          <div className="rounded-3xl bg-white/20 px-5 py-3"><div className="font-display text-3xl font-semibold">+30</div><div className="text-xs font-black uppercase tracking-wider text-white/80">XP</div></div>
        </div>
        <p className="mt-5 max-w-[300px] text-sm font-semibold text-white/90">Now try it for real — this is a skill you can use today.</p>
        <div className="mt-auto flex w-full flex-col gap-3 pb-[calc(24px+var(--safe-bottom))] pt-8">
          <Button
            variant="white"
            full
            disabled={sharing}
            onClick={async () => {
              setSharing(true);
              await shareCard(
                { eyebrow: "Daily AI challenge", title: ch.title, subtitle: `I scored ${score}/100 on today's AIBI challenge`, badge: ch.emoji, stat: { value: `${score}`, label: "Prompt score" }, accent: ch.gradient[0] },
                `I just completed today's AIBI challenge: "${ch.title}" ${ch.emoji} Can you beat ${score}/100?`,
              );
              setSharing(false);
            }}
          >
            <IconShare size={18} /> {sharing ? "Preparing…" : "Share my result"}
          </Button>
          {ch.id === "first-website" && <Button variant="gold" full href="/playground?mode=website">Build it in the Playground</Button>}
          <Button full onClick={() => router.replace("/challenges")}>Done</Button>
        </div>
      </div>
    );

  return (
    <div className="flex min-h-[100dvh] flex-1 flex-col bg-gradient-to-b from-lav-100 to-white">
      <header className="flex items-center gap-3 px-4 pb-2 pt-[calc(14px+var(--safe-top))]">
        <button aria-label="Close" onClick={() => router.back()} className="grid h-10 w-10 place-items-center rounded-full bg-white shadow-card active:scale-95"><IconClose size={20} /></button>
        <div className="text-xs font-black uppercase tracking-widest text-ink-mute">Daily challenge {ch.emoji}</div>
      </header>
      <main className="px-5 pb-10 pt-2">
        <WriteStep
          task={ch.task}
          onDone={(sc) => {
            complete(ch.id, "", sc);
            play("complete");
            setScore(sc);
          }}
        />
      </main>
    </div>
  );
}

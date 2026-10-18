"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useApp } from "@/components/providers/AppState";
import { Check, X } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

interface Result {
  correct: boolean;
  answer: number;
  explain: string;
}

/** Optional recall question after an episode. One scored attempt; the answer is checked on the server. */
export function ChallengeCard({ episodeId, challenge, accent }: { episodeId: string; challenge: { question: string; options: string[] }; accent: string }) {
  const { api, toast } = useApp();
  const [picked, setPicked] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  const answer = async (i: number) => {
    if (busy || result) return;
    setBusy(true);
    setPicked(i);
    try {
      setResult(await api<Result>("/api/challenge", { body: { episodeId, choice: i } }));
    } catch (e) {
      setPicked(null);
      toast({ title: "Couldn't check that", body: e instanceof Error ? e.message : undefined, tone: "coral" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3">
      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-cream-dim">Quick recall · optional · +25 XP</div>
      <h3 className="display-soft mt-2 text-xl font-bold leading-snug">{challenge.question}</h3>
      <div className="mt-4 grid gap-2">
        {challenge.options.map((o, i) => {
          const isRight = result && result.answer === i;
          const isWrong = result && !result.correct && picked === i;
          return (
            <motion.button
              key={o}
              whileTap={{ scale: 0.98 }}
              animate={isWrong ? { x: [0, -8, 8, -4, 0] } : {}}
              onClick={() => answer(i)}
              disabled={Boolean(result) || busy}
              className={cn(
                "flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-[15px] font-medium transition",
                isRight ? "border-transparent text-ink" : isWrong ? "border-coral/40 bg-coral/10 text-coral" : "border-white/10 bg-black/20 enabled:hover:border-white/30",
                result && !isRight && !isWrong && "opacity-50",
              )}
              style={isRight ? { background: accent } : undefined}
            >
              {o}
              {isRight && <Check size={18} />}
              {isWrong && <X size={18} />}
            </motion.button>
          );
        })}
      </div>
      {result && (
        <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cn("mt-3 rounded-2xl p-3 text-sm leading-relaxed", result.correct ? "bg-white/10" : "bg-coral/10")}>
          <strong>{result.correct ? "Spot on. " : "Not quite — here's the thing: "}</strong>
          {result.explain}
        </motion.p>
      )}
    </div>
  );
}

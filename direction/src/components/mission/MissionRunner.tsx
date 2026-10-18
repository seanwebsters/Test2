"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, MessageCircle, ThumbsDown, ThumbsUp, Meh } from "lucide-react";
import { useCelebrate } from "@/components/app/Celebrate";
import { api } from "@/lib/client";
import { cn } from "@/lib/cn";
import type { Mission } from "@/lib/content/types";
import type { CompleteResult } from "@/lib/server/services";

export function MissionRunner({ mission, placement, challengeDay, returnTo }: { mission: Mission; placement: boolean; challengeDay: number | null; returnTo: string }) {
  const router = useRouter();
  const { celebrate, toast } = useCelebrate();
  const [checked, setChecked] = useState<boolean[]>(mission.steps.map(() => false));
  const [evidence, setEvidence] = useState("");
  const [reflection, setReflection] = useState("");
  const [rating, setRating] = useState<-1 | 0 | 1 | null>(null);
  const [busy, setBusy] = useState(false);
  const needsEvidence = mission.evidence !== "none" && (mission.quest || placement);
  const allChecked = checked.every(Boolean);
  const ready = (!needsEvidence || evidence.trim().length > 0) && (allChecked || evidence.trim().length > 0 || mission.steps.length === 0);

  const complete = async () => {
    setBusy(true);
    try {
      const r = await api<CompleteResult>("/api/missions/complete", {
        body: { missionId: mission.id, evidence: evidence || null, reflection: reflection || null, rating, placement, challengeDay },
      });
      celebrate({
        kind: r.levelCompleted ? "level" : "mission",
        title: mission.quest ? "Quest complete!" : "Mission complete!",
        subtitle: mission.title,
        xp: r.xp,
        achievements: r.newAchievements,
        level: r.levelCompleted,
        rankUp: r.rankUp,
        streak: { current: r.streak.state.current, outcome: r.streak.outcome, earnedFreeze: r.streak.earnedFreeze },
      });
      if (r.pathFinished) celebrate({ kind: "path", title: "Path complete!", subtitle: "You finished all ten levels. Legendary." });
      if (r.challengeFinished) celebrate({ kind: "challenge", title: "Challenge complete!", subtitle: "30 days of exploring. Time to choose your direction." });
      router.push(returnTo);
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
      setBusy(false);
    }
  };

  const evidenceLabel = mission.evidence === "link" ? "Paste a link to your work" : mission.evidence === "reflection" ? "What did you notice or learn?" : "What did you do? (a few sentences is perfect)";

  return (
    <div className="space-y-5">
      <section className="card p-5">
        <h2 className="eyebrow mb-3">Steps</h2>
        <ol className="space-y-2">
          {mission.steps.map((s, i) => (
            <li key={i}>
              <button
                onClick={() => setChecked((c) => c.map((v, j) => (j === i ? !v : v)))}
                className={cn("focus-ring flex w-full items-start gap-3 rounded-2xl p-2 text-left transition hover:bg-surface-2", checked[i] && "text-ink-3")}
                aria-pressed={checked[i]}
              >
                <span className={cn("mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 font-display text-xs font-bold", checked[i] ? "border-teal bg-teal text-white" : "border-line")}>
                  {checked[i] ? <Check size={14} strokeWidth={3} /> : i + 1}
                </span>
                <span className={cn(checked[i] && "line-through")}>{s}</span>
              </button>
            </li>
          ))}
        </ol>
        <Link href={`/coach?mission=${mission.id}`} className="btn-ghost btn-sm mt-4 w-full">
          <MessageCircle size={16} /> Ask Pip for help
        </Link>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="eyebrow">Wrap up</h2>
        {mission.evidence !== "none" && (
          <label className="block">
            <span className="text-sm font-bold">
              {evidenceLabel} {needsEvidence ? <span className="text-coral">*</span> : <span className="font-medium text-ink-3">(optional, +10 XP)</span>}
            </span>
            {mission.evidence === "link" ? (
              <input className="input mt-2" value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder="https://" inputMode="url" />
            ) : (
              <textarea className="input mt-2 min-h-[110px]" value={evidence} onChange={(e) => setEvidence(e.target.value)} maxLength={4000} />
            )}
            <span className="mt-1 block text-xs text-ink-3">Saved privately to your Passport. You choose what&apos;s public.</span>
          </label>
        )}
        <label className="block">
          <span className="text-sm font-bold">
            One-line reflection <span className="font-medium text-ink-3">(optional, +5 XP)</span>
          </span>
          <input className="input mt-2" value={reflection} onChange={(e) => setReflection(e.target.value)} placeholder="What surprised you?" maxLength={2000} />
        </label>
        <div>
          <span className="text-sm font-bold">How did that feel?</span>
          <p className="text-xs text-ink-3">This tunes your recommendations.</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {([
              [1, "Loved it", ThumbsUp],
              [0, "It was okay", Meh],
              [-1, "Not for me", ThumbsDown],
            ] as const).map(([v, label, Icon]) => (
              <button key={v} onClick={() => setRating(rating === v ? null : v)} aria-pressed={rating === v} className={cn("focus-ring flex flex-col items-center gap-1 rounded-2xl border-2 py-2.5 text-xs font-bold transition", rating === v ? "border-teal bg-teal-soft text-teal-deep dark:text-teal" : "border-line text-ink-2")}>
                <Icon size={20} /> {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="sticky bottom-24 z-10 lg:bottom-4">
        <button className="btn-primary w-full text-base" disabled={!ready || busy} onClick={complete}>
          {busy ? "Saving…" : placement ? "Prove it & skip ahead" : mission.quest ? "Complete quest" : "Complete mission"}
        </button>
        {!ready && <p className="mt-2 text-center text-xs font-semibold text-ink-3">{needsEvidence && !evidence.trim() ? "Add your evidence to finish this one." : "Tick off the steps (or describe what you did) to finish."}</p>}
      </div>
    </div>
  );
}

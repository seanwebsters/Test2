"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Confetti from "@/components/Confetti";
import Mascot from "@/components/Mascot";
import { Button, Progress, Sheet } from "@/components/ui";
import { Crown, Flame, Gem, Heart, IconClose, IconShare } from "@/components/icons";
import { BuildStep, ChoiceStep, CompareStep, ImageStep, JudgeStep, MultiStep, SortStep, SpotStep, TeachStep, WriteStep } from "@/components/lesson/steps";
import { getLesson, getWorld } from "@/content/curriculum";
import type { Step } from "@/content/types";
import { play } from "@/lib/feedback";
import { shareCard } from "@/lib/share";
import { activeToday, currentHearts, isWorldUnlocked, lessonState, liveStreak, nextHeartIn, useStore } from "@/lib/store";

const PRAISE = ["Brilliant!", "Nailed it!", "Spot on!", "Excellent!", "You've got it!", "Superb!", "Great thinking!"];
const ENCOURAGE = ["Not quite", "Almost!", "Good try", "Close one"];

export default function LessonRoute() {
  return (
    <Suspense fallback={null}>
      <LessonPage />
    </Suspense>
  );
}

function LessonPage() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const jump = search.get("jump") === "1";
  const router = useRouter();
  const lesson = getLesson(id);
  const s = useStore();
  const world = lesson ? getWorld(lesson.worldId) : undefined;

  // Access rules
  const blocked = useMemo(() => {
    if (!lesson || !world) return "missing";
    if (world.plus && s.plan !== "plus") return "plus";
    if (jump) return null;
    if (lessonState(s, lesson.id) === "locked") return "locked";
    return null;
    // evaluated once on entry
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson?.id]);

  useEffect(() => {
    if (blocked === "missing" || blocked === "locked") router.replace("/learn");
    if (blocked === "plus") router.replace("/plus");
  }, [blocked, router]);

  if (!lesson || !world || blocked) return null;
  return <Player key={lesson.id + (jump ? "-j" : "")} lessonId={lesson.id} jump={jump} />;
}

function Player({ lessonId, jump }: { lessonId: string; jump: boolean }) {
  const router = useRouter();
  const lesson = getLesson(lessonId)!;
  const world = getWorld(lesson.worldId)!;
  const store = useStore();
  const { recordAnswer, loseHeart, finishLesson } = store;
  const steps = lesson.steps;
  const gradable = steps.filter((x) => x.kind !== "teach").length;

  const [queue, setQueue] = useState<number[]>(() => steps.map((_, i) => i));
  const [pos, setPos] = useState(0);
  const [phase, setPhase] = useState<"play" | "feedback" | "done" | "nohearts">(() => (currentHearts(useStore.getState()) <= 0 ? "nohearts" : "play"));
  const [result, setResult] = useState<{ correct: boolean; text: string } | null>(null);
  const [firstTry, setFirstTry] = useState<Record<number, boolean>>({});
  const [canCheck, setCanCheck] = useState(false);
  const [quit, setQuit] = useState(false);
  const [combo, setCombo] = useState(0);
  const [startedAt] = useState(() => Date.now());
  const [writeScores, setWriteScores] = useState<number[]>([]);
  const [summary, setSummary] = useState<{ xp: number; accuracy: number; mins: number; streakBefore: number; firstToday: boolean } | null>(null);
  const checkRef = useRef<(() => boolean) | null>(null);
  const attempt = useRef(0);

  const stepIdx = queue[pos];
  const step: Step | undefined = steps[stepIdx];
  const progress = pos / queue.length;
  const hearts = currentHearts(store);

  const setCheck = useCallback((fn: (() => boolean) | null) => {
    checkRef.current = fn;
    setCanCheck(!!fn);
  }, []);

  const finish = useCallback(
    (scores: number[]) => {
      const correct = Object.values(firstTry).filter(Boolean).length + scores.filter((x) => x >= 50).length;
      const total = Object.keys(firstTry).length + scores.length;
      const accuracy = total ? correct / total : 1;
      const replay = !!useStore.getState().completed[lesson.id];
      let xp = jump ? 10 : replay ? 5 : lesson.xp;
      if (!replay && !jump && accuracy === 1) xp += 5;
      const st = useStore.getState();
      const streakBefore = liveStreak(st);
      const firstToday = !activeToday(st);
      finishLesson(lesson.id, { correct, total, xp, jump });
      setSummary({ xp, accuracy, mins: Math.max(1, Math.round((Date.now() - startedAt) / 60000)), streakBefore, firstToday });
      setPhase("done");
      play("complete");
    },
    [firstTry, lesson, jump, finishLesson, startedAt],
  );

  const advance = useCallback(
    (nextQueue = queue, scores = writeScores) => {
      setResult(null);
      setCanCheck(false);
      checkRef.current = null;
      attempt.current += 1;
      if (pos + 1 >= nextQueue.length) finish(scores);
      else {
        setPos((p) => p + 1);
        setPhase("play");
      }
    },
    [pos, queue, writeScores, finish],
  );

  const onCheck = () => {
    if (!checkRef.current || !step) return;
    const correct = checkRef.current();
    recordAnswer(correct);
    if (!(stepIdx in firstTry)) setFirstTry((f) => ({ ...f, [stepIdx]: correct }));
    const explain = "explain" in step ? step.explain : "";
    setResult({ correct, text: explain });
    setPhase("feedback");
    if (correct) {
      setCombo((c) => c + 1);
      play("correct");
    } else {
      setCombo(0);
      play("wrong");
      loseHeart();
    }
  };

  const onContinue = () => {
    if (!result) return advance();
    if (!result.correct) {
      const nq = [...queue, stepIdx];
      setQueue(nq);
      if (currentHearts(useStore.getState()) <= 0) {
        setResult(null);
        setPhase("nohearts");
        return;
      }
      return advance(nq);
    }
    advance();
  };

  const onWriteDone = (score: number) => {
    const scores = [...writeScores, score];
    setWriteScores(scores);
    advance(queue, scores);
  };

  // Keyboard: Enter to check/continue
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || (e.target as HTMLElement)?.tagName === "TEXTAREA" || (e.target as HTMLElement)?.tagName === "INPUT") return;
      if (phase === "feedback") onContinue();
      else if (phase === "play" && step?.kind === "teach") advance();
      else if (phase === "play" && canCheck) onCheck();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  if (phase === "done" && summary) return <Complete lessonId={lesson.id} summary={summary} jump={jump} gradable={gradable} />;

  const selfManaged = step?.kind === "write" || step?.kind === "image";
  const praise = PRAISE[(pos + attempt.current) % PRAISE.length];
  const encourage = ENCOURAGE[(pos + attempt.current) % ENCOURAGE.length];

  return (
    <div className="flex min-h-[100dvh] flex-1 flex-col bg-gradient-to-b from-lav-100 via-lav-50 to-white">
      <header className="sticky top-0 z-20 flex items-center gap-3 bg-lav-100/80 px-4 pb-3 pt-[calc(14px+var(--safe-top))] backdrop-blur-xl">
        <button aria-label="Quit lesson" onClick={() => setQuit(true)} className="grid h-10 w-10 place-items-center rounded-full bg-white text-ink shadow-card active:scale-95">
          <IconClose size={20} />
        </button>
        <div className="relative flex-1">
          <Progress value={progress} height={14} />
          <AnimatePresence>
            {combo >= 3 && (
              <motion.span key={combo} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute -bottom-5 right-0 text-[11px] font-black text-sun-500">
                🔥 {combo} in a row!
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 font-display font-semibold shadow-card">
          {store.plan === "plus" ? <><Crown size={18} /><span className="text-sun-500">∞</span></> : <><Heart size={20} /><span className="text-coral-500">{hearts}</span></>}
        </div>
      </header>

      <div className="px-5 pt-3 text-xs font-black uppercase tracking-widest text-ink-mute">
        {jump ? `Jump to World ${world.n}` : `${world.title} · ${lesson.type === "boss" ? "Challenge" : lesson.type === "checkpoint" ? "Checkpoint" : `Lesson ${lesson.index}`}`}
      </div>

      <main className="flex-1 px-5 pb-48 pt-3">
        <AnimatePresence mode="wait">
          <motion.div key={`${pos}-${stepIdx}`} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ type: "spring", stiffness: 340, damping: 32 }}>
            {step?.kind === "teach" && <TeachStep step={step} />}
            {step?.kind === "choice" && <ChoiceStep step={step} setCheck={setCheck} revealed={phase === "feedback"} sk={`${lesson.id}-${stepIdx}-${pos}`} />}
            {step?.kind === "multi" && <MultiStep step={step} setCheck={setCheck} revealed={phase === "feedback"} sk={`${lesson.id}-${stepIdx}-${pos}`} />}
            {step?.kind === "build" && <BuildStep step={step} setCheck={setCheck} revealed={phase === "feedback"} sk={`${lesson.id}-${stepIdx}-${pos}`} />}
            {step?.kind === "compare" && <CompareStep step={step} setCheck={setCheck} revealed={phase === "feedback"} />}
            {step?.kind === "judge" && <JudgeStep step={step} setCheck={setCheck} revealed={phase === "feedback"} />}
            {step?.kind === "spot" && <SpotStep step={step} setCheck={setCheck} revealed={phase === "feedback"} />}
            {step?.kind === "sort" && <SortStep step={step} setCheck={setCheck} revealed={phase === "feedback"} />}
            {step?.kind === "write" && <WriteStep task={step.task} onDone={onWriteDone} />}
            {step?.kind === "image" && <ImageStep task={step.task} onDone={onWriteDone} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* bottom action bar / feedback panel */}
      {!selfManaged && phase !== "nohearts" && (
        <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-[480px] -translate-x-1/2">
          <AnimatePresence mode="wait">
            {phase === "feedback" && result ? (
              <motion.div
                key="fb"
                initial={{ y: 120 }}
                animate={{ y: 0 }}
                exit={{ y: 120 }}
                transition={{ type: "spring", stiffness: 380, damping: 34 }}
                className={`rounded-t-[28px] px-5 pb-[calc(20px+var(--safe-bottom))] pt-5 ${result.correct ? "bg-mint-100" : "bg-coral-100"}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-xl text-white ${result.correct ? "bg-mint-500" : "bg-coral-500"}`}>{result.correct ? "✓" : "✕"}</div>
                  <div className="flex-1">
                    <div className={`font-display text-[22px] font-semibold ${result.correct ? "text-mint-600" : "text-coral-600"}`}>
                      {result.correct ? (
                        <>
                          {praise} <span className="text-[17px]">+{Math.round(lesson.xp / Math.max(1, gradable))} XP</span>
                        </>
                      ) : (
                        encourage
                      )}
                    </div>
                    <p className="mt-0.5 text-[14.5px] font-semibold text-ink-soft">{result.text}</p>
                    {!result.correct && <p className="mt-1 text-xs font-bold text-coral-600">We&apos;ll come back to this one.</p>}
                  </div>
                </div>
                <Button full variant={result.correct ? "success" : "danger"} className="mt-4" onClick={onContinue}>
                  Continue
                </Button>
              </motion.div>
            ) : (
              <motion.div key="act" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-gradient-to-t from-white via-white to-white/0 px-5 pb-[calc(20px+var(--safe-bottom))] pt-8">
                {step?.kind === "teach" ? (
                  <Button full onClick={() => advance()}>Continue</Button>
                ) : (
                  <Button full disabled={!canCheck} onClick={onCheck}>Check</Button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <Sheet open={quit} onClose={() => setQuit(false)} dismissable>
        <div className="flex flex-col items-center text-center">
          <Mascot size={110} mood="oops" />
          <h2 className="mt-2 font-display text-2xl font-semibold">Wait, don&apos;t go!</h2>
          <p className="mt-1 text-ink-soft">You&apos;re {Math.round(progress * 100)}% through. If you quit now you&apos;ll lose this lesson&apos;s progress.</p>
          <div className="mt-5 flex w-full flex-col gap-3">
            <Button full onClick={() => setQuit(false)}>Keep learning</Button>
            <Button full variant="secondary" onClick={() => router.replace("/learn")}>End lesson</Button>
          </div>
        </div>
      </Sheet>

      <NoHearts open={phase === "nohearts"} onResume={() => setPhase("play")} />
    </div>
  );
}

function NoHearts({ open, onResume }: { open: boolean; onResume: () => void }) {
  const router = useRouter();
  const s = useStore();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [open]);
  const hearts = currentHearts(s, now);
  const ms = nextHeartIn(s, now);
  return (
    <Sheet open={open} onClose={() => router.replace("/learn")} dismissable={false}>
      <div className="flex flex-col items-center text-center">
        <Mascot size={110} mood="oops" />
        <h2 className="mt-2 font-display text-2xl font-semibold">You&apos;re out of hearts</h2>
        <p className="mt-1 text-ink-soft">Mistakes are how we learn! Hearts refill one every 30 minutes.</p>
        <div className="mt-3 flex gap-1.5">{Array.from({ length: 5 }, (_, i) => <Heart key={i} size={30} full={i < hearts} />)}</div>
        <p className="mt-2 text-sm font-bold text-ink-mute">
          {hearts > 0 ? "A heart is ready!" : `Next heart in ${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`}
        </p>
        <div className="mt-5 flex w-full flex-col gap-3">
          {hearts > 0 ? (
            <Button full onClick={onResume}>Keep going</Button>
          ) : (
            <Button full variant="gold" href="/plus">
              <Crown size={18} /> Get unlimited hearts
            </Button>
          )}
          <Button full variant="secondary" onClick={() => router.replace("/playground")}>Practise in the Playground</Button>
          <button className="py-2 text-sm font-bold text-ink-mute" onClick={() => router.replace("/learn")}>End lesson</button>
        </div>
      </div>
    </Sheet>
  );
}

function Complete({ lessonId, summary, jump, gradable }: { lessonId: string; summary: { xp: number; accuracy: number; mins: number; streakBefore: number; firstToday: boolean }; jump: boolean; gradable: number }) {
  const router = useRouter();
  const lesson = getLesson(lessonId)!;
  const world = getWorld(lesson.worldId)!;
  const s = useStore();
  const streak = liveStreak(s);
  const passedJump = jump && summary.accuracy >= 0.8;
  const unlockedNow = jump && isWorldUnlocked(s, world.id);
  const [sharing, setSharing] = useState(false);
  const pct = Math.round(summary.accuracy * 100);
  const title = jump ? (passedJump ? `World ${world.n} unlocked!` : "So close!") : summary.accuracy === 1 && gradable > 0 ? "Flawless lesson!" : lesson.type === "boss" ? "Challenge complete!" : "Lesson complete!";

  return (
    <div className="relative flex min-h-[100dvh] flex-1 flex-col items-center overflow-hidden bg-gradient-to-b from-grape-500 via-grape-400 to-lav-100 px-6 pt-[calc(36px+var(--safe-top))] text-center">
      <Confetti count={jump && !passedJump ? 0 : 90} />
      <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 14 }}>
        <Mascot size={170} mood={jump && !passedJump ? "thinking" : "cheer"} sparkles />
      </motion.div>
      <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }} className="mt-2 font-display text-[34px] font-semibold leading-tight text-white">
        {title}
      </motion.h1>
      <p className="mt-1 font-semibold text-white/85">
        {jump ? (passedJump || unlockedNow ? "You tested out. Dive in whenever you're ready." : "You need 80% to jump ahead. Try the lessons in order — you'll fly through.") : lesson.title}
      </p>

      <div className="mt-6 grid w-full grid-cols-3 gap-3">
        {[
          { label: "Total XP", value: `+${summary.xp}`, icon: <Gem size={22} />, bg: "from-sun-300 to-sun-500" },
          { label: "Accuracy", value: `${pct}%`, icon: <span className="text-lg">🎯</span>, bg: "from-mint-400 to-mint-600" },
          { label: "Time", value: `${summary.mins}m`, icon: <span className="text-lg">⏱️</span>, bg: "from-sky-400 to-sky-500" },
        ].map((t, i) => (
          <motion.div key={t.label} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 + i * 0.1 }} className={`overflow-hidden rounded-3xl bg-gradient-to-b ${t.bg} p-[3px] shadow-card`}>
            <div className="py-1 text-[11px] font-black uppercase tracking-wider text-white">{t.label}</div>
            <div className="flex items-center justify-center gap-1 rounded-[22px] bg-white py-3 font-display text-xl font-semibold">
              {t.icon} {t.value}
            </div>
          </motion.div>
        ))}
      </div>

      {summary.firstToday && (
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.7, type: "spring" }} className="mt-4 flex w-full items-center gap-3 rounded-3xl bg-white p-4 text-left shadow-card">
          <motion.span animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.2, 1] }} transition={{ delay: 0.9, duration: 0.6 }}>
            <Flame size={44} />
          </motion.span>
          <div>
            <div className="font-display text-xl font-semibold">{streak} day streak!</div>
            <div className="text-sm text-ink-soft">{streak > summary.streakBefore ? "You extended your streak. See you tomorrow!" : "Your streak is safe for today."}</div>
          </div>
        </motion.div>
      )}

      <div className="mt-auto flex w-full flex-col gap-3 pb-[calc(24px+var(--safe-bottom))] pt-8">
        <Button full onClick={() => router.replace("/learn")}>Continue</Button>
        <Button
          full
          variant="white"
          disabled={sharing}
          onClick={async () => {
            setSharing(true);
            await shareCard(
              { eyebrow: `${world.title} · ${pct}% accuracy`, title: lesson.title, subtitle: "Lesson complete on AIBI", badge: world.theme.icon, stat: { value: `${streak} day${streak === 1 ? "" : "s"}`, label: "Learning streak" }, accent: world.theme.from },
              `I just completed "${lesson.title}" on AIBI 🤖✨ Learning AI a little every day.`,
            );
            setSharing(false);
          }}
        >
          <IconShare size={18} /> {sharing ? "Preparing…" : "Share my progress"}
        </Button>
      </div>
    </div>
  );
}

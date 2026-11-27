"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Mascot from "@/components/Mascot";
import Confetti from "@/components/Confetti";
import { Button, Progress } from "@/components/ui";
import { IconArrowLeft, IconArrowRight, IconCheck, IconClose, IconPencil } from "@/components/icons";
import { WORLDS } from "@/content/curriculum";
import { FAMILIARITY, GOALS, INTERESTS, LEVEL_LABEL, MINUTES, WORK, focusWorlds, goalSummary, type Familiarity, type Goal, type Interest, type Minutes, type Work } from "@/content/profile";
import { play } from "@/lib/feedback";
import { useStore } from "@/lib/store";

const QUESTION_STEPS = 6;

export default function Welcome() {
  const router = useRouter();
  const complete = useStore((s) => s.completeOnboarding);
  const onboarded = useStore((s) => s.onboarded);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [familiarity, setFamiliarity] = useState<Familiarity | null>(null);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [work, setWork] = useState<Work | null>(null);
  const [minutes, setMinutes] = useState<Minutes | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [name, setName] = useState("");
  const [returnToSummary, setReturnToSummary] = useState(false);

  useEffect(() => {
    if (onboarded) router.replace("/learn");
  }, [onboarded, router]);

  const go = (n: number) => {
    setDir(n > step ? 1 : -1);
    setStep(n);
  };
  const next = () => (returnToSummary && step < 7 ? go(8) : go(step + 1));

  const canContinue =
    (step === 1 && !!familiarity) ||
    (step === 2 && interests.length > 0) ||
    (step === 3 && !!work) ||
    (step === 4 && !!minutes) ||
    (step === 5 && !!goal) ||
    step === 6;

  const finish = () => {
    complete({
      name: name.trim() || "Learner",
      familiarity: familiarity ?? "beginner",
      interests: interests.length ? interests : ["everyday"],
      work: work ?? "office",
      minutes: minutes ?? 5,
      goal: goal ?? "confidence",
    });
    play("complete");
    router.replace("/learn");
  };

  if (step === 0) return <Intro onStart={() => go(1)} />;
  if (step === 7) return <Generating onDone={() => go(8)} />;
  if (step === 8)
    return (
      <Summary
        familiarity={familiarity ?? "beginner"}
        interests={interests}
        minutes={minutes ?? 5}
        goal={goal ?? "confidence"}
        work={work ?? "office"}
        name={name.trim()}
        onEdit={(s) => {
          setReturnToSummary(true);
          go(s);
        }}
        onBegin={finish}
      />
    );

  return (
    <div className="flex min-h-[100dvh] flex-1 flex-col bg-gradient-to-b from-lav-100 to-white">
      <header className="flex items-center gap-4 px-5 pt-[calc(16px+var(--safe-top))]">
        <button
          aria-label={step === 1 ? "Close" : "Back"}
          onClick={() => (step === 1 ? go(0) : go(step - 1))}
          className="grid h-10 w-10 place-items-center rounded-full bg-white text-ink shadow-card active:scale-95"
        >
          {step === 1 ? <IconClose size={20} /> : <IconArrowLeft size={20} />}
        </button>
        <Progress value={step / QUESTION_STEPS} />
      </header>

      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            initial={{ x: dir * 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: dir * -60, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="px-5 pb-32 pt-6"
          >
            {step === 1 && (
              <Question title="How familiar are you with AI?" mascot={<Mascot size={110} mood="thinking" />}>
                <div className="flex flex-col gap-3">
                  {FAMILIARITY.map((o) => (
                    <Option key={o.id} icon={o.icon} title={o.title} sub={o.sub} selected={familiarity === o.id} onClick={() => setFamiliarity(o.id)} />
                  ))}
                </div>
              </Question>
            )}
            {step === 2 && (
              <Question title="What do you want to use AI for?" sub="Choose a few that interest you.">
                <div className="grid grid-cols-2 gap-3">
                  {INTERESTS.map((o) => {
                    const on = interests.includes(o.id);
                    return (
                      <motion.button
                        key={o.id}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => {
                          play("tap");
                          setInterests((cur) => (on ? cur.filter((x) => x !== o.id) : [...cur, o.id]));
                        }}
                        className={`relative flex h-[132px] flex-col items-center justify-center rounded-3xl border-2 px-3 text-center transition-colors ${on ? "border-mint-400 bg-mint-100/60" : "border-white bg-white shadow-card"}`}
                      >
                        <span className="absolute right-3 top-3">
                          <Tick on={on} />
                        </span>
                        <span className="text-[40px] leading-none drop-shadow-sm">{o.icon}</span>
                        <span className="mt-2 font-display text-[15px] font-semibold leading-tight">{o.title}</span>
                        {o.sub && <span className="mt-0.5 text-[11px] font-semibold text-ink-mute">({o.sub})</span>}
                      </motion.button>
                    );
                  })}
                </div>
              </Question>
            )}
            {step === 3 && (
              <Question title="What do you do for work?" sub="This helps us tailor your lessons.">
                <div className="flex flex-col gap-3">
                  {WORK.map((o) => (
                    <Option key={o.id} icon={o.icon} title={o.title} sub={o.sub} compact selected={work === o.id} onClick={() => setWork(o.id)} />
                  ))}
                </div>
              </Question>
            )}
            {step === 4 && (
              <Question title="How much time do you want to spend learning?">
                <div className="flex flex-col gap-3">
                  {MINUTES.map((o) => (
                    <Option key={o.id} icon={o.icon} title={o.title} sub={o.sub} selected={minutes === o.id} onClick={() => setMinutes(o.id)} />
                  ))}
                </div>
              </Question>
            )}
            {step === 5 && (
              <Question title="What would you most like to achieve?" mascot={<Mascot size={96} mood="wow" />}>
                <div className="flex flex-col gap-3">
                  {GOALS.map((o) => (
                    <Option key={o.id} icon={o.icon} title={o.title} sub={o.sub} selected={goal === o.id} onClick={() => setGoal(o.id)} />
                  ))}
                </div>
              </Question>
            )}
            {step === 6 && (
              <Question title="Last thing — what should Aibi call you?" sub="We'll put it on your certificates." mascot={<Mascot size={110} mood="happy" wave />}>
                <input
                  autoFocus
                  value={name}
                  maxLength={30}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && next()}
                  placeholder="Your first name"
                  className="h-16 w-full rounded-2xl border-2 border-grape-100 bg-white px-5 text-center font-display text-2xl font-semibold outline-none placeholder:text-ink-mute/50 focus:border-grape-400"
                />
                <p className="mt-3 text-center text-sm text-ink-mute">Saved only on this device.</p>
              </Question>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="fixed bottom-0 left-1/2 w-full max-w-[480px] -translate-x-1/2 bg-gradient-to-t from-white via-white to-white/0 px-5 pb-[calc(20px+var(--safe-bottom))] pt-6">
        <Button full disabled={!canContinue} onClick={next}>
          {step === 6 && !name.trim() ? "Skip" : "Continue"}
        </Button>
      </div>
    </div>
  );
}

function Question({ title, sub, mascot, children }: { title: string; sub?: string; mascot?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="text-center font-display text-[28px] font-semibold leading-tight">{title}</h1>
      {sub && <p className="mt-2 text-center text-[15px] text-ink-soft">{sub}</p>}
      {mascot && <div className="my-3 flex justify-center">{mascot}</div>}
      <div className={mascot ? "" : "mt-6"}>{children}</div>
    </div>
  );
}

function Tick({ on }: { on: boolean }) {
  return (
    <span className={`grid h-6 w-6 place-items-center rounded-full border-2 transition-all ${on ? "border-mint-500 bg-mint-500 text-white" : "border-grape-200 bg-white"}`}>
      {on && <IconCheck size={14} strokeWidth={3.2} />}
    </span>
  );
}

function Option({ icon, title, sub, selected, onClick, compact }: { icon: string; title: string; sub?: string; selected: boolean; onClick: () => void; compact?: boolean }) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={() => {
        play("tap");
        onClick();
      }}
      className={`flex w-full items-center gap-3 rounded-2xl border-2 px-4 text-left transition-colors ${compact ? "py-3.5" : "py-3"} ${selected ? "border-mint-400 bg-mint-100/60" : "border-white bg-white shadow-card"}`}
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-lav-100 text-2xl">{icon}</span>
      <span className="flex-1">
        <span className="block font-display text-[16px] font-semibold leading-tight">{title}</span>
        {sub && <span className="block text-[13px] text-ink-mute">{sub}</span>}
      </span>
      <Tick on={selected} />
    </motion.button>
  );
}

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <div className="relative flex min-h-[100dvh] flex-1 flex-col overflow-hidden bg-gradient-to-b from-grape-500 via-grape-400 to-[#B9A3FF] px-6 pt-[calc(40px+var(--safe-top))] text-white">
      <Hills />
      <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="relative z-10 flex items-center justify-center gap-2">
        <Mascot size={40} float={false} bare />
        <span className="font-display text-3xl font-semibold">AIBI</span>
      </motion.div>
      <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="relative z-10 mt-6 text-center font-display text-[46px] font-semibold leading-[1.02]">
        Learn AI.
        <br />
        <span className="text-white/95">A little</span>
        <br />
        <span className="relative inline-block text-lav-200">
          every day.
          <svg className="absolute -bottom-3 left-2 w-[90%]" viewBox="0 0 200 16" aria-hidden>
            <path d="M4 12 Q100 0 196 8" stroke="#FFC53D" strokeWidth="6" fill="none" strokeLinecap="round" />
          </svg>
        </span>
      </motion.h1>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="relative z-10 mx-auto mt-7 max-w-[300px] text-center text-[17px] font-semibold text-white/90">
        The fun, friendly way to learn how to use AI in real life.
      </motion.p>
      <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.35, type: "spring" }} className="relative z-10 mt-4 flex flex-1 items-center justify-center">
        <Mascot size={200} wave sparkles bare />
      </motion.div>
      <div className="relative z-10 pb-[calc(28px+var(--safe-bottom))]">
        <Button variant="white" full onClick={onStart}>
          Get started <IconArrowRight size={20} />
        </Button>
        <p className="mt-3 text-center text-xs font-semibold text-white/80">Takes about a minute · no sign-up needed</p>
      </div>
    </div>
  );
}

function Hills() {
  return (
    <svg className="absolute inset-x-0 bottom-0 z-0 w-full" viewBox="0 0 400 300" preserveAspectRatio="none" style={{ height: "46%" }} aria-hidden>
      <path d="M0 120 Q80 60 160 110 T320 90 T400 100 V300 H0Z" fill="#A58BFF" opacity="0.55" />
      <path d="M0 170 Q100 110 200 160 T400 150 V300 H0Z" fill="#7FD88F" />
      <path d="M0 210 Q120 170 240 205 T400 200 V300 H0Z" fill="#5CC06F" />
      <circle cx="40" cy="160" r="18" fill="#3FA65A" />
      <circle cx="362" cy="150" r="22" fill="#3FA65A" />
    </svg>
  );
}

function Generating({ onDone }: { onDone: () => void }) {
  const items = ["Analysing your answers", "Choosing your learning worlds", "Tailoring daily challenges", "Setting your daily goal"];
  const [n, setN] = useState(0);
  useEffect(() => {
    if (n < items.length) {
      const t = setTimeout(() => setN(n + 1), 650);
      return () => clearTimeout(t);
    }
    const t = setTimeout(onDone, 600);
    return () => clearTimeout(t);
  }, [n, items.length, onDone]);
  return (
    <div className="flex min-h-[100dvh] flex-1 flex-col items-center justify-center bg-gradient-to-b from-lav-100 to-white px-8">
      <Mascot size={150} mood="thinking" sparkles />
      <h1 className="mt-4 text-center font-display text-2xl font-semibold">Building your personalised path…</h1>
      <div className="mt-6 w-full max-w-[300px] space-y-3">
        {items.map((t, i) => (
          <motion.div key={t} initial={{ opacity: 0, x: -10 }} animate={{ opacity: i <= n ? 1 : 0.35, x: 0 }} className="flex items-center gap-3">
            <span className={`grid h-6 w-6 place-items-center rounded-full ${i < n ? "bg-mint-500 text-white" : "bg-grape-100"}`}>
              {i < n ? <IconCheck size={14} strokeWidth={3} /> : i === n ? <span className="h-2.5 w-2.5 animate-ping rounded-full bg-grape-400" /> : null}
            </span>
            <span className="font-semibold text-ink-soft">{t}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function Summary({
  familiarity,
  interests,
  minutes,
  goal,
  work,
  name,
  onEdit,
  onBegin,
}: {
  familiarity: Familiarity;
  interests: Interest[];
  minutes: Minutes;
  goal: Goal;
  work: Work;
  name: string;
  onEdit: (step: number) => void;
  onBegin: () => void;
}) {
  const focus = focusWorlds({ interests, work, goal }).slice(0, 3);
  const goalText = GOALS.find((g) => g.id === goal)?.title ?? "";
  const rows = [
    { icon: "🎯", label: "Your goal", value: `${goalSummary({ interests })}`, extra: goalText, step: 2 },
    { icon: "⏱️", label: "Your pace", value: MINUTES.find((m) => m.id === minutes)?.title ?? "", step: 4 },
    { icon: "📚", label: "Starting level", value: LEVEL_LABEL[familiarity], step: 1 },
  ];
  return (
    <div className="relative flex min-h-[100dvh] flex-1 flex-col overflow-hidden bg-gradient-to-b from-lav-100 via-lav-50 to-[#9EE0A8]">
      <Confetti count={50} />
      <div className="px-5 pt-[calc(28px+var(--safe-top))] text-center">
        <h1 className="font-display text-[30px] font-semibold leading-tight">
          {name ? `${name}, here's your` : "Your personalised"}
          <br />
          {name ? "personalised AI path" : "AI learning path"}
        </h1>
      </div>
      <div className="relative mt-2 flex justify-center">
        <svg className="absolute bottom-0 w-full" viewBox="0 0 400 120" preserveAspectRatio="none" style={{ height: 110 }} aria-hidden>
          <path d="M0 60 Q100 10 200 50 T400 40 V120 H0Z" fill="#7FD88F" />
          <path d="M150 120 Q190 80 230 70 Q280 60 300 40" stroke="#fff" strokeWidth="16" fill="none" strokeLinecap="round" opacity="0.8" />
        </svg>
        <Mascot size={150} mood="cheer" sparkles />
      </div>
      <div className="relative z-10 mx-5 rounded-3xl bg-white p-2 shadow-float">
        {rows.map((r, i) => (
          <div key={r.label} className={`flex items-center gap-3 px-3 py-3 ${i ? "border-t border-grape-100" : ""}`}>
            <span className="grid h-11 w-11 place-items-center rounded-full bg-lav-100 text-2xl">{r.icon}</span>
            <div className="flex-1">
              <div className="font-display text-[16px] font-semibold">{r.label}</div>
              <div className="text-[13px] text-ink-mute">{r.value}</div>
            </div>
            <button aria-label={`Edit ${r.label}`} onClick={() => onEdit(r.step)} className="grid h-9 w-9 place-items-center rounded-full text-grape-500 active:bg-lav-100">
              <IconPencil size={18} />
            </button>
          </div>
        ))}
      </div>
      {focus.length > 0 && (
        <div className="relative z-10 mx-5 mt-4">
          <div className="mb-2 text-center text-xs font-black uppercase tracking-widest text-ink-soft">Your path highlights</div>
          <div className="flex flex-wrap justify-center gap-2">
            {focus.map((id) => {
              const w = WORLDS.find((x) => x.id === id)!;
              return (
                <span key={id} className="rounded-full bg-white/90 px-3 py-1.5 text-sm font-bold shadow-card">
                  {w.theme.icon} {w.title}
                </span>
              );
            })}
          </div>
        </div>
      )}
      <div className="relative z-10 mt-auto px-5 pb-[calc(24px+var(--safe-bottom))] pt-6">
        <Button full onClick={onBegin} className="shadow-glow">
          Let&apos;s begin! <IconArrowRight size={20} />
        </Button>
      </div>
    </div>
  );
}

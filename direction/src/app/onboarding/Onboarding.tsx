"use client";

import { AnimatePresence, motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Heart, Minus, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useCelebrate } from "@/components/app/Celebrate";
import { Pip, type PipMood } from "@/components/brand/Pip";
import { CareerArt } from "@/components/career/CareerArt";
import { Sheet } from "@/components/ui/primitives";
import { api, ApiError } from "@/lib/client";
import { cn } from "@/lib/cn";
import { CAREERS, getCareer } from "@/lib/content/careers";
import { COUNTRIES, INTERESTS, LIFESTYLES, STATUSES, SUBJECTS, SWIPE_CARDS, THIS_OR_THAT, TIME_OPTIONS, VALUE_LABELS } from "@/lib/content/onboarding";
import { SKILLS } from "@/lib/content/skills";
import type { ValueKey } from "@/lib/content/types";
import { emptyAnswers, rankCareers } from "@/lib/engine/matching";
import type { MatchResult, OnboardingAnswers } from "@/lib/engine/model";

const STORAGE_KEY = "direction-onboarding-v1";
const STEPS = ["intro", "you", "swipe", "excites", "thisorthat", "subjects", "social", "lifestyle", "values", "skills", "considered", "where", "results"] as const;
type Step = (typeof STEPS)[number];

const PIP_LINES: Partial<Record<Step, { mood: PipMood; line: string }>> = {
  you: { mood: "wave", line: "First things first — what should I call you?" },
  swipe: { mood: "excited", line: "Quick game! Swipe right on anything that sounds fun." },
  excites: { mood: "curious", line: "What genuinely gets you excited? Pick as many as you like." },
  thisorthat: { mood: "thinking", line: "This or that? Go with your gut." },
  subjects: { mood: "happy", line: "Which subjects or activities come naturally to you?" },
  social: { mood: "curious", line: "Solo flyer or team player?" },
  lifestyle: { mood: "happy", line: "Picture yourself in ten years. Which life looks best?" },
  values: { mood: "thinking", line: "You've got 10 points. Spend them on what matters most to you." },
  skills: { mood: "proud", line: "What are you already good at? It all counts." },
  considered: { mood: "curious", line: "Any careers you've already thought about? (Totally optional.)" },
  where: { mood: "happy", line: "Last one! Where are you, and how much time do you have each day?" },
};

export function Onboarding({ signedIn, initial }: { signedIn: boolean; initial: OnboardingAnswers | null }) {
  const router = useRouter();
  const { toast, celebrate } = useCelebrate();
  const [step, setStep] = useState<Step>("intro");
  const [a, setA] = useState<OnboardingAnswers>(initial ?? emptyAnswers());
  const [saveOpen, setSaveOpen] = useState<null | { kind: "commit"; slug: string } | { kind: "challenge" } | { kind: "explore" }>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (initial) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setA({ ...emptyAnswers(), ...(JSON.parse(raw) as OnboardingAnswers) });
    } catch {}
  }, [initial]);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(a));
    } catch {}
  }, [a]);

  const idx = STEPS.indexOf(step);
  const go = (d: 1 | -1) => setStep(STEPS[Math.max(0, Math.min(STEPS.length - 1, idx + d))]!);
  const set = <K extends keyof OnboardingAnswers>(k: K, v: OnboardingAnswers[K]) => setA((x) => ({ ...x, [k]: v }));
  const toggle = (k: "interests" | "subjects" | "skills" | "considered", id: string) =>
    setA((x) => ({ ...x, [k]: x[k].includes(id) ? x[k].filter((i) => i !== id) : [...x[k], id] }));

  const matches = useMemo(() => (step === "results" ? rankCareers(a) : []), [a, step]);

  const canNext: Record<Step, boolean> = {
    intro: true,
    you: a.name.trim().length > 0,
    swipe: Object.keys(a.swipes).length >= SWIPE_CARDS.length,
    excites: a.interests.length >= 2,
    thisorthat: Object.keys(a.thisOrThat).length >= THIS_OR_THAT.length,
    subjects: true,
    social: true,
    lifestyle: !!a.lifestyle,
    values: Object.values(a.values).reduce((n, v) => n + v, 0) === 10,
    skills: true,
    considered: true,
    where: !!a.country,
    results: true,
  };

  async function finishSignedIn(choice: NonNullable<typeof saveOpen>) {
    setBusy(true);
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      await api("/api/onboarding", { body: { answers: a, timezone: tz } });
      if (choice.kind === "commit") await api("/api/paths", { body: { careerSlug: choice.slug } });
      if (choice.kind === "challenge") await api("/api/challenge", { body: { action: "start", careers: matches.slice(0, 3).map((m) => m.careerSlug) } });
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
      celebrate({ kind: "path", title: choice.kind === "commit" ? `Your path: ${getCareer(choice.slug)?.title}` : choice.kind === "challenge" ? "30-Day Discovery Challenge" : "Direction found!", subtitle: "Your first missions are ready." });
      router.push(choice.kind === "commit" ? "/path" : "/home");
      router.refresh();
    } catch (e) {
      if (e instanceof ApiError && e.code === "path_limit") {
        toast("You already have an active path. Switch from My Path — your progress is kept.", "error");
        router.push("/path");
      } else toast((e as Error).message, "error");
      setBusy(false);
    }
  }

  const choose = (choice: NonNullable<typeof saveOpen>) => (signedIn ? finishSignedIn(choice) : setSaveOpen(choice));
  const pip = PIP_LINES[step];

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-4 pb-8 pt-4">
      {step !== "intro" && step !== "results" && (
        <div className="mb-4 flex items-center gap-3">
          <button className="focus-ring rounded-full p-2 text-ink-3 hover:bg-surface-2" onClick={() => go(-1)} aria-label="Back">
            <ArrowLeft size={20} />
          </button>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-valuenow={idx} aria-valuemax={STEPS.length - 2} aria-label="Onboarding progress">
            <motion.div className="h-full rounded-full bg-teal" animate={{ width: `${(idx / (STEPS.length - 2)) * 100}%` }} />
          </div>
          <Link href="/" className="focus-ring rounded-full p-2 text-ink-3 hover:bg-surface-2" aria-label="Exit onboarding">
            <X size={20} />
          </Link>
        </div>
      )}

      {pip && (
        <div className="mb-5 flex items-end gap-3">
          <Pip mood={pip.mood} size={64} />
          <motion.div key={step} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-3xl rounded-bl-md bg-surface px-4 py-3 font-display text-[17px] font-bold leading-snug shadow-card">
            {pip.line}
          </motion.div>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div key={step} className="flex flex-1 flex-col" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22 }}>
          {step === "intro" && (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <Pip mood="wave" size={170} />
              <h1 className="h-display mt-6 text-4xl text-balance">Not sure what you want to do?</h1>
              <p className="mt-3 text-lg text-ink-2">That&apos;s okay. Let&apos;s figure it out together.</p>
              <p className="mt-2 text-sm text-ink-3">About 5 minutes · no right or wrong answers</p>
              <button className="btn-primary mt-8 w-full max-w-xs text-base" onClick={() => go(1)}>
                Let&apos;s go <ArrowRight size={18} />
              </button>
              {!signedIn && (
                <Link href="/signin" className="mt-4 text-sm font-semibold text-ink-3 underline">
                  I already have an account
                </Link>
              )}
            </div>
          )}

          {step === "you" && (
            <div className="space-y-5">
              <label className="block">
                <span className="eyebrow">Your first name</span>
                <input className="input mt-2 text-lg" value={a.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Sam" autoFocus maxLength={40} autoComplete="given-name" />
              </label>
              <div>
                <span className="eyebrow">Right now I&apos;m…</span>
                <div className="mt-2 grid gap-2">
                  {STATUSES.map((s) => (
                    <Choice key={s.id} selected={a.status === s.id} onClick={() => set("status", s.id)}>
                      {s.label}
                    </Choice>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === "swipe" && <SwipeDeck swipes={a.swipes} onSwipe={(id, r) => set("swipes", { ...a.swipes, [id]: r })} onUndo={(id) => { const s = { ...a.swipes }; delete s[id]; set("swipes", s); }} />}

          {step === "excites" && (
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((i) => (
                <ChipToggle key={i.id} selected={a.interests.includes(i.id)} onClick={() => toggle("interests", i.id)}>
                  <span aria-hidden="true">{i.emoji}</span> {i.label}
                </ChipToggle>
              ))}
            </div>
          )}

          {step === "thisorthat" && <ThisOrThat picks={a.thisOrThat} onPick={(id, side) => set("thisOrThat", { ...a.thisOrThat, [id]: side })} />}

          {step === "subjects" && (
            <div className="flex flex-wrap gap-2">
              {SUBJECTS.map((s) => (
                <ChipToggle key={s.id} selected={a.subjects.includes(s.id)} onClick={() => toggle("subjects", s.id)}>
                  {s.label}
                </ChipToggle>
              ))}
            </div>
          )}

          {step === "social" && (
            <div className="card p-6">
              <div className="flex justify-between text-4xl" aria-hidden="true">
                <span>🎧</span>
                <span>🤝</span>
                <span>🎉</span>
              </div>
              <input type="range" min={0} max={100} value={Math.round(a.social * 100)} onChange={(e) => set("social", Number(e.target.value) / 100)} className="mt-5 w-full accent-[rgb(var(--teal))]" aria-label="Independent to collaborative" />
              <div className="mt-2 flex justify-between text-sm font-semibold text-ink-2">
                <span>Mostly on my own</span>
                <span>Always with people</span>
              </div>
              <p className="mt-5 text-center font-display text-lg font-bold">
                {a.social < 0.34 ? "Independent focus is your superpower." : a.social > 0.66 ? "You thrive around people." : "A healthy mix of both."}
              </p>
            </div>
          )}

          {step === "lifestyle" && (
            <div className="grid gap-3">
              {LIFESTYLES.map((l) => (
                <Choice key={l.id} selected={a.lifestyle === l.id} onClick={() => set("lifestyle", l.id)}>
                  <span className="text-3xl" aria-hidden="true">{l.emoji}</span>
                  <span>
                    <span className="block font-display text-lg font-bold">{l.title}</span>
                    <span className="block text-sm font-medium text-ink-2">{l.detail}</span>
                  </span>
                </Choice>
              ))}
            </div>
          )}

          {step === "values" && <ValuePoints values={a.values} onChange={(v) => set("values", v)} />}

          {step === "skills" && (
            <div className="space-y-4">
              {(["creative", "technical", "people", "business", "self"] as const).map((fam) => (
                <div key={fam}>
                  <div className="eyebrow mb-2">{fam}</div>
                  <div className="flex flex-wrap gap-2">
                    {SKILLS.filter((s) => s.family === fam && s.id !== "clinical-knowledge").map((s) => (
                      <ChipToggle key={s.id} selected={a.skills.includes(s.id)} onClick={() => toggle("skills", s.id)}>
                        {s.name}
                      </ChipToggle>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === "considered" && <Considered selected={a.considered} onToggle={(s) => toggle("considered", s)} />}

          {step === "where" && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="eyebrow">Country</span>
                  <select className="input mt-2" value={a.country} onChange={(e) => set("country", e.target.value)}>
                    {COUNTRIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="eyebrow">Town or city</span>
                  <input className="input mt-2" value={a.city} onChange={(e) => set("city", e.target.value)} placeholder="Optional" maxLength={60} autoComplete="address-level2" />
                </label>
              </div>
              <div>
                <span className="eyebrow">Time I can give each day</span>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {TIME_OPTIONS.map((t) => (
                    <Choice key={t.minutes} selected={a.minutesPerDay === t.minutes} onClick={() => set("minutesPerDay", t.minutes)}>
                      <span>
                        <span className="block font-display text-lg font-bold">{t.label}</span>
                        <span className="block text-xs font-medium text-ink-2">{t.detail}</span>
                      </span>
                    </Choice>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === "results" && <Results name={a.name} matches={matches} busy={busy} onChoose={choose} onRestart={() => setStep("swipe")} />}
        </motion.div>
      </AnimatePresence>

      {step !== "intro" && step !== "results" && step !== "thisorthat" && (
        <div className="sticky bottom-0 mt-6 bg-gradient-to-t from-bg via-bg to-transparent pb-2 pt-4">
          <button className="btn-primary w-full text-base" disabled={!canNext[step]} onClick={() => go(1)}>
            {step === "where" ? "Reveal my directions ✨" : step === "considered" && a.considered.length === 0 ? "Skip" : "Continue"}
          </button>
          {step === "swipe" && !canNext.swipe && <p className="mt-2 text-center text-xs text-ink-3">{SWIPE_CARDS.length - Object.keys(a.swipes).length} cards to go</p>}
          {step === "excites" && !canNext.excites && <p className="mt-2 text-center text-xs text-ink-3">Pick at least two</p>}
        </div>
      )}
      {step === "thisorthat" && canNext.thisorthat && (
        <button className="btn-primary mt-6 w-full text-base" onClick={() => go(1)}>
          Continue
        </button>
      )}

      <SaveSheet
        open={!!saveOpen}
        onClose={() => setSaveOpen(null)}
        answers={a}
        choice={saveOpen}
        challengeCareers={matches.slice(0, 3).map((m) => m.careerSlug)}
        onDone={() => {
          try {
            localStorage.removeItem(STORAGE_KEY);
          } catch {}
          router.push(saveOpen?.kind === "commit" ? "/path" : "/home");
          router.refresh();
        }}
      />
    </div>
  );
}

function Choice({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "focus-ring flex w-full items-center gap-3 rounded-3xl border-2 bg-surface px-4 py-3.5 text-left font-semibold transition active:scale-[0.99]",
        selected ? "border-teal bg-teal-soft/60 shadow-[0_3px_0_0_rgb(var(--teal))]" : "border-line shadow-[0_3px_0_0_rgb(var(--line))]",
      )}
    >
      {children}
      {selected && <Check size={18} className="ml-auto shrink-0 text-teal" />}
    </button>
  );
}

function ChipToggle({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "focus-ring inline-flex items-center gap-1.5 rounded-full border-2 px-3.5 py-2 text-sm font-bold transition active:scale-95",
        selected ? "border-teal bg-teal text-white" : "border-line bg-surface text-ink-2 hover:border-teal/50",
      )}
    >
      {children}
    </button>
  );
}

function SwipeDeck({ swipes, onSwipe, onUndo }: { swipes: OnboardingAnswers["swipes"]; onSwipe: (id: string, r: "no" | "yes" | "love") => void; onUndo: (id: string) => void }) {
  const remaining = SWIPE_CARDS.filter((c) => !swipes[c.id]);
  const done = SWIPE_CARDS.filter((c) => swipes[c.id]);
  const top = remaining[0];
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-14, 14]);
  const yesOpacity = useTransform(x, [20, 120], [0, 1]);
  const noOpacity = useTransform(x, [-120, -20], [1, 0]);

  const decide = (r: "no" | "yes" | "love") => top && onSwipe(top.id, r);
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > 110) decide("yes");
    else if (info.offset.x < -110) decide("no");
    else if (info.offset.y < -120) decide("love");
  };

  if (!top) {
    return (
      <div className="card flex flex-col items-center p-8 text-center">
        <Pip mood="proud" size={100} />
        <h3 className="h-display mt-3 text-xl">Nice swiping!</h3>
        <p className="mt-1 text-sm text-ink-2">You loved {done.filter((c) => swipes[c.id] === "love").length} and liked {done.filter((c) => swipes[c.id] === "yes").length}.</p>
        <button className="mt-3 text-sm font-semibold text-ink-3 underline" onClick={() => done.at(-1) && onUndo(done.at(-1)!.id)}>
          Undo last
        </button>
      </div>
    );
  }

  const accents = { teal: "from-teal to-[#0B6F8C]", coral: "from-coral to-[#C2407F]", lavender: "from-lavender to-[#5B47C9]", sun: "from-sun to-coral", mint: "from-mint to-teal" };

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-[360px] w-full max-w-sm">
        {remaining.slice(1, 3).reverse().map((c, i) => (
          <div key={c.id} className="absolute inset-0 rounded-5xl bg-surface shadow-card" style={{ transform: `translateY(${(2 - i) * 10}px) scale(${0.92 + i * 0.04})` }} />
        ))}
        <motion.div
          key={top.id}
          className={`absolute inset-0 flex cursor-grab touch-none flex-col justify-end overflow-hidden rounded-5xl bg-gradient-to-br p-6 text-white shadow-lift active:cursor-grabbing ${accents[top.accent]}`}
          style={{ x, rotate }}
          drag
          dragSnapToOrigin
          dragElastic={0.7}
          onDragEnd={onDragEnd}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute right-6 top-6 text-7xl drop-shadow-lg" aria-hidden="true">
            {top.emoji}
          </div>
          <motion.div style={{ opacity: yesOpacity }} className="absolute left-6 top-6 rotate-[-12deg] rounded-xl border-4 border-white px-3 py-1 font-display text-2xl font-extrabold">
            YES
          </motion.div>
          <motion.div style={{ opacity: noOpacity }} className="absolute left-6 top-6 rotate-[-12deg] rounded-xl border-4 border-white/80 px-3 py-1 font-display text-2xl font-extrabold">
            NAH
          </motion.div>
          <div className="eyebrow !text-white/80">Would you enjoy…</div>
          <h3 className="h-display mt-1 text-3xl leading-tight">{top.title}</h3>
          <p className="mt-2 text-white/90">{top.scene}</p>
        </motion.div>
      </div>
      <div className="mt-6 flex items-center gap-4">
        <button onClick={() => decide("no")} className="focus-ring grid h-16 w-16 place-items-center rounded-full border-2 border-line bg-surface text-ink-3 shadow-card transition active:scale-90" aria-label="Not for me">
          <X size={28} />
        </button>
        <button onClick={() => decide("love")} className="focus-ring grid h-14 w-14 place-items-center rounded-full bg-coral text-white shadow-card transition active:scale-90" aria-label="Love it">
          <Heart size={24} fill="currentColor" />
        </button>
        <button onClick={() => decide("yes")} className="focus-ring grid h-16 w-16 place-items-center rounded-full bg-teal text-white shadow-card transition active:scale-90" aria-label="Sounds good">
          <Check size={30} />
        </button>
      </div>
      <p className="mt-3 text-xs text-ink-3">Swipe or tap · ♥ for things you&apos;d love</p>
    </div>
  );
}

function ThisOrThat({ picks, onPick }: { picks: Record<string, "a" | "b">; onPick: (id: string, s: "a" | "b") => void }) {
  const next = THIS_OR_THAT.find((q) => !picks[q.id]);
  const answered = THIS_OR_THAT.length - (next ? THIS_OR_THAT.filter((q) => !picks[q.id]).length : 0);
  if (!next) {
    return (
      <div className="card p-6 text-center">
        <Pip mood="happy" size={90} className="mx-auto" />
        <p className="mt-3 font-display text-lg font-bold">Got it. You know yourself better than you think.</p>
        <div className="mt-4 space-y-2 text-left">
          {THIS_OR_THAT.map((q) => (
            <button key={q.id} onClick={() => onPick(q.id, picks[q.id] === "a" ? "b" : "a")} className="flex w-full items-center justify-between rounded-2xl bg-surface-2 px-3 py-2 text-sm">
              <span>{q[picks[q.id]!].emoji} {q[picks[q.id]!].label}</span>
              <span className="text-xs text-ink-3">tap to swap</span>
            </button>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div>
      <div className="mb-3 text-center text-sm font-bold text-ink-3">
        {answered + 1} of {THIS_OR_THAT.length}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {(["a", "b"] as const).map((side) => (
          <motion.button
            key={`${next.id}-${side}`}
            whileTap={{ scale: 0.95 }}
            onClick={() => onPick(next.id, side)}
            className={cn("focus-ring flex aspect-[3/4] flex-col items-center justify-center gap-4 rounded-4xl p-4 text-center shadow-card", side === "a" ? "bg-lavender-soft" : "bg-mint-soft")}
          >
            <span className="text-6xl" aria-hidden="true">{next[side].emoji}</span>
            <span className="font-display text-lg font-bold leading-tight">{next[side].label}</span>
          </motion.button>
        ))}
      </div>
      <div className="mt-3 text-center font-display text-sm font-extrabold text-ink-3">OR</div>
    </div>
  );
}

function ValuePoints({ values, onChange }: { values: Record<ValueKey, number>; onChange: (v: Record<ValueKey, number>) => void }) {
  const used = Object.values(values).reduce((n, v) => n + v, 0);
  const left = 10 - used;
  return (
    <div>
      <div className={cn("mb-4 rounded-3xl p-4 text-center font-display text-lg font-bold", left === 0 ? "bg-teal-soft text-teal-deep dark:text-teal" : "bg-sun-soft")}>
        {left === 0 ? "Perfect — all 10 points spent!" : left > 0 ? `${left} point${left === 1 ? "" : "s"} left to spend` : `${-left} too many — take some back`}
      </div>
      <div className="space-y-3">
        {(Object.keys(VALUE_LABELS) as ValueKey[]).map((k) => (
          <div key={k} className="card flex items-center gap-3 p-3">
            <span className="text-2xl" aria-hidden="true">{VALUE_LABELS[k].emoji}</span>
            <div className="min-w-0 flex-1">
              <div className="font-display font-bold">{VALUE_LABELS[k].label}</div>
              <div className="mt-1 flex gap-1" aria-hidden="true">
                {Array.from({ length: 5 }, (_, i) => (
                  <span key={i} className={cn("h-2 flex-1 rounded-full", i < values[k] ? "bg-teal" : "bg-surface-3")} />
                ))}
              </div>
            </div>
            <button className="focus-ring grid h-10 w-10 place-items-center rounded-full bg-surface-2 disabled:opacity-40" disabled={values[k] === 0} onClick={() => onChange({ ...values, [k]: values[k] - 1 })} aria-label={`Less ${VALUE_LABELS[k].label}`}>
              <Minus size={18} />
            </button>
            <span className="w-4 text-center font-display font-bold" aria-label={`${values[k]} points`}>
              {values[k]}
            </span>
            <button className="focus-ring grid h-10 w-10 place-items-center rounded-full bg-teal text-white disabled:opacity-40" disabled={values[k] >= 5 || left <= 0} onClick={() => onChange({ ...values, [k]: values[k] + 1 })} aria-label={`More ${VALUE_LABELS[k].label}`}>
              <Plus size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Considered({ selected, onToggle }: { selected: string[]; onToggle: (slug: string) => void }) {
  const [q, setQ] = useState("");
  const results = q.trim() ? CAREERS.filter((c) => c.title.toLowerCase().includes(q.toLowerCase())).slice(0, 8) : CAREERS.filter((c) => c.featured).slice(0, 10);
  return (
    <div>
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" />
        <input className="input pl-11" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search careers…" aria-label="Search careers" />
      </div>
      {selected.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {selected.map((s) => (
            <ChipToggle key={s} selected onClick={() => onToggle(s)}>
              {getCareer(s)?.title} <X size={14} />
            </ChipToggle>
          ))}
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {results
          .filter((c) => !selected.includes(c.slug))
          .map((c) => (
            <ChipToggle key={c.slug} selected={false} onClick={() => onToggle(c.slug)}>
              {c.title}
            </ChipToggle>
          ))}
      </div>
    </div>
  );
}

function Results({ name, matches, busy, onChoose, onRestart }: { name: string; matches: MatchResult[]; busy: boolean; onChoose: (c: { kind: "commit"; slug: string } | { kind: "challenge" } | { kind: "explore" }) => void; onRestart: () => void }) {
  const [revealed, setRevealed] = useState(false);
  const [more, setMore] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 1600);
    return () => clearTimeout(t);
  }, []);
  if (!revealed) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <Pip mood="thinking" size={150} />
        <p className="h-display mt-6 text-2xl">Reading your compass…</p>
        <p className="mt-2 text-sm text-ink-3">Matching you against 120 careers</p>
      </div>
    );
  }
  const top = matches.slice(0, 3);
  return (
    <div>
      <div className="mb-6 text-center">
        <Pip mood="excited" size={96} className="mx-auto" />
        <div className="eyebrow mt-3">{name ? `${name}'s` : "Your"} results</div>
        <h1 className="h-display text-3xl">Your top three directions</h1>
      </div>
      <div className="space-y-4">
        {top.map((m, i) => {
          const c = getCareer(m.careerSlug)!;
          return (
            <motion.div key={m.careerSlug} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.25 }} className="card overflow-hidden">
              <CareerArt slug={c.slug} category={c.category} className="h-32" rounded={false} />
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="eyebrow">#{i + 1} direction</div>
                    <h2 className="h-display text-2xl">{c.title}</h2>
                    <p className="text-sm text-ink-2">{c.tagline}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-display text-3xl font-extrabold text-teal">{m.percent}%</div>
                    <div className="text-[11px] font-bold text-ink-3">match</div>
                  </div>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {m.reasons.map((r, j) => (
                    <li key={j} className="flex gap-2 text-sm text-ink-2">
                      <span className="text-teal">✦</span> {r.text}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex gap-2">
                  <button className="btn-primary btn-sm flex-1" disabled={busy} onClick={() => onChoose({ kind: "commit", slug: c.slug })}>
                    Commit to this path
                  </button>
                  <Link href={`/discover/${c.slug}`} className="btn-ghost btn-sm" target="_blank">
                    Explore
                  </Link>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="mt-5 overflow-hidden rounded-4xl bg-gradient-to-br from-navy to-[#21306A] p-6 text-white">
        <div className="eyebrow !text-mint">Can&apos;t decide? Good.</div>
        <h3 className="h-display mt-1 text-2xl">30-Day Discovery Challenge</h3>
        <p className="mt-2 text-sm text-white/80">Try small, real activities from all three directions (plus a few wildcards) before you choose. Progress counts towards whichever path you pick.</p>
        <button className="btn mt-4 w-full bg-mint text-navy shadow-[0_4px_0_0_#2FC9B4]" disabled={busy} onClick={() => onChoose({ kind: "challenge" })}>
          Start the challenge
        </button>
      </motion.div>

      <div className="mt-5">
        <button className="text-sm font-bold text-teal" onClick={() => setMore((v) => !v)}>
          {more ? "Hide" : "See"} more matches
        </button>
        {more && (
          <div className="mt-3 space-y-2">
            {matches.slice(3, 10).map((m) => {
              const c = getCareer(m.careerSlug)!;
              return (
                <div key={m.careerSlug} className="card flex items-center gap-3 p-3">
                  <CareerArt slug={c.slug} category={c.category} className="h-12 w-12 shrink-0 !rounded-2xl" showEmoji={false} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-display font-bold">{c.title}</div>
                    <div className="truncate text-xs text-ink-3">{m.reasons[0]?.text ?? c.tagline}</div>
                  </div>
                  <span className="font-display font-bold text-teal">{m.percent}%</span>
                  <button className="btn-ghost btn-sm" disabled={busy} onClick={() => onChoose({ kind: "commit", slug: c.slug })}>
                    Pick
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <p className="mt-6 text-center text-xs text-ink-3">Match percentages are exploratory compatibility indicators based on your answers — not scientific aptitude scores.</p>
      <div className="mt-4 flex justify-center gap-4 text-sm">
        <button className="font-semibold text-ink-3 underline" onClick={onRestart}>
          Change my answers
        </button>
        <button className="font-semibold text-ink-3 underline" disabled={busy} onClick={() => onChoose({ kind: "explore" })}>
          Just save my results
        </button>
      </div>
    </div>
  );
}

function SaveSheet({ open, onClose, answers, choice, challengeCareers, onDone }: { open: boolean; onClose: () => void; answers: OnboardingAnswers; choice: { kind: "commit"; slug: string } | { kind: "challenge" } | { kind: "explore" } | null; challengeCareers: string[]; onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/signup", {
        body: { email, password, onboarding: answers, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, startPath: choice?.kind === "commit" ? choice.slug : null },
      });
      if (choice?.kind === "challenge") await api("/api/challenge", { body: { action: "start", careers: challengeCareers } });
      onDone();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };
  return (
    <Sheet open={open} onClose={onClose} title="Save your direction">
      <div className="mb-4 flex items-center gap-3 rounded-3xl bg-mint-soft p-4">
        <Pip mood="happy" size={56} animate={false} />
        <p className="text-sm font-semibold">Create a free account so your results, path and progress are saved. Takes 10 seconds.</p>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <label className="block">
          <span className="eyebrow">Email</span>
          <input className="input mt-1.5" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        <label className="block">
          <span className="eyebrow">Password</span>
          <input className="input mt-1.5" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          <span className="mt-1 block text-xs text-ink-3">At least 8 characters.</span>
        </label>
        {error && (
          <p className="rounded-2xl bg-coral-soft px-3 py-2 text-sm font-semibold text-coral" role="alert">
            {error}
          </p>
        )}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? "Saving…" : "Create account & continue"}
        </button>
        <p className="text-center text-xs text-ink-3">
          By continuing you agree to our <Link href="/privacy" className="underline">privacy approach</Link>. We never sell your data.
        </p>
        <p className="text-center text-sm">
          Already have an account?{" "}
          <Link href="/signin?next=/onboarding" className="font-bold text-teal">
            Sign in
          </Link>
        </p>
      </form>
    </Sheet>
  );
}

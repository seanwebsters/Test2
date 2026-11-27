"use client";

import { AnimatePresence, Reorder, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import type { Criterion, ImageTask, Step, WriteTask } from "@/content/types";
import { coachPrompt, generateImage } from "@/lib/ai";
import { passes, scoreLabel, scorePrompt, wordCount } from "@/lib/coach";
import { play } from "@/lib/feedback";
import { useStore } from "@/lib/store";
import Mascot from "../Mascot";
import { Button, RichText } from "../ui";
import { IconCheck, IconClose, IconCopy, IconRefresh } from "../icons";

export type SetCheck = (fn: (() => boolean) | null) => void;

/** Stable shuffle so options don't jump around on re-render. */
function useShuffled<T>(items: T[], key: string): { item: T; orig: number }[] {
  return useMemo(() => {
    const arr = items.map((item, orig) => ({ item, orig }));
    let seed = 0;
    for (let i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) >>> 0;
    for (let i = arr.length - 1; i > 0; i--) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const j = seed % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

function Title({ children }: { children: React.ReactNode }) {
  return <h2 className="whitespace-pre-line font-display text-[23px] font-semibold leading-snug">{children}</h2>;
}

function ContextBox({ label, text }: { label: string; text: string }) {
  return (
    <div className="mt-4 rounded-2xl border-2 border-grape-100 bg-white p-4">
      <div className="mb-1 text-[11px] font-black uppercase tracking-widest text-grape-500">{label}</div>
      <div className="whitespace-pre-line text-[15px] font-semibold text-ink">{text}</div>
    </div>
  );
}

const optionCls = (state: "idle" | "selected" | "correct" | "wrong") =>
  `w-full rounded-2xl border-2 px-4 py-3.5 text-left text-[15px] font-semibold transition-all active:scale-[0.99] ${
    state === "selected"
      ? "border-grape-400 bg-grape-50 shadow-[0_3px_0_0_#BCA3FF]"
      : state === "correct"
        ? "border-mint-400 bg-mint-100 shadow-[0_3px_0_0_#4CD47E]"
        : state === "wrong"
          ? "border-coral-400 bg-coral-100 shadow-[0_3px_0_0_#FF7A70]"
          : "border-grape-100 bg-white shadow-[0_3px_0_0_#E3DBFF]"
  }`;

// ---------------------------------------------------------------- Teach
export function TeachStep({ step }: { step: Extract<Step, { kind: "teach" }> }) {
  return (
    <div>
      <div className="flex items-end gap-3">
        <Mascot size={92} mood={step.mood ?? "happy"} />
        <div className="relative mb-6 flex-1 rounded-3xl rounded-bl-md bg-white p-4 shadow-card">
          <div className="font-display text-[20px] font-semibold leading-tight">{step.title}</div>
        </div>
      </div>
      <p className="mt-2 text-[17px] leading-relaxed text-ink-soft">{step.body}</p>
      {step.bullets && (
        <ul className="mt-4 space-y-2">
          {step.bullets.map((b, i) => (
            <motion.li key={b} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.08 }} className="flex items-start gap-3 rounded-2xl bg-white p-3 shadow-card">
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-grape-100 text-grape-600">
                <IconCheck size={14} strokeWidth={3} />
              </span>
              <span className="text-[15px] font-semibold">{b}</span>
            </motion.li>
          ))}
        </ul>
      )}
      {step.example && <ContextBox label={step.example.label} text={step.example.text} />}
    </div>
  );
}

// ---------------------------------------------------------------- Choice
export function ChoiceStep({ step, setCheck, revealed, sk }: { step: Extract<Step, { kind: "choice" }>; setCheck: SetCheck; revealed: boolean; sk: string }) {
  const [sel, setSel] = useState<number | null>(null);
  const opts = useShuffled(step.options, sk);
  useEffect(() => {
    setCheck(sel === null ? null : () => sel === step.answer);
  }, [sel, step.answer, setCheck]);
  return (
    <div>
      <Title>{step.question}</Title>
      {step.context && <ContextBox {...step.context} />}
      <div className="mt-5 flex flex-col gap-3">
        {opts.map(({ item, orig }) => {
          const state = revealed ? (orig === step.answer ? "correct" : orig === sel ? "wrong" : "idle") : sel === orig ? "selected" : "idle";
          return (
            <button key={orig} disabled={revealed} onClick={() => { play("tap"); setSel(orig); }} className={optionCls(state)}>
              <span className="flex items-center justify-between gap-3">
                <span>{item}</span>
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${state === "selected" ? "border-grape-500 bg-grape-500" : state === "correct" ? "border-mint-500 bg-mint-500 text-white" : state === "wrong" ? "border-coral-500 bg-coral-500 text-white" : "border-grape-200"}`}>
                  {state === "selected" && <span className="h-2.5 w-2.5 rounded-full bg-white" />}
                  {state === "correct" && <IconCheck size={14} strokeWidth={3} />}
                  {state === "wrong" && <IconClose size={14} strokeWidth={3} />}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Multi
export function MultiStep({ step, setCheck, revealed, sk }: { step: Extract<Step, { kind: "multi" }>; setCheck: SetCheck; revealed: boolean; sk: string }) {
  const [sel, setSel] = useState<number[]>([]);
  const opts = useShuffled(step.options, sk);
  useEffect(() => {
    setCheck(sel.length === 0 ? null : () => sel.length === step.answers.length && step.answers.every((a) => sel.includes(a)));
  }, [sel, step.answers, setCheck]);
  return (
    <div>
      <Title>{step.question}</Title>
      <p className="mt-1 text-sm font-bold text-ink-mute">Select all that apply</p>
      <div className="mt-5 grid grid-cols-1 gap-3">
        {opts.map(({ item, orig }) => {
          const on = sel.includes(orig);
          const isAns = step.answers.includes(orig);
          const state = revealed ? (isAns ? "correct" : on ? "wrong" : "idle") : on ? "selected" : "idle";
          return (
            <button key={orig} disabled={revealed} onClick={() => { play("tap"); setSel((s) => (on ? s.filter((x) => x !== orig) : [...s, orig])); }} className={optionCls(state)}>
              <span className="flex items-center justify-between gap-3">
                <span>{item}</span>
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 ${on || (revealed && isAns) ? (state === "wrong" ? "border-coral-500 bg-coral-500" : state === "correct" ? "border-mint-500 bg-mint-500" : "border-grape-500 bg-grape-500") : "border-grape-200"} text-white`}>
                  {(on || (revealed && isAns)) && <IconCheck size={14} strokeWidth={3} />}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Build (drag & drop)
export function BuildStep({ step, setCheck, revealed, sk }: { step: Extract<Step, { kind: "build" }>; setCheck: SetCheck; revealed: boolean; sk: string }) {
  const all = useMemo(() => [...step.pieces, ...(step.distractors ?? [])], [step]);
  const pool = useShuffled(all, sk);
  const [chosen, setChosen] = useState<string[]>([]);
  useEffect(() => {
    if (!chosen.length) {
      setCheck(null);
      return;
    }
    setCheck(() => {
      if (step.ordered) return chosen.length === step.pieces.length && chosen.every((c, i) => c === step.pieces[i]);
      return chosen.length === step.pieces.length && step.pieces.every((p) => chosen.includes(p));
    });
  }, [chosen, step, setCheck]);
  const remaining = pool.filter(({ item }) => !chosen.includes(item));
  return (
    <div>
      <Title>{step.question}</Title>
      <p className="mt-1 text-sm font-bold text-ink-mute">{step.ordered ? "Tap pieces to add them, then drag to put them in order." : "Tap the pieces that belong. Drag to reorder."}</p>

      <div className="mt-4 min-h-[148px] rounded-3xl border-2 border-dashed border-grape-200 bg-white/70 p-2">
        {chosen.length === 0 && <div className="grid h-[128px] place-items-center text-sm font-bold text-ink-mute">Your prompt appears here</div>}
        <Reorder.Group axis="y" values={chosen} onReorder={(v) => !revealed && setChosen(v)} className="flex flex-col gap-2">
          {chosen.map((c, i) => {
            const isRight = step.ordered ? step.pieces[i] === c : step.pieces.includes(c);
            return (
              <Reorder.Item
                key={c}
                value={c}
                dragListener={!revealed}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileDrag={{ scale: 1.03, boxShadow: "0 12px 30px -10px rgba(76,35,190,.45)" }}
                className={`flex cursor-grab touch-none items-center gap-2 rounded-2xl px-3 py-2.5 text-[15px] font-bold active:cursor-grabbing ${revealed ? (isRight ? "bg-mint-100 text-ink" : "bg-coral-100 text-ink") : "bg-grape-500 text-white shadow-tactile-sm"}`}
              >
                <span className="opacity-60">⋮⋮</span>
                <span className="flex-1">{c}</span>
                {!revealed && (
                  <button aria-label="Remove" onPointerDown={(e) => e.stopPropagation()} onClick={() => { play("tap"); setChosen((s) => s.filter((x) => x !== c)); }} className="grid h-7 w-7 place-items-center rounded-full bg-white/20">
                    <IconClose size={14} />
                  </button>
                )}
              </Reorder.Item>
            );
          })}
        </Reorder.Group>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <AnimatePresence>
          {remaining.map(({ item }) => (
            <motion.button
              key={item}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              disabled={revealed}
              onClick={() => { play("tap"); setChosen((s) => [...s, item]); }}
              className="rounded-2xl border-2 border-grape-100 bg-white px-3.5 py-2.5 text-[15px] font-bold shadow-[0_3px_0_0_#E3DBFF] active:translate-y-[2px] active:shadow-none"
            >
              {item}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
      {revealed && (
        <ContextBox label="Ideal answer" text={step.pieces.join(step.ordered ? " → " : " · ")} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Compare
export function CompareStep({ step, setCheck, revealed }: { step: Extract<Step, { kind: "compare" }>; setCheck: SetCheck; revealed: boolean }) {
  const [sel, setSel] = useState<"a" | "b" | null>(null);
  useEffect(() => {
    setCheck(sel ? () => sel === step.answer : null);
  }, [sel, step.answer, setCheck]);
  return (
    <div>
      <Title>{step.question}</Title>
      {step.prompt && <ContextBox label="Prompt" text={step.prompt} />}
      <div className="mt-4 flex flex-col gap-3">
        {(["a", "b"] as const).map((k) => {
          const state = revealed ? (k === step.answer ? "correct" : k === sel ? "wrong" : "idle") : sel === k ? "selected" : "idle";
          return (
            <button key={k} disabled={revealed} onClick={() => { play("tap"); setSel(k); }} className={optionCls(state)}>
              <span className="mb-1 inline-block rounded-lg bg-lav-100 px-2 py-0.5 text-xs font-black uppercase text-grape-600">Option {k.toUpperCase()}</span>
              <span className="block whitespace-pre-line text-[15px] leading-relaxed">{step[k]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Judge
export function JudgeStep({ step, setCheck, revealed }: { step: Extract<Step, { kind: "judge" }>; setCheck: SetCheck; revealed: boolean }) {
  const [sel, setSel] = useState<boolean | null>(null);
  useEffect(() => {
    setCheck(sel === null ? null : () => sel === step.good);
  }, [sel, step.good, setCheck]);
  return (
    <div>
      <Title>{step.question}</Title>
      <div className="mt-4 space-y-3">
        {step.prompt && (
          <div className="ml-auto max-w-[85%] rounded-3xl rounded-br-md bg-grape-500 px-4 py-3 text-[15px] font-semibold text-white">{step.prompt}</div>
        )}
        <div className="flex items-end gap-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-lav-100 text-lg">🤖</span>
          <div className="max-w-[85%] whitespace-pre-line rounded-3xl rounded-bl-md bg-white px-4 py-3 text-[15px] shadow-card">{step.response}</div>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3">
        {[
          { v: true, label: "Good response", icon: "👍" },
          { v: false, label: "Not good", icon: "👎" },
        ].map((o) => {
          const state = revealed ? (o.v === step.good ? "correct" : o.v === sel ? "wrong" : "idle") : sel === o.v ? "selected" : "idle";
          return (
            <button key={String(o.v)} disabled={revealed} onClick={() => { play("tap"); setSel(o.v); }} className={`${optionCls(state)} flex flex-col items-center gap-1 py-5 text-center`}>
              <span className="text-3xl">{o.icon}</span>
              <span>{o.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Spot
export function SpotStep({ step, setCheck, revealed }: { step: Extract<Step, { kind: "spot" }>; setCheck: SetCheck; revealed: boolean }) {
  const [sel, setSel] = useState<number[]>([]);
  useEffect(() => {
    const wrongIdx = step.sentences.map((s, i) => (s.wrong ? i : -1)).filter((i) => i >= 0);
    setCheck(sel.length ? () => sel.length === wrongIdx.length && wrongIdx.every((i) => sel.includes(i)) : null);
  }, [sel, step.sentences, setCheck]);
  return (
    <div>
      <Title>{step.question}</Title>
      {step.intro && <p className="mt-2 text-sm font-bold text-ink-mute">{step.intro}</p>}
      <div className="mt-4 rounded-3xl bg-white p-2 shadow-card">
        <div className="flex items-center gap-2 px-2 pb-1 pt-1 text-xs font-black uppercase tracking-widest text-ink-mute">🤖 AI answer</div>
        {step.sentences.map((s, i) => {
          const on = sel.includes(i);
          const cls = revealed
            ? s.wrong
              ? on
                ? "bg-mint-100 ring-2 ring-mint-400"
                : "bg-coral-100 ring-2 ring-coral-400"
              : on
                ? "bg-coral-100 ring-2 ring-coral-400"
                : ""
            : on
              ? "bg-sun-100 ring-2 ring-sun-400"
              : "hover:bg-lav-100";
          return (
            <button key={i} disabled={revealed} onClick={() => { play("tap"); setSel((x) => (on ? x.filter((y) => y !== i) : [...x, i])); }} className={`my-1 block w-full rounded-2xl px-3 py-2.5 text-left text-[15px] leading-relaxed transition-all ${cls}`}>
              {s.text}
              {revealed && s.wrong && <span className="ml-1 text-xs font-black text-coral-600"> ⚠ made up</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Sort
export function SortStep({ step, setCheck, revealed }: { step: Extract<Step, { kind: "sort" }>; setCheck: SetCheck; revealed: boolean }) {
  const [placed, setPlaced] = useState<(0 | 1 | undefined)[]>(() => step.items.map(() => undefined));
  const idx = placed.findIndex((p) => p === undefined);
  const current = idx >= 0 ? step.items[idx] : null;
  useEffect(() => {
    setCheck(idx === -1 ? () => step.items.every((it, i) => placed[i] === it.bin) : null);
  }, [idx, placed, step.items, setCheck]);
  const put = (bin: 0 | 1) => {
    if (idx < 0) return;
    play("tap");
    setPlaced((p) => p.map((v, i) => (i === idx ? bin : v)) as (0 | 1 | undefined)[]);
  };
  return (
    <div>
      <Title>{step.question}</Title>
      <div className="relative mt-5 h-[124px]">
        <AnimatePresence>
          {current && (
            <motion.div
              key={idx}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.6}
              onDragEnd={(_, info) => {
                if (info.offset.x < -80) put(0);
                else if (info.offset.x > 80) put(1);
              }}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              className="absolute inset-x-6 grid h-[110px] cursor-grab touch-none place-items-center rounded-3xl bg-white px-5 text-center text-[17px] font-bold shadow-float ring-1 ring-grape-100"
            >
              {current.text}
              <span className="absolute bottom-2 text-[11px] font-bold text-ink-mute">← swipe or tap a box →</span>
            </motion.div>
          )}
          {!current && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid h-full place-items-center text-center font-bold text-ink-mute">
              {revealed ? "Here's how they sort:" : "All sorted! Tap Check."}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {step.bins.map((b, bi) => (
          <div key={b} className="flex flex-col">
            <button disabled={!current || revealed} onClick={() => put(bi as 0 | 1)} className={`rounded-2xl px-3 py-3 font-display text-[16px] font-semibold text-white shadow-tactile-sm active:translate-y-[2px] disabled:opacity-70 ${bi === 0 ? "bg-gradient-to-b from-grape-400 to-grape-600" : "bg-gradient-to-b from-rose-400 to-rose-500 shadow-[0_3px_0_0_#B8326F]"}`}>
              {b}
            </button>
            <div className="mt-2 flex min-h-[60px] flex-col gap-1.5">
              {step.items.map((it, i) =>
                placed[i] === bi ? (
                  <motion.div key={i} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className={`rounded-xl px-2.5 py-1.5 text-[13px] font-semibold ${revealed ? (it.bin === bi ? "bg-mint-100" : "bg-coral-100 line-through decoration-coral-500") : "bg-white shadow-card"}`}>
                    {it.text}
                  </motion.div>
                ) : null,
              )}
            </div>
          </div>
        ))}
      </div>
      {!revealed && placed.some((p) => p !== undefined) && (
        <button onClick={() => setPlaced(step.items.map(() => undefined))} className="mt-2 text-sm font-bold text-grape-500">Start over</button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Write (prompt + live coaching)
function CriteriaChips({ criteria, prompt }: { criteria: Criterion[]; prompt: string }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {criteria.map((c) => {
        const ok = prompt.trim().length > 0 && passes(c, prompt);
        return (
          <motion.span key={c.id} animate={{ scale: ok ? [1, 1.12, 1] : 1 }} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold transition-colors ${ok ? "bg-mint-100 text-mint-600" : "bg-white text-ink-mute ring-1 ring-grape-100"}`}>
            {ok ? <IconCheck size={12} strokeWidth={3.4} /> : <span className="h-1.5 w-1.5 rounded-full bg-grape-200" />} {c.label}
          </motion.span>
        );
      })}
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const col = score >= 85 ? "#2DBE63" : score >= 65 ? "#7C4DFF" : score >= 40 ? "#F5A70B" : "#F5564A";
  return (
    <div className="relative h-[84px] w-[84px]">
      <svg viewBox="0 0 84 84" className="-rotate-90">
        <circle cx="42" cy="42" r={r} stroke="#ECE4FF" strokeWidth="9" fill="none" />
        <motion.circle cx="42" cy="42" r={r} stroke={col} strokeWidth="9" fill="none" strokeLinecap="round" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - score / 100) }} transition={{ duration: 1, ease: "easeOut" }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center font-display text-2xl font-semibold">{score}</div>
    </div>
  );
}

export function LiveBadge({ live, mode }: { live: boolean; mode?: boolean }) {
  return live ? (
    <span className="rounded-full bg-mint-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-mint-600">● Live AI</span>
  ) : (
    <span className="rounded-full bg-sun-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#9A6A00]" title="No AI key connected — showing a realistic example response">{mode ? "Demo mode" : "Demo response"}</span>
  );
}

export function WriteStep({ task, onDone }: { task: WriteTask; onDone: (score: number) => void }) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Awaited<ReturnType<typeof coachPrompt>> | null>(null);
  const [attempts, setAttempts] = useState(0);
  const recordPrompt = useStore((s) => s.recordPrompt);
  const live = scorePrompt(prompt, task.criteria);

  const submit = async () => {
    setLoading(true);
    play("tap");
    const r = await coachPrompt({ task: { title: task.title, brief: task.brief, output: task.output }, prompt, criteria: task.criteria, demo: task.demo });
    setResult(r);
    setAttempts((a) => a + 1);
    recordPrompt(r.feedback.score);
    play(r.feedback.score >= 65 ? "correct" : "tap");
    setLoading(false);
  };

  if (loading)
    return (
      <div className="flex flex-col items-center pt-10 text-center">
        <Mascot size={130} mood="thinking" sparkles />
        <div className="mt-3 font-display text-xl font-semibold">Aibi is reading your prompt…</div>
        <div className="mt-1 text-sm text-ink-mute">Sending it to the AI and preparing your coaching</div>
        <div className="mt-6 h-3 w-48 overflow-hidden rounded-full bg-grape-100">
          <div className="shine h-full w-full bg-grape-200" />
        </div>
      </div>
    );

  if (result) {
    const f = result.feedback;
    const lab = scoreLabel(f.score);
    return (
      <div className="pb-4">
        <div className="flex items-center gap-4">
          <ScoreRing score={f.score} />
          <div className="flex-1">
            <div className="text-xs font-black uppercase tracking-widest text-ink-mute">Prompt score</div>
            <div className="font-display text-2xl font-semibold leading-tight">{lab.label}</div>
            <p className="text-sm text-ink-soft">{f.headline}</p>
          </div>
        </div>

        <div className="mt-4 rounded-3xl bg-white p-4 shadow-card">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-widest text-ink-mute">🤖 AI&apos;s answer</span>
            <LiveBadge live={result.live} />
          </div>
          <div className="max-h-[260px] overflow-y-auto pr-1 text-[14.5px] leading-relaxed">
            <RichText text={result.response} />
          </div>
        </div>

        <div className="mt-3 rounded-3xl bg-lav-100 p-4">
          <div className="flex items-center gap-2 font-display text-lg font-semibold">
            <Mascot size={30} float={false} /> Aibi&apos;s coaching
          </div>
          {f.strengths.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {f.strengths.map((s) => (
                <li key={s} className="flex gap-2 text-[14px]"><span className="text-mint-500">✓</span><span>{s}</span></li>
              ))}
            </ul>
          )}
          {f.improvements.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {f.improvements.map((s) => (
                <li key={s} className="flex gap-2 text-[14px]"><span className="text-grape-500">→</span><span>{s}</span></li>
              ))}
            </ul>
          )}
          {f.improvedPrompt && f.improvedPrompt !== prompt && (
            <div className="mt-3 rounded-2xl bg-white p-3">
              <div className="mb-1 flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-grape-500">
                Upgraded prompt
                <button aria-label="Copy" onClick={() => navigator.clipboard?.writeText(f.improvedPrompt)} className="text-grape-500"><IconCopy size={16} /></button>
              </div>
              <p className="whitespace-pre-line text-[14px]">{f.improvedPrompt}</p>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <Button full onClick={() => onDone(f.score)}>Continue</Button>
          {f.score < 95 && attempts < 4 && (
            <Button variant="secondary" full onClick={() => setResult(null)}>
              <IconRefresh size={18} /> Improve my prompt
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="inline-flex items-center gap-1.5 rounded-full bg-grape-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-grape-600">✍️ Prompt challenge</div>
      <h2 className="mt-2 font-display text-[23px] font-semibold leading-snug">{task.title}</h2>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{task.brief}</p>
      <div className="mt-4 rounded-3xl bg-white p-3 shadow-card ring-2 ring-transparent focus-within:ring-grape-300">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={task.placeholder}
          rows={6}
          maxLength={2000}
          className="w-full resize-none bg-transparent text-[16px] leading-relaxed outline-none placeholder:text-ink-mute/60"
        />
        <div className="flex items-center justify-between border-t border-grape-100 pt-2 text-xs font-bold text-ink-mute">
          <span>{wordCount(prompt)} words</span>
          <span>Live score: <span className="text-grape-600">{prompt.trim() ? live.score : 0}</span></span>
        </div>
      </div>
      <div className="mt-3">
        <div className="mb-1.5 text-xs font-black uppercase tracking-widest text-ink-mute">Aibi is looking for</div>
        <CriteriaChips criteria={task.criteria} prompt={prompt} />
      </div>
      <div className="mt-5">
        <Button full disabled={wordCount(prompt) < 3} onClick={submit}>Send to AI</Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Image
export function ImageStep({ task, onDone }: { task: ImageTask; onDone: (score: number) => void }) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [img, setImg] = useState<{ url: string; live: boolean } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const recordImage = useStore((s) => s.recordImage);
  const recordPrompt = useStore((s) => s.recordPrompt);
  const sc = scorePrompt(prompt, task.criteria);

  const go = async () => {
    setLoading(true);
    setErr(null);
    const r = await generateImage(prompt);
    setLoading(false);
    if ("error" in r) return setErr(r.error);
    setImg(r);
    recordImage();
    recordPrompt(sc.score);
    play("correct");
  };

  return (
    <div className="pb-4">
      <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-400/15 px-3 py-1 text-xs font-black uppercase tracking-wider text-rose-500">🎨 Image studio</div>
      <h2 className="mt-2 font-display text-[23px] font-semibold leading-snug">{task.title}</h2>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{task.brief}</p>

      {img ? (
        <>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative mt-4 overflow-hidden rounded-3xl shadow-float">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt={prompt} className="aspect-square w-full object-cover" />
            <div className="absolute left-3 top-3"><LiveBadge live={img.live} /></div>
          </motion.div>
          {!img.live && <p className="mt-2 text-xs text-ink-mute">Demo mode creates illustrative artwork from your keywords. Connect an image API for full AI generation.</p>}
          <div className="mt-3 rounded-3xl bg-lav-100 p-4">
            <div className="flex items-center justify-between">
              <span className="font-display text-lg font-semibold">Prompt score</span>
              <span className="font-display text-2xl font-semibold text-grape-600">{sc.score}</span>
            </div>
            <ul className="mt-2 space-y-1 text-[14px]">
              {sc.passed.map((c) => <li key={c.id} className="flex gap-2"><span className="text-mint-500">✓</span>{c.label}</li>)}
              {sc.missed.map((c) => <li key={c.id} className="flex gap-2"><span className="text-grape-500">→</span>{c.tip}</li>)}
            </ul>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            <Button full onClick={() => onDone(sc.score)}>Continue</Button>
            <Button variant="secondary" full onClick={() => setImg(null)}><IconRefresh size={18} /> Try a new prompt</Button>
          </div>
        </>
      ) : (
        <>
          <div className="mt-4 rounded-3xl bg-white p-3 shadow-card">
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} maxLength={600} placeholder={task.placeholder} className="w-full resize-none bg-transparent text-[16px] leading-relaxed outline-none placeholder:text-ink-mute/60" />
          </div>
          <div className="mt-3"><CriteriaChips criteria={task.criteria} prompt={prompt} /></div>
          {err && <p className="mt-3 text-sm font-bold text-coral-600">{err}</p>}
          <div className="mt-5">
            <Button full disabled={wordCount(prompt) < 3 || loading} onClick={go}>{loading ? "Painting your image…" : "Generate image"}</Button>
          </div>
          {loading && (
            <div className="mt-4 grid aspect-square w-full place-items-center overflow-hidden rounded-3xl bg-gradient-to-br from-grape-100 to-rose-400/20">
              <div className="shine absolute inset-0" />
              <Mascot size={110} mood="thinking" sparkles />
            </div>
          )}
        </>
      )}
    </div>
  );
}

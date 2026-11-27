"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { StatsBar } from "@/components/AppChrome";
import Mascot from "@/components/Mascot";
import { Button, PlusBadge, Progress, Sheet } from "@/components/ui";
import { Crown, IconArrowRight, IconCheck, IconLock, IconStar } from "@/components/icons";
import { ALL_LESSONS, SKILL_LABELS, WORLDS } from "@/content/curriculum";
import { LEVEL_LABEL, focusWorlds } from "@/content/profile";
import type { Lesson, World } from "@/content/types";
import { dayKey } from "@/lib/date";
import { worldProgress } from "@/lib/gamification";
import { dailyGoal, isWorldUnlocked, lessonState, nextLesson, todayXp, useStore, type AppData } from "@/lib/store";
import { play } from "@/lib/feedback";

const OFFSETS = [0, 56, 84, 56, 0, -56, -84, -56, 0, 40];

export default function LearnPage() {
  const s = useStore();
  const router = useRouter();
  const [selected, setSelected] = useState<Lesson | null>(null);
  const currentRef = useRef<HTMLDivElement | null>(null);
  const next = nextLesson(s);
  const doneCount = Object.keys(s.completed).length;
  const pct = doneCount / ALL_LESSONS.length;
  const focus = useMemo(() => (s.profile ? focusWorlds(s.profile) : []), [s.profile]);
  const goal = dailyGoal(s);
  const xpToday = todayXp(s);
  const challengeDone = !!s.challenges[dayKey()];

  useEffect(() => {
    const t = setTimeout(() => currentRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }), 350);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative">
      <div className="sticky top-0 z-30 bg-lav-50/85 px-4 pb-3 pt-[calc(12px+var(--safe-top))] backdrop-blur-xl">
        <StatsBar />
      </div>

      <section className="px-5 pt-2">
        <h1 className="font-display text-[26px] font-semibold leading-tight">Your AI learning path</h1>
        <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-ink-soft">
          <span>{LEVEL_LABEL[s.profile?.familiarity ?? "beginner"]}</span>
          <span>·</span>
          <span>{Math.round(pct * 100)}% complete</span>
        </div>
        <Progress value={Math.max(pct, 0.02)} className="mt-2" />

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Link href="/challenges" className="rounded-3xl bg-white p-3.5 shadow-card active:scale-[0.98] transition-transform">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-ink-mute">Daily goal</span>
              <span className="text-lg">{xpToday >= goal ? "✅" : "🎯"}</span>
            </div>
            <div className="mt-1 font-display text-xl font-semibold">
              {Math.min(xpToday, goal)}<span className="text-sm text-ink-mute">/{goal} XP</span>
            </div>
            <Progress value={xpToday / goal} height={8} className="mt-2" color={xpToday >= goal ? "mint" : "grape"} />
          </Link>
          <Link href="/challenges" className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-grape-500 to-rose-400 p-3.5 text-white shadow-card active:scale-[0.98] transition-transform">
            <div className="text-xs font-black uppercase tracking-wider text-white/80">Daily challenge</div>
            <div className="mt-1 font-display text-[17px] font-semibold leading-tight">{challengeDone ? "Done for today!" : "Ready for you"}</div>
            <div className="mt-1 text-xs font-bold text-white/85">{challengeDone ? "Come back tomorrow" : "+30 XP · 5 min"}</div>
            <span className="absolute -bottom-3 -right-2 text-5xl opacity-90">{challengeDone ? "🏅" : "⚡"}</span>
          </Link>
        </div>
      </section>

      <div className="mt-6 space-y-2 pb-40">
        {WORLDS.map((w) => (
          <WorldSection key={w.id} world={w} s={s} focus={focus.includes(w.id)} nextId={next?.id} onSelect={setSelected} currentRef={currentRef} />
        ))}
        <div className="flex flex-col items-center px-8 pt-8 text-center">
          <Mascot size={110} mood="wow" />
          <p className="mt-2 font-display text-lg font-semibold">More worlds are on the way</p>
          <p className="text-sm text-ink-mute">New lessons arrive as AI evolves. Keep your streak going!</p>
        </div>
      </div>

      {next && (
        <div className="fixed bottom-[calc(78px+var(--safe-bottom))] left-1/2 z-30 w-full max-w-[480px] -translate-x-1/2 px-4">
          <motion.button
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            onClick={() => {
              play("tap");
              setSelected(next);
            }}
            className="flex w-full items-center gap-3 rounded-3xl bg-white/95 p-3 text-left shadow-float ring-1 ring-grape-100 backdrop-blur"
          >
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lav-100">
              <Mascot size={36} float={false} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-bold text-ink-mute">Next lesson</span>
              <span className="block truncate font-display text-[17px] font-semibold">{next.title}</span>
              <span className="block truncate text-xs text-ink-soft">{next.subtitle}</span>
            </span>
            <span className="grid h-11 w-11 place-items-center rounded-full bg-grape-500 text-white shadow-tactile-sm">
              <IconArrowRight size={20} />
            </span>
          </motion.button>
        </div>
      )}

      <LessonSheet lesson={selected} s={s} onClose={() => setSelected(null)} onStart={(id, jump) => router.push(`/lesson/${id}${jump ? "?jump=1" : ""}`)} />
    </div>
  );
}

function WorldSection({
  world,
  s,
  focus,
  nextId,
  onSelect,
  currentRef,
}: {
  world: World;
  s: AppData;
  focus: boolean;
  nextId?: string;
  onSelect: (l: Lesson) => void;
  currentRef: React.MutableRefObject<HTMLDivElement | null>;
}) {
  const unlocked = isWorldUnlocked(s, world.id);
  const plusLocked = world.plus && s.plan !== "plus";
  const progress = worldProgress(s, world.id);
  const t = world.theme;
  const NODE_GAP = 104;
  const TOP = 104;
  const height = world.lessons.length * NODE_GAP + TOP;
  const router = useRouter();

  const pathD = useMemo(() => {
    const pts = world.lessons.map((_, i) => [200 + OFFSETS[i % OFFSETS.length], TOP + i * NODE_GAP]);
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      d += ` C ${x0} ${y0 + NODE_GAP / 2}, ${x1} ${y1 - NODE_GAP / 2}, ${x1} ${y1}`;
    }
    return d;
  }, [world.lessons]);

  return (
    <section className="relative">
      {/* banner */}
      <div className="relative z-10 mx-4 overflow-hidden rounded-[28px] p-4 text-white shadow-float" style={{ background: `linear-gradient(135deg, ${t.from}, ${t.to})` }}>
        <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/15" />
        <div className="absolute -bottom-10 right-10 h-24 w-24 rounded-full bg-white/10" />
        <div className="relative flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/20 text-2xl backdrop-blur">{t.icon}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white/80">
              World {world.n} {world.plus && <PlusBadge />} {focus && <span className="rounded-full bg-white/25 px-2 py-0.5 text-[10px]">For you</span>}
            </div>
            <div className="font-display text-[22px] font-semibold leading-tight">{world.title}</div>
            <div className="text-[13px] font-semibold text-white/85">{world.tagline}</div>
          </div>
        </div>
        <div className="relative mt-3 flex items-center gap-3">
          <Progress value={progress} color="white" height={8} />
          <span className="text-xs font-black">{Math.round(progress * 100)}%</span>
        </div>
        {(!unlocked || plusLocked) && (
          <div className="relative mt-3 flex items-center gap-2">
            {plusLocked ? (
              <Button variant="gold" size="sm" href="/plus">
                <Crown size={16} /> Unlock with Plus
              </Button>
            ) : (
              <>
                <span className="flex items-center gap-1 text-xs font-bold text-white/90">
                  <IconLock size={14} /> Finish World {world.n - 1} to unlock
                </span>
                <Button variant="white" size="sm" className="ml-auto" onClick={() => router.push(`/lesson/${world.id}-l5?jump=1`)}>
                  Jump here
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* illustrated path */}
      <div className="relative -mt-6 overflow-hidden" style={{ height }}>
        <Scenery world={world} height={height} />
        <svg className="absolute left-1/2 top-0 -translate-x-1/2" width="400" height={height} viewBox={`0 0 400 ${height}`} aria-hidden>
          <path d={pathD} stroke="white" strokeOpacity="0.85" strokeWidth="26" fill="none" strokeLinecap="round" />
          <path d={pathD} stroke={t.accent} strokeOpacity="0.35" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray="2 14" />
        </svg>
        {world.lessons.map((l, i) => {
          const st = lessonState(s, l.id);
          const isCurrent = l.id === nextId;
          const x = OFFSETS[i % OFFSETS.length];
          return (
            <div
              key={l.id}
              ref={isCurrent ? currentRef : undefined}
              className="absolute left-1/2"
              style={{ top: TOP + i * NODE_GAP, transform: `translate(calc(-50% + ${x}px), -50%)` }}
            >
              <Node lesson={l} state={st} current={isCurrent} plusLocked={plusLocked} accent={t.from} onClick={() => onSelect(l)} />
              {isCurrent && (
                <div className="pointer-events-none absolute top-1/2 -translate-y-1/2" style={{ [x >= 0 ? "right" : "left"]: "calc(100% + 6px)" } as React.CSSProperties}>
                  <Mascot size={78} wave={i === 0} mood="happy" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Node({ lesson, state, current, plusLocked, accent, onClick }: { lesson: Lesson; state: string; current: boolean; plusLocked: boolean; accent: string; onClick: () => void }) {
  const done = state === "done";
  const locked = state === "locked" || (plusLocked && !done);
  const special = lesson.type !== "lesson";
  const size = special ? 84 : 72;
  const face = done
    ? "from-mint-400 to-mint-500"
    : locked
      ? "from-[#ECE8F5] to-[#DCD6EA]"
      : "from-grape-400 to-grape-600";
  const rim = done ? "#1C8A45" : locked ? "#C4BCD8" : "#43209C";
  return (
    <div className="relative">
      {current && (
        <>
          <span className="absolute inset-0 -m-2 animate-pulseRing rounded-full bg-sun-300/60" />
          <motion.div initial={{ y: 4 }} animate={{ y: [4, -4, 4] }} transition={{ duration: 1.6, repeat: Infinity }} className="absolute -top-11 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-xl bg-white px-3 py-1.5 font-display text-sm font-semibold text-grape-600 shadow-card">
            {lesson.type === "boss" ? "Challenge!" : "Start"}
            <span className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-white" />
          </motion.div>
        </>
      )}
      <motion.button
        whileTap={{ y: 5 }}
        onClick={() => {
          play("tap");
          onClick();
        }}
        aria-label={`${lesson.title}${done ? " (completed)" : locked ? " (locked)" : ""}`}
        className={`relative grid place-items-center rounded-full bg-gradient-to-b ${face} ${current ? "ring-[6px] ring-sun-300" : "ring-4 ring-white"}`}
        style={{ width: size, height: size * 0.88, boxShadow: `0 7px 0 0 ${rim}, 0 12px 24px -8px ${accent}88` }}
      >
        <span className="absolute left-3 right-3 top-1.5 h-2.5 rounded-full bg-white/35" />
        {done ? (
          <IconCheck size={34} strokeWidth={3.4} className="text-white" />
        ) : locked ? (
          plusLocked ? <Crown size={30} /> : <IconLock size={28} className="text-[#A59CBF]" />
        ) : lesson.type === "boss" ? (
          <span className="text-3xl">🏆</span>
        ) : lesson.type === "checkpoint" ? (
          <span className="text-3xl">🎁</span>
        ) : (
          <IconStar size={32} className="text-white" fill="white" />
        )}
      </motion.button>
    </div>
  );
}

function Scenery({ world, height }: { world: World; height: number }) {
  const t = world.theme;
  const trees = useMemo(() => {
    const r: { x: number; y: number; s: number; side: number }[] = [];
    for (let i = 0; i < Math.floor(height / 140); i++) {
      const side = i % 2 === 0 ? -1 : 1;
      r.push({ x: side < 0 ? 18 + ((i * 37) % 40) : 330 + ((i * 29) % 40), y: 120 + i * 140, s: 0.8 + ((i * 13) % 5) / 10, side });
    }
    return r;
  }, [height]);
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 400 ${height}`} preserveAspectRatio="xMidYMin slice" aria-hidden>
      <defs>
        <linearGradient id={`sky-${world.id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={t.from} stopOpacity="0.18" />
          <stop offset="0.25" stopColor={t.ground} stopOpacity="0.55" />
          <stop offset="1" stopColor={t.ground2} stopOpacity="0.7" />
        </linearGradient>
      </defs>
      <rect width="400" height={height} fill={`url(#sky-${world.id})`} />
      {/* rolling hills down the sides */}
      {Array.from({ length: Math.ceil(height / 220) }, (_, i) => (
        <g key={i}>
          <ellipse cx={i % 2 ? 420 : -20} cy={140 + i * 220} rx="130" ry="90" fill={t.ground2} opacity="0.55" />
          <ellipse cx={i % 2 ? -10 : 410} cy={240 + i * 220} rx="100" ry="70" fill={t.ground} opacity="0.65" />
        </g>
      ))}
      {/* clouds */}
      {[0, 1].map((i) => (
        <g key={i} opacity="0.9" transform={`translate(${i ? 300 : 30} ${60 + i * 50})`}>
          <ellipse cx="20" cy="10" rx="26" ry="14" fill="white" />
          <ellipse cx="44" cy="6" rx="22" ry="16" fill="white" />
          <ellipse cx="62" cy="12" rx="18" ry="11" fill="white" />
        </g>
      ))}
      {/* trees and bushes */}
      {trees.map((tr, i) => (
        <g key={i} transform={`translate(${tr.x} ${tr.y}) scale(${tr.s})`}>
          <rect x="-3" y="10" width="6" height="16" rx="3" fill="#8A6A4A" />
          <circle cx="0" cy="2" r="16" fill="#3FA65A" />
          <circle cx="-9" cy="10" r="11" fill="#4CB868" />
          <circle cx="9" cy="10" r="11" fill="#36994F" />
          <circle cx="-5" cy="-4" r="5" fill="#fff" opacity="0.18" />
        </g>
      ))}
      {/* world landmark */}
      <Landmark kind={t.landmark} x={world.n % 2 ? 320 : 46} y={height - 170} color={t.from} />
      {/* flag at the end */}
      <g transform={`translate(${200 + 40} ${height - 70})`}>
        <rect x="18" y="-36" width="3" height="40" fill="#5B4B8A" />
        <path d="M21 -36 L44 -28 L21 -20 Z" fill={t.from} />
      </g>
    </svg>
  );
}

function Landmark({ kind, x, y, color }: { kind: string; x: number; y: number; color: string }) {
  const common = { transform: `translate(${x} ${y})` };
  switch (kind) {
    case "tower":
      return (
        <g {...common}>
          <path d="M0 60 L12 0 L24 60 Z" fill={color} opacity="0.7" />
          <circle cx="12" cy="-4" r="5" fill="#FFC53D" />
        </g>
      );
    case "bubbles":
      return (
        <g {...common}>
          <rect x="-10" y="0" width="44" height="28" rx="12" fill="white" />
          <path d="M2 26 L-4 38 L12 28 Z" fill="white" />
          <circle cx="4" cy="14" r="3" fill={color} /><circle cx="12" cy="14" r="3" fill={color} /><circle cx="20" cy="14" r="3" fill={color} />
        </g>
      );
    case "house":
      return (
        <g {...common}>
          <rect x="0" y="20" width="40" height="32" rx="4" fill="white" />
          <path d="M-6 22 L20 0 L46 22 Z" fill={color} />
          <rect x="15" y="32" width="10" height="20" rx="2" fill="#F5A70B" />
        </g>
      );
    case "briefcase":
      return (
        <g {...common}>
          <rect x="0" y="10" width="44" height="32" rx="6" fill={color} />
          <rect x="14" y="2" width="16" height="10" rx="3" fill="none" stroke={color} strokeWidth="4" />
          <rect x="0" y="22" width="44" height="4" fill="white" opacity="0.5" />
        </g>
      );
    case "palette":
      return (
        <g {...common}>
          <ellipse cx="22" cy="20" rx="26" ry="20" fill="white" />
          <circle cx="10" cy="14" r="5" fill="#F0479A" /><circle cx="22" cy="9" r="5" fill="#FFC53D" /><circle cx="34" cy="14" r="5" fill="#4FB2FF" /><circle cx="30" cy="27" r="5" fill="#4CD47E" />
        </g>
      );
    case "blocks":
      return (
        <g {...common}>
          <rect x="0" y="24" width="22" height="22" rx="4" fill={color} /><rect x="24" y="24" width="22" height="22" rx="4" fill="#FFC53D" /><rect x="12" y="0" width="22" height="22" rx="4" fill="#FF6FB5" />
        </g>
      );
    case "gears":
      return (
        <g {...common}>
          <circle cx="16" cy="16" r="16" fill={color} /><circle cx="16" cy="16" r="6" fill="white" />
          <circle cx="40" cy="34" r="11" fill="#FFC53D" /><circle cx="40" cy="34" r="4" fill="white" />
        </g>
      );
    default:
      return (
        <g {...common}>
          <path d="M0 30 L6 0 L18 16 L26 -4 L34 16 L46 0 L52 30 Z" fill="#FFC53D" stroke="#F5A70B" strokeWidth="2" />
        </g>
      );
  }
}

function LessonSheet({ lesson, s, onClose, onStart }: { lesson: Lesson | null; s: AppData; onClose: () => void; onStart: (id: string, jump?: boolean) => void }) {
  if (!lesson) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;
  const world = WORLDS.find((w) => w.id === lesson.worldId)!;
  const st = lessonState(s, lesson.id);
  const plusLocked = world.plus && s.plan !== "plus";
  const done = st === "done";
  const skill = SKILL_LABELS[lesson.skill];
  const result = s.completed[lesson.id];
  const kinds = Array.from(new Set(lesson.steps.map((x) => x.kind))).filter((k) => k !== "teach");
  const kindLabel: Record<string, string> = { choice: "Quiz", multi: "Multi-select", build: "Prompt builder", compare: "Compare", judge: "Judge the AI", spot: "Spot the error", sort: "Sort it", write: "Write a prompt", image: "Make an image" };

  return (
    <Sheet open={!!lesson} onClose={onClose}>
      <div className="flex items-start gap-3">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-3xl" style={{ background: `linear-gradient(135deg, ${world.theme.from}33, ${world.theme.to}33)` }}>
          {lesson.type === "boss" ? "🏆" : lesson.type === "checkpoint" ? "🎁" : world.theme.icon}
        </span>
        <div>
          <div className="text-xs font-black uppercase tracking-widest text-ink-mute">
            World {world.n} · {lesson.type === "boss" ? "Challenge" : lesson.type === "checkpoint" ? "Checkpoint" : `Lesson ${lesson.index}`}
          </div>
          <h2 className="font-display text-2xl font-semibold leading-tight">{lesson.title}</h2>
          <p className="text-sm text-ink-soft">{lesson.subtitle}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-lav-100 px-3 py-1 text-xs font-bold text-grape-700">{skill.emoji} {skill.label}</span>
        <span className="rounded-full bg-sun-100 px-3 py-1 text-xs font-bold text-ink">+{lesson.xp} XP</span>
        <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-ink">≈ {Math.max(3, Math.round(lesson.steps.length * 0.8))} min</span>
        {kinds.slice(0, 3).map((k) => (
          <span key={k} className="rounded-full bg-mint-100 px-3 py-1 text-xs font-bold text-ink">{kindLabel[k]}</span>
        ))}
      </div>
      {done && result && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-mint-100 p-3 text-sm font-bold text-mint-600">
          <IconCheck size={18} strokeWidth={3} /> Completed · best accuracy {Math.round(result.accuracy * 100)}%
        </div>
      )}
      <div className="mt-5">
        {plusLocked && !done ? (
          <>
            <p className="mb-3 text-sm text-ink-soft">World {world.n} is part of AIBI Plus — advanced skills, unlimited hearts and certificates.</p>
            <Button variant="gold" full href="/plus" onClick={onClose}>
              <Crown size={18} /> Unlock with Plus
            </Button>
          </>
        ) : st === "locked" ? (
          <>
            <p className="mb-3 text-sm text-ink-soft">Complete the lessons before this one to unlock it.</p>
            <Button variant="secondary" full onClick={onClose}>Got it</Button>
          </>
        ) : (
          <Button full onClick={() => onStart(lesson.id)}>
            {done ? "Practise again (+5 XP)" : lesson.type === "boss" ? "Start challenge" : "Start lesson"}
          </Button>
        )}
      </div>
    </Sheet>
  );
}

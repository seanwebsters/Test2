"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { StatsBar } from "@/components/AppChrome";
import Mascot from "@/components/Mascot";
import { Button, Progress, Sheet } from "@/components/ui";
import { Crown, IconArrowRight, IconCheck, IconLock } from "@/components/icons";
import { ALL_LESSONS, SKILL_LABELS, WORLDS } from "@/content/curriculum";
import { LEVEL_LABEL, focusWorlds } from "@/content/profile";
import type { Lesson, World } from "@/content/types";
import { worldProgress } from "@/lib/gamification";
import { isWorldUnlocked, lessonState, nextLesson, useStore, type AppData } from "@/lib/store";
import { play } from "@/lib/feedback";

// Map layout (SVG units match CSS px; the map is 400 wide and centred).
const OFFSETS = [10, 70, 92, 54, -6, -66, -90, -52, 4, 46];
const HEAD = 230; // sky + summit area above the first node
const GAP = 112;
const FOOT = 90;

export default function LearnPage() {
  const s = useStore();
  const router = useRouter();
  const [selected, setSelected] = useState<Lesson | null>(null);
  const currentRef = useRef<HTMLDivElement | null>(null);
  const next = nextLesson(s);
  const doneCount = Object.keys(s.completed).length;
  const pct = doneCount / ALL_LESSONS.length;
  const focus = useMemo(() => (s.profile ? focusWorlds(s.profile) : []), [s.profile]);

  useEffect(() => {
    const t = setTimeout(() => currentRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }), 350);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative bg-gradient-to-b from-lav-100 via-[#EFE9FF] to-lav-100">
      <div className="sticky top-0 z-30 bg-white/95 px-4 pb-3 pt-[calc(12px+var(--safe-top))] shadow-[0_6px_20px_-14px_rgba(46,24,112,0.35)] backdrop-blur-xl">
        <StatsBar hearts={false} />
        <h1 className="mt-3 font-display text-[24px] font-semibold leading-tight">Your AI learning path</h1>
        <div className="mt-0.5 flex items-center gap-1.5 text-[14px] font-semibold text-ink-soft">
          <span>{LEVEL_LABEL[s.profile?.familiarity ?? "beginner"]}</span>
          <span>·</span>
          <span>{Math.round(pct * 100)}% complete</span>
        </div>
        <Progress value={Math.max(pct, 0.03)} className="mt-2 max-w-[230px]" height={10} />
      </div>

      <div className="pb-44">
        {WORLDS.map((w) => (
          <WorldMap key={w.id} world={w} s={s} focus={focus.includes(w.id)} nextId={next?.id} onSelect={setSelected} currentRef={currentRef} />
        ))}
        <div className="flex flex-col items-center px-8 pt-6 text-center">
          <Mascot size={110} mood="wow" sparkles />
          <p className="mt-2 font-display text-lg font-semibold">More worlds are on the way</p>
          <p className="text-sm text-ink-mute">New lessons arrive as AI evolves. Keep your streak going!</p>
        </div>
      </div>

      {next && (
        <div className="fixed bottom-[calc(76px+var(--safe-bottom))] left-1/2 z-30 w-full max-w-[480px] -translate-x-1/2 px-4">
          <motion.button
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            onClick={() => {
              play("tap");
              setSelected(next);
            }}
            className="flex w-full items-center gap-3 rounded-[26px] bg-white p-3.5 text-left shadow-float ring-1 ring-grape-100/70"
          >
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-b from-grape-100 to-grape-200 ring-4 ring-lav-100">
              <Mascot size={40} float={false} bare />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold text-ink-soft">Next lesson</span>
              <span className="block truncate font-display text-[19px] font-semibold leading-tight">{next.title}</span>
              <span className="line-clamp-2 text-[12.5px] leading-snug text-ink-soft">{next.subtitle}</span>
            </span>
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-b from-grape-400 to-grape-600 text-white shadow-[0_4px_14px_-4px_#7C4DFF]">
              <IconArrowRight size={22} strokeWidth={2.8} />
            </span>
          </motion.button>
        </div>
      )}

      <LessonSheet lesson={selected} s={s} onClose={() => setSelected(null)} onStart={(id, jump) => router.push(`/lesson/${id}${jump ? "?jump=1" : ""}`)} />
    </div>
  );
}

function rand(seed: number) {
  let x = seed;
  return () => {
    x = (x * 1664525 + 1013904223) % 4294967296;
    return x / 4294967296;
  };
}

function WorldMap({
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
  const router = useRouter();
  const unlocked = isWorldUnlocked(s, world.id);
  const plusLocked = world.plus && s.plan !== "plus";
  const progress = worldProgress(s, world.id);
  const height = HEAD + (world.lessons.length - 1) * GAP + FOOT;
  const pts = useMemo(() => world.lessons.map((_, i) => [200 + OFFSETS[i % OFFSETS.length], HEAD + i * GAP] as const), [world.lessons]);
  const pathD = useMemo(() => {
    let d = `M 200 ${HEAD - 90} C 200 ${HEAD - 50}, ${pts[0][0]} ${pts[0][1] - 50}, ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      d += ` C ${x0} ${y0 + GAP / 2}, ${x1} ${y1 - GAP / 2}, ${x1} ${y1}`;
    }
    const [lx, ly] = pts[pts.length - 1];
    d += ` C ${lx} ${ly + 40}, 200 ${ly + 40}, 200 ${height}`;
    return d;
  }, [pts, height]);

  return (
    <section className="relative mx-auto w-full overflow-hidden" style={{ height }}>
      <div className="absolute left-1/2 top-0 h-full w-[400px] -translate-x-1/2">
        <Landscape world={world} height={height} pathD={pathD} pts={pts} />

        {/* World sign on the summit */}
        <div className="absolute left-1/2 top-[18px] z-10 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-full bg-white/95 py-1.5 pl-1.5 pr-4 shadow-card ring-1 ring-grape-100">
            <span className="grid h-8 w-8 place-items-center rounded-full text-base" style={{ background: `linear-gradient(135deg, ${world.theme.from}, ${world.theme.to})` }}>
              {world.theme.icon}
            </span>
            <span className="whitespace-nowrap">
              <span className="block text-[10px] font-black uppercase tracking-widest text-ink-mute">
                World {world.n}
                {focus ? " · For you" : ""}
                {world.plus ? " · Plus" : ""}
              </span>
              <span className="block font-display text-[15px] font-semibold leading-none">{world.title}</span>
            </span>
            {unlocked && !plusLocked && <span className="ml-1 text-xs font-black text-grape-600">{Math.round(progress * 100)}%</span>}
          </div>
          {(plusLocked || !unlocked) && (
            <div className="mt-2 flex justify-center">
              {plusLocked ? (
                <Button variant="gold" size="sm" href="/plus">
                  <Crown size={16} /> Unlock with Plus
                </Button>
              ) : (
                <Button variant="white" size="sm" onClick={() => router.push(`/lesson/${world.id}-l5?jump=1`)}>
                  <IconLock size={14} /> Jump here
                </Button>
              )}
            </div>
          )}
        </div>

        {world.lessons.map((l, i) => {
          const st = lessonState(s, l.id);
          const isCurrent = l.id === nextId;
          const [x, y] = pts[i];
          return (
            <div key={l.id} ref={isCurrent ? currentRef : undefined} className="absolute z-10" style={{ left: x, top: y, transform: "translate(-50%, -50%)" }}>
              <Node lesson={l} state={st} current={isCurrent} plusLocked={plusLocked} onClick={() => onSelect(l)} />
              {isCurrent && (
                <div className="pointer-events-none absolute top-1/2 -translate-y-[62%]" style={x >= 200 ? { right: "calc(100% + 2px)" } : { left: "calc(100% + 2px)" }}>
                  <Mascot size={96} wave mood="happy" sparkles />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function NodeIcon({ lesson }: { lesson: Lesson }) {
  if (lesson.type === "boss")
    return (
      <svg width="34" height="34" viewBox="0 0 24 24" fill="white" aria-hidden>
        <path d="M7 3h10v2h3v2a4 4 0 0 1-4 4h-.3A5 5 0 0 1 13 13.9V17h3v3H8v-3h3v-3.1A5 5 0 0 1 8.3 11H8a4 4 0 0 1-4-4V5h3zm-1 4a2 2 0 0 0 1.2 1.8A5 5 0 0 1 7 7.5V7zm12 0v.5a5 5 0 0 1-.2 1.3A2 2 0 0 0 18 7z" />
      </svg>
    );
  if (lesson.type === "checkpoint")
    return (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="white" aria-hidden>
        <path d="M4 10h16v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zm-1-4h18v3H3zm8 0h2v15h-2zM12 6c-1-2.5-4.5-3-5-1s3 1 5 1zm0 0c1-2.5 4.5-3 5-1s-3 1-5 1z" />
      </svg>
    );
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" aria-hidden>
      <path d="M12 3.5c5 0 9 3.3 9 7.4s-4 7.4-9 7.4c-1 0-2-.1-2.9-.4L5 20l1-3.7C4.2 15 3 13 3 10.9 3 6.8 7 3.5 12 3.5z" fill="white" />
      <circle cx="8" cy="11" r="1.5" fill="#7C4DFF" />
      <circle cx="12" cy="11" r="1.5" fill="#7C4DFF" />
      <circle cx="16" cy="11" r="1.5" fill="#7C4DFF" />
    </svg>
  );
}

function Node({ lesson, state, current, plusLocked, onClick }: { lesson: Lesson; state: string; current: boolean; plusLocked: boolean; onClick: () => void }) {
  const done = state === "done";
  const locked = state === "locked" || (plusLocked && !done);
  const big = current || lesson.type !== "lesson";
  const w = big ? 96 : 84;
  const top = done ? ["#6BE08F", "#2DBE63"] : locked ? ["#FBFAFE", "#DCD6E8"] : ["#B79BFF", "#7C4DFF"];
  const side = done ? "#1E9A4C" : locked ? "#B9B1CC" : "#5726CC";
  return (
    <div className="relative" style={{ width: w, height: w * 0.86 }}>
      {current && (
        <>
          <span className="absolute -inset-3 animate-pulseRing rounded-full bg-sun-300/50" />
          <span className="absolute -inset-[7px] rounded-[50%] bg-gradient-to-b from-sun-300 to-sun-500 shadow-[0_0_30px_6px_rgba(255,197,61,0.55)]" style={{ top: -7, bottom: 1 }} />
        </>
      )}
      <motion.button
        whileTap={{ y: 6 }}
        onClick={() => {
          play("tap");
          onClick();
        }}
        aria-label={`${lesson.title}${done ? " (completed)" : locked ? " (locked)" : ""}`}
        className="absolute inset-0"
      >
        {/* puck side */}
        <span className="absolute inset-x-0 bottom-0 rounded-[50%]" style={{ height: "78%", background: side, boxShadow: "0 14px 22px -8px rgba(46,24,112,0.45)" }} />
        {/* puck top */}
        <span className="absolute inset-x-0 top-0 grid place-items-center rounded-[50%]" style={{ height: "78%", background: `radial-gradient(120% 90% at 35% 25%, ${top[0]}, ${top[1]})` }}>
          <span className="absolute left-[22%] right-[30%] top-[10%] h-[18%] rounded-[50%] bg-white/45 blur-[1px]" />
          <span className="relative">
            {done ? (
              <IconCheck size={40} strokeWidth={3.6} className="text-white drop-shadow" />
            ) : locked ? (
              plusLocked ? <Crown size={32} /> : <IconLock size={30} strokeWidth={2.6} className="text-[#7E7598]" />
            ) : (
              <NodeIcon lesson={lesson} />
            )}
          </span>
        </span>
      </motion.button>
    </div>
  );
}

function Tree({ x, y, s, tone }: { x: number; y: number; s: number; tone: [string, string, string] }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="26" rx="18" ry="5" fill="#000" opacity="0.08" />
      <rect x="-3.5" y="8" width="7" height="18" rx="3" fill="#8A6A4A" />
      <circle cx="0" cy="-2" r="17" fill={tone[1]} />
      <circle cx="-11" cy="8" r="12" fill={tone[0]} />
      <circle cx="11" cy="8" r="12" fill={tone[2]} />
      <circle cx="-5" cy="-9" r="6" fill="#fff" opacity="0.22" />
    </g>
  );
}

function Landscape({ world, height, pathD, pts }: { world: World; height: number; pathD: string; pts: readonly (readonly [number, number])[] }) {
  const t = world.theme;
  const id = world.id;
  const trees = useMemo(() => {
    const r = rand(world.n * 7919);
    const out: { x: number; y: number; s: number }[] = [];
    for (let y = HEAD - 30; y < height - 30; y += 44) {
      for (const side of [0, 1]) {
        if (r() < 0.2) continue;
        const x = side ? 330 + r() * 60 : 8 + r() * 58;
        // keep clear of the path
        if (pts.some(([px, py]) => Math.abs(px - x) < 62 && Math.abs(py - y) < 70)) continue;
        out.push({ x, y, s: 0.7 + r() * 0.55 });
      }
    }
    return out;
  }, [world.n, height, pts]);
  const tones: [string, string, string] = [t.ground, t.ground2, "#3FA65A"];
  const flowers = useMemo(() => {
    const r = rand(world.n * 104729);
    return Array.from({ length: 22 }, () => ({ x: r() * 400, y: HEAD + r() * (height - HEAD - 30), c: ["#FFD66B", "#FF9FC9", "#FFFFFF", "#C8B6FF"][Math.floor(r() * 4)] }));
  }, [world.n, height]);

  return (
    <svg className="absolute inset-0" width="400" height={height} viewBox={`0 0 400 ${height}`} aria-hidden>
      <defs>
        <linearGradient id={`g-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={t.ground} />
          <stop offset="1" stopColor={t.ground2} />
        </linearGradient>
        <linearGradient id={`m-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#C9B8FF" />
          <stop offset="1" stopColor="#A996EA" />
        </linearGradient>
        <filter id={`soft-${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      {/* distant lilac mountains */}
      <path d={`M-20 ${HEAD - 40} L60 70 L120 ${HEAD - 70} L190 40 L270 ${HEAD - 80} L330 80 L420 ${HEAD - 40} V${HEAD + 40} H-20Z`} fill={`url(#m-${id})`} opacity="0.75" />
      <path d={`M150 70 L190 40 L222 72 L206 66 L190 78 L172 66Z`} fill="#fff" opacity="0.8" />
      {/* clouds */}
      {[
        [40, 120, 1],
        [318, 150, 0.85],
        [250, 30, 0.6],
      ].map(([x, y, sc], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${sc})`} opacity="0.95">
          <ellipse cx="22" cy="12" rx="28" ry="15" fill="#fff" />
          <ellipse cx="50" cy="6" rx="24" ry="18" fill="#fff" />
          <ellipse cx="72" cy="14" rx="20" ry="12" fill="#fff" />
        </g>
      ))}
      {/* summit hill with flag */}
      <path d={`M-20 ${HEAD - 10} Q60 ${HEAD - 90} 140 ${HEAD - 110} Q200 ${HEAD - 150} 260 ${HEAD - 110} Q340 ${HEAD - 90} 420 ${HEAD - 10} V${height} H-20Z`} fill={`url(#g-${id})`} />
      <path d={`M140 ${HEAD - 110} Q200 ${HEAD - 150} 260 ${HEAD - 110} Q200 ${HEAD - 128} 140 ${HEAD - 110}Z`} fill="#fff" opacity="0.18" />
      {/* rolling side hills */}
      {Array.from({ length: Math.ceil((height - HEAD) / 200) + 1 }, (_, i) => (
        <g key={i}>
          <ellipse cx={i % 2 ? 430 : -30} cy={HEAD + 60 + i * 200} rx="140" ry="90" fill={t.ground2} opacity="0.6" />
          <ellipse cx={i % 2 ? -20 : 420} cy={HEAD + 160 + i * 200} rx="110" ry="70" fill="#fff" opacity="0.1" />
        </g>
      ))}
      {flowers.map((f, i) => (
        <circle key={i} cx={f.x} cy={f.y} r="2.4" fill={f.c} opacity="0.85" />
      ))}
      {/* path: shadow, base, highlight */}
      <path d={pathD} stroke="#2E1870" strokeOpacity="0.12" strokeWidth="50" fill="none" strokeLinecap="round" transform="translate(0 6)" filter={`url(#soft-${id})`} />
      <path d={pathD} stroke="#F6F2FF" strokeWidth="44" fill="none" strokeLinecap="round" />
      <path d={pathD} stroke="#E4DCF9" strokeWidth="44" fill="none" strokeLinecap="round" strokeDasharray="1 26" strokeOpacity="0.9" />
      {/* flag on the summit */}
      <g transform={`translate(214 ${HEAD - 152})`}>
        <rect x="0" y="0" width="4" height="56" rx="2" fill="#5B4B8A" />
        <path d="M4 2 L46 12 L4 26 Z" fill={t.from} />
        <path d="M14 18 L20 8 L26 18" stroke="#fff" strokeWidth="3.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {trees.map((tr, i) => (
        <Tree key={i} x={tr.x} y={tr.y} s={tr.s} tone={tones} />
      ))}
      {/* bottom fade into the next world */}
      <path d={`M-20 ${height} Q100 ${height - 34} 200 ${height - 18} T420 ${height - 22} V${height + 2} H-20Z`} fill="#EFE9FF" />
    </svg>
  );
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

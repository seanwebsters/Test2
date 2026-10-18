"use client";

import { useEffect, useState } from "react";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

export function Countdown({ to, compact, onDone }: { to: number; compact?: boolean; onDone?: () => void }) {
  const [t, setT] = useState<number | null>(null);
  useEffect(() => {
    setT(Date.now());
    const i = setInterval(() => setT(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  useEffect(() => {
    if (t !== null && t >= to) onDone?.();
  }, [t, to, onDone]);
  if (t === null) return <span className="tabular-nums opacity-60">--:--:--</span>;
  const p = parts(to - t);
  const pad = (n: number) => String(n).padStart(2, "0");
  if (compact) return <span className="tabular-nums">{p.d > 0 ? `${p.d}d ${p.h}h` : `${pad(p.h)}:${pad(p.m)}:${pad(p.s)}`}</span>;
  return (
    <span className="inline-flex gap-2 tabular-nums" role="timer" aria-label={`${p.d} days ${p.h} hours ${p.m} minutes`}>
      {p.d > 0 && <Unit v={p.d} l="days" />}
      <Unit v={pad(p.h)} l="hrs" />
      <Unit v={pad(p.m)} l="min" />
      <Unit v={pad(p.s)} l="sec" />
    </span>
  );
}

function Unit({ v, l }: { v: number | string; l: string }) {
  return (
    <span className="flex min-w-[3.2rem] flex-col items-center rounded-xl bg-white/[0.06] px-2 py-1.5">
      <span className="text-xl font-extrabold leading-none">{v}</span>
      <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.16em] text-bone-3">{l}</span>
    </span>
  );
}

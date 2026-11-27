"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useMemo } from "react";

const COLORS = ["#7C4DFF", "#FFC53D", "#FF6FB5", "#4CD47E", "#4FB2FF", "#BCA3FF"];

export default function Confetti({ count = 70, burst = 0 }: { count?: number; burst?: number }) {
  const reduce = useReducedMotion();
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: `${burst}-${i}`,
        x: (Math.random() - 0.5) * 420,
        y: -Math.random() * 380 - 120,
        r: Math.random() * 720 - 360,
        c: COLORS[i % COLORS.length],
        w: 6 + Math.random() * 6,
        h: 8 + Math.random() * 10,
        d: 1.6 + Math.random() * 1.2,
        round: Math.random() > 0.6,
      })),
    [count, burst],
  );
  if (reduce) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden" aria-hidden>
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute left-1/2 top-1/2"
          style={{ width: p.w, height: p.round ? p.w : p.h, background: p.c, borderRadius: p.round ? 999 : 2 }}
          initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
          animate={{ x: p.x, y: [0, p.y, p.y + 700], rotate: p.r, opacity: [1, 1, 0] }}
          transition={{ duration: p.d, ease: [0.15, 0.6, 0.4, 1], times: [0, 0.35, 1] }}
        />
      ))}
    </div>
  );
}

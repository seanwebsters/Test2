"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { Pip } from "@/components/brand/Pip";
import { cn } from "@/lib/cn";

export function ProgressBar({ value, className, tone = "teal", label }: { value: number; className?: string; tone?: "teal" | "coral" | "sun" | "lavender"; label?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const fill = { teal: "bg-teal", coral: "bg-coral", sun: "bg-sun", lavender: "bg-lavender" }[tone];
  return (
    <div className={cn("h-2.5 w-full overflow-hidden rounded-full bg-surface-3", className)} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <motion.div className={cn("h-full rounded-full", fill)} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }} />
    </div>
  );
}

export function ProgressRing({ value, size = 64, stroke = 7, children, tone = "#0EAA9C" }: { value: number; size?: number; stroke?: number; children?: ReactNode; tone?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgb(var(--surface-3))" strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={tone}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - v) }}
          transition={{ duration: 1, ease: [0.2, 0.8, 0.2, 1] }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

export function Sheet({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    setTimeout(() => ref.current?.querySelector<HTMLElement>("input,textarea,button,[tabindex]")?.focus(), 50);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus();
    };
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button aria-label="Close" className="absolute inset-0 bg-navy/50 backdrop-blur-[2px]" onClick={onClose} />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn("relative max-h-[92dvh] w-full overflow-y-auto rounded-t-4xl bg-bg p-5 pb-8 shadow-lift sm:rounded-4xl", wide ? "sm:max-w-2xl" : "sm:max-w-lg")}
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
          >
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-surface-3 sm:hidden" />
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 className="h-display text-xl">{title}</h2>
              <button onClick={onClose} className="focus-ring -mr-1 rounded-full p-1.5 text-ink-3 hover:bg-surface-2" aria-label="Close">
                <X size={20} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Pill({ children, tone = "surface", className }: { children: ReactNode; tone?: "surface" | "teal" | "coral" | "sun" | "lavender" | "mint" | "ink"; className?: string }) {
  const tones = {
    surface: "bg-surface-2 text-ink-2",
    teal: "bg-teal-soft text-teal-deep dark:text-teal",
    coral: "bg-coral-soft text-coral",
    sun: "bg-sun-soft text-[#9A6A00] dark:text-sun",
    lavender: "bg-lavender-soft text-[#5B47C9] dark:text-lavender",
    mint: "bg-mint-soft text-teal-deep dark:text-mint",
    ink: "bg-ink text-bg",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold", tones[tone], className)}>{children}</span>;
}

export function EmptyState({ title, body, action, mood = "curious" }: { title: string; body: string; action?: ReactNode; mood?: "curious" | "happy" | "sleepy" | "thinking" }) {
  return (
    <div className="card flex flex-col items-center gap-3 p-8 text-center">
      <Pip mood={mood} size={84} />
      <h3 className="h-display text-lg">{title}</h3>
      <p className="max-w-sm text-sm text-ink-2">{body}</p>
      {action}
    </div>
  );
}

export function SectionTitle({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
        <h2 className="h-display text-xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}

"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import type React from "react";
import { useEffect } from "react";
import { play } from "@/lib/feedback";
import { IconClose } from "./icons";

type Variant = "primary" | "secondary" | "ghost" | "success" | "danger" | "gold" | "white";

const variants: Record<Variant, string> = {
  primary: "bg-gradient-to-b from-grape-500 to-grape-600 text-white shadow-[0_4px_0_0_#43209C] active:shadow-[0_1px_0_0_#43209C]",
  secondary: "bg-white text-grape-700 border-2 border-grape-100 shadow-[0_4px_0_0_#E3DBFF] active:shadow-[0_1px_0_0_#E3DBFF]",
  ghost: "bg-transparent text-grape-600",
  success: "bg-gradient-to-b from-mint-400 to-mint-500 text-white shadow-[0_4px_0_0_#1C8A45] active:shadow-[0_1px_0_0_#1C8A45]",
  danger: "bg-gradient-to-b from-coral-400 to-coral-500 text-white shadow-[0_4px_0_0_#B8322A] active:shadow-[0_1px_0_0_#B8322A]",
  gold: "bg-gradient-to-b from-sun-300 to-sun-400 text-ink shadow-[0_4px_0_0_#D98E00] active:shadow-[0_1px_0_0_#D98E00]",
  white: "bg-white text-grape-700 shadow-[0_4px_0_0_rgba(46,24,112,0.25)] active:shadow-[0_1px_0_0_rgba(46,24,112,0.25)]",
};

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "md" | "lg" | "sm";
  full?: boolean;
  href?: string;
}

export function Button({ variant = "primary", size = "lg", full, className = "", href, children, onClick, disabled, ...rest }: BtnProps) {
  const cls = [
    "relative inline-flex items-center justify-center gap-2 font-display font-semibold select-none",
    "transition-[transform,box-shadow,opacity] duration-100 active:translate-y-[3px]",
    "disabled:opacity-45 disabled:pointer-events-none",
    size === "lg" ? "h-14 px-6 text-[17px] rounded-2xl" : size === "md" ? "h-11 px-5 text-[15px] rounded-xl" : "h-9 px-4 text-sm rounded-xl",
    full ? "w-full" : "",
    variants[variant],
    className,
  ].join(" ");
  if (href) {
    return (
      <Link
        href={href}
        className={cls}
        onClick={(e) => {
          play("tap");
          onClick?.(e as unknown as React.MouseEvent<HTMLButtonElement>);
        }}
      >
        {children}
      </Link>
    );
  }
  return (
    <button
      className={cls}
      disabled={disabled}
      onClick={(e) => {
        play("tap");
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Card({ children, className = "", onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={`rounded-3xl bg-white shadow-card ring-1 ring-grape-100/60 ${onClick ? "cursor-pointer active:scale-[0.99] transition-transform" : ""} ${className}`}>
      {children}
    </div>
  );
}

export function Progress({ value, className = "", color = "grape", height = 12 }: { value: number; className?: string; color?: "grape" | "mint" | "sun" | "white"; height?: number }) {
  const fills = {
    grape: "from-grape-400 to-grape-600",
    mint: "from-mint-400 to-mint-500",
    sun: "from-sun-300 to-sun-500",
    white: "from-white to-white",
  };
  return (
    <div className={`relative w-full overflow-hidden rounded-full ${color === "white" ? "bg-white/30" : "bg-grape-100"} ${className}`} style={{ height }}>
      <motion.div
        className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${fills[color]}`}
        initial={false}
        animate={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
      >
        <div className="absolute left-2 right-2 top-[3px] h-[3px] rounded-full bg-white/45" />
      </motion.div>
    </div>
  );
}

export function Sheet({ open, onClose, children, title, dismissable = true }: { open: boolean; onClose: () => void; children: ReactNode; title?: string; dismissable?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && dismissable && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, dismissable]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={() => dismissable && onClose()} />
          <motion.div
            role="dialog"
            aria-modal
            className="relative z-10 w-full max-w-[480px] max-h-[92dvh] overflow-y-auto no-scrollbar rounded-t-[32px] bg-white px-5 pt-3 pb-[calc(20px+var(--safe-bottom))]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
          >
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-grape-100" />
            {(title || dismissable) && (
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold">{title}</h2>
                {dismissable && (
                  <button aria-label="Close" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-lav-100 text-ink-soft active:scale-95">
                    <IconClose size={18} />
                  </button>
                )}
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Pill({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold ${className}`}>{children}</span>;
}

export function PlusBadge({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-sun-300 to-sun-400 px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-ink ${className}`}>
      ✦ Plus
    </span>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={`relative h-7 w-12 rounded-full transition-colors ${on ? "bg-grape-500" : "bg-grape-100"}`}>
      <motion.span layout className="absolute top-1 h-5 w-5 rounded-full bg-white shadow" style={{ left: on ? 24 : 4 }} />
    </button>
  );
}

/** Renders AI text with light markdown: **bold**, bullets, numbered lists, tables, headings, blockquotes. */
export function RichText({ text, className = "" }: { text: string; className?: string }) {
  const lines = text.split("\n");
  const out: ReactNode[] = [];
  let i = 0;
  const inline = (s: string, k: string | number) => {
    const parts = s.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
    return parts.map((p, j) => {
      if (p.startsWith("**") && p.endsWith("**")) return <strong key={`${k}-${j}`}>{p.slice(2, -2)}</strong>;
      if (p.startsWith("`") && p.endsWith("`")) return <code key={`${k}-${j}`}>{p.slice(1, -1)}</code>;
      if (p.startsWith("*") && p.endsWith("*") && p.length > 2) return <em key={`${k}-${j}`}>{p.slice(1, -1)}</em>;
      return <span key={`${k}-${j}`}>{p}</span>;
    });
  };
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*\|/.test(line)) {
      const rows: string[][] = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) {
        const cells = lines[i].trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells);
        i++;
      }
      const [head, ...body] = rows;
      out.push(
        <div key={`t${i}`} className="overflow-x-auto no-scrollbar">
          <table>
            <thead><tr>{head?.map((c, j) => <th key={j}>{inline(c, j)}</th>)}</tr></thead>
            <tbody>{body.map((r, ri) => <tr key={ri}>{r.map((c, j) => <td key={j}>{inline(c, j)}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      );
      continue;
    }
    if (/^\s*([•\-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([•\-*]|\d+\.)\s+/.test(lines[i]) && /^\s*\d+\./.test(lines[i]) === ordered) {
        items.push(lines[i].replace(/^\s*([•\-*]|\d+\.)\s+/, ""));
        i++;
      }
      const L = ordered ? "ol" : "ul";
      out.push(<L key={`l${i}`}>{items.map((it, j) => <li key={j}>{inline(it, j)}</li>)}</L>);
      continue;
    }
    if (/^#{1,4}\s/.test(line)) out.push(<h3 key={i}>{inline(line.replace(/^#+\s/, ""), i)}</h3>);
    else if (/^>\s?/.test(line)) out.push(<blockquote key={i}>{inline(line.replace(/^>\s?/, ""), i)}</blockquote>);
    else if (line.trim() === "") out.push(<div key={i} className="h-1" />);
    else out.push(<p key={i}>{inline(line, i)}</p>);
    i++;
  }
  return <div className={`prose-ai ${className}`}>{out}</div>;
}

export function Chip({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button
      onClick={() => {
        play("tap");
        onClick?.();
      }}
      className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-bold transition-all active:scale-95 ${active ? "bg-grape-500 text-white shadow-tactile-sm" : "bg-white text-ink-soft ring-1 ring-grape-100"}`}
    >
      {children}
    </button>
  );
}

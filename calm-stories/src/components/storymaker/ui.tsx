"use client";

import { useEffect, useState } from "react";
import { cx } from "@/lib/util";

export const inputCls = "w-full rounded-xl border border-white/10 bg-night-2 px-3 py-2 text-sm placeholder:text-mist/50 focus:border-lavender/60 focus:outline-none disabled:opacity-60";

export function PanelHeader({ title, hint, children }: { title: string; hint?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="font-serif text-3xl font-semibold">{title}</h2>
        {hint && <p className="mt-1 text-sm text-mist">{hint}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function Btn({ variant = "ghost", className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "outline" | "danger" }) {
  return (
    <button
      {...p}
      className={cx(
        "rounded-full px-4 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        variant === "primary" && "bg-white font-semibold text-night hover:bg-white/90",
        variant === "outline" && "border border-white/15 hover:border-lavender/60",
        variant === "ghost" && "text-mist hover:text-white",
        variant === "danger" && "text-rose-200 hover:text-rose-100",
        className,
      )}
    />
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-mist">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-mist/70">{hint}</span>}
    </label>
  );
}

/** A text area bound to a list of strings (one per line). */
export function LinesField({ label, value, onChange, disabled, hint }: { label: string; value: string[]; onChange: (v: string[]) => void; disabled?: boolean; hint?: string }) {
  const [text, setText] = useState(value.join("\n"));
  useEffect(() => setText(value.join("\n")), [value]);
  return (
    <Field label={label} hint={hint ?? "One per line"}>
      <textarea
        disabled={disabled}
        rows={Math.min(8, Math.max(2, value.length + 1))}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => onChange(text.split("\n").map((l) => l.trim()).filter(Boolean))}
        className={inputCls}
      />
    </Field>
  );
}

export function StatusPill({ status }: { status: string }) {
  const tone: Record<string, string> = {
    planned: "bg-white/10 text-mist",
    draft: "bg-white/10 text-mist",
    script_ready: "bg-periwinkle/20 text-periwinkle",
    audio_ready: "bg-lavender/20 text-lavender",
    in_review: "bg-amber-300/15 text-amber-200",
    changes_requested: "bg-rose-300/15 text-rose-200",
    approved: "bg-emerald-300/15 text-emerald-200",
    published: "bg-emerald-300/20 text-emerald-100",
    rejected: "bg-rose-300/15 text-rose-200",
    queued: "bg-white/10 text-mist",
    running: "bg-periwinkle/20 text-periwinkle",
    paused: "bg-amber-300/15 text-amber-200",
    succeeded: "bg-emerald-300/15 text-emerald-200",
    failed: "bg-rose-300/15 text-rose-200",
    cancelled: "bg-white/10 text-mist",
    pending: "bg-amber-300/15 text-amber-200",
    archived: "bg-white/10 text-mist",
    removed: "bg-rose-300/15 text-rose-200",
    open: "bg-amber-300/15 text-amber-200",
    actioned: "bg-emerald-300/15 text-emerald-200",
    dismissed: "bg-white/10 text-mist",
  };
  return <span className={cx("rounded-full px-2 py-0.5 text-[11px] capitalize", tone[status] ?? "bg-white/10 text-mist")}>{status.replace(/_/g, " ")}</span>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-3xl border border-dashed border-white/15 p-8 text-center text-sm text-mist">{children}</div>;
}

/** False during server rendering and hydration; true once running in the browser (for local-time UI). */
export function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

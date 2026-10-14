"use client";

import { useEffect, useState } from "react";
import { cx } from "@/lib/util";

/** Inline-editable text field that saves on blur when the value changed. */
export function EditableText({
  label,
  value,
  onSave,
  multiline = false,
  rows = 4,
  placeholder,
  className,
  disabled,
}: {
  label: string;
  value: string;
  onSave: (v: string) => Promise<void> | void;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [v, setV] = useState(value);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  useEffect(() => setV(value), [value]);
  const commit = async () => {
    if (v === value) return;
    setState("saving");
    try {
      await onSave(v);
      setState("saved");
      setTimeout(() => setState("idle"), 1500);
    } catch {
      setState("idle");
      setV(value);
    }
  };
  const id = `f-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div className={className}>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="label">{label}</label>
        <span className="text-[10px] text-mist" aria-live="polite">{state === "saving" ? "Saving…" : state === "saved" ? "Saved" : ""}</span>
      </div>
      {multiline ? (
        <textarea id={id} value={v} rows={rows} disabled={disabled} placeholder={placeholder} onChange={(e) => setV(e.target.value)} onBlur={commit} className={cx("input resize-y leading-relaxed")} />
      ) : (
        <input id={id} value={v} disabled={disabled} placeholder={placeholder} onChange={(e) => setV(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} className="input" />
      )}
    </div>
  );
}

/** Editable list of short strings (rules, themes, facts, threads). */
export function ListEditor({ label, items, onSave, placeholder }: { label: string; items: string[]; onSave: (items: string[]) => Promise<void>; placeholder?: string }) {
  const [draft, setDraft] = useState("");
  return (
    <div>
      <div className="label">{label}</div>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={`${i}-${it}`} className="group flex items-start gap-2 rounded-xl bg-white/[0.03] px-3 py-2 text-sm">
            <span className="flex-1">{it}</span>
            <button className="text-xs text-mist opacity-60 hover:text-rose-300 group-hover:opacity-100" aria-label={`Remove “${it}”`} onClick={() => onSave(items.filter((_, j) => j !== i))}>
              Remove
            </button>
          </li>
        ))}
        {items.length === 0 && <li className="text-xs text-mist">None yet.</li>}
      </ul>
      <form
        className="mt-2 flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!draft.trim()) return;
          await onSave([...items, draft.trim()]);
          setDraft("");
        }}
      >
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={placeholder ?? "Add…"} aria-label={`Add to ${label}`} className="input py-1.5 text-sm" />
        <button className="btn-ghost btn-sm" type="submit">Add</button>
      </form>
    </div>
  );
}

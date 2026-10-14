"use client";

import { useEffect, useRef } from "react";

/** A modal confirmation for admin actions that can't be undone (public release, removal). */
export function ConfirmModal({ open, title, body, confirmLabel = "Confirm", onConfirm, onCancel, busy }: { open: boolean; title: string; body: string; confirmLabel?: string; onConfirm: () => void; onCancel: () => void; busy?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      aria-labelledby="admin-confirm-title"
      className="w-[min(92vw,28rem)] rounded-3xl border border-white/10 bg-night-2 p-0 text-white backdrop:bg-black/60"
    >
      {open && (
        <div className="p-6">
          <h2 id="admin-confirm-title" className="font-serif text-2xl font-semibold">{title}</h2>
          <p className="mt-3 text-sm text-mist">{body}</p>
          <div className="mt-6 flex justify-end gap-3">
            <button onClick={onCancel} className="rounded-full px-4 py-2 text-sm text-mist hover:text-white">Cancel</button>
            <button disabled={busy} onClick={onConfirm} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-night disabled:opacity-50">{confirmLabel}</button>
          </div>
        </div>
      )}
    </dialog>
  );
}

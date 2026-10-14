"use client";

import { useEffect, useRef } from "react";
import { useWorkspace } from "./WorkspaceContext";

/** Confirmation for destructive changes, paid jobs and public release. */
export function ConfirmDialog() {
  const { confirm, resolve, busy } = useWorkspace();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (confirm && !d.open) d.showModal();
    if (!confirm && d.open) d.close();
  }, [confirm]);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        if (confirm) void resolve(confirm.tool_call_id, "cancel");
      }}
      className="w-[min(92vw,28rem)] rounded-3xl border border-white/10 bg-night-2 p-0 text-white backdrop:bg-black/60"
      aria-labelledby="confirm-title"
    >
      {confirm && (
        <div className="p-6">
          <h2 id="confirm-title" className="font-serif text-2xl font-semibold">
            Please confirm
          </h2>
          <p className="mt-3 text-sm text-mist">{confirm.reason}</p>
          <div className="mt-6 flex justify-end gap-3">
            <button onClick={() => resolve(confirm.tool_call_id, "cancel")} className="rounded-full px-4 py-2 text-sm text-mist hover:text-white">
              Cancel
            </button>
            <button disabled={!!busy} onClick={() => resolve(confirm.tool_call_id, "confirm")} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-night disabled:opacity-50">
              Confirm
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}

"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { btn } from "@/components/ui/styles";
import { ApiError, post } from "@/lib/view/client-api";

export const field = "mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm focus:border-white/30 focus:outline-none";
export const lbl = "block text-[12px] font-semibold text-bone-2";

/** Generic JSON form: collects named inputs, POSTs, refreshes (or redirects). */
export function JsonForm({ url, children, submit, extra, transform, redirect, className = "" }: { url: string; children: ReactNode; submit: string; extra?: Record<string, unknown>; transform?: (v: Record<string, unknown>) => Record<string, unknown>; redirect?: (res: unknown) => string | undefined; className?: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string }>();
  const [busy, setBusy] = useState(false);
  return (
    <form
      className={className}
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const v: Record<string, unknown> = { ...extra };
        for (const [k, val] of fd.entries()) {
          if (k.endsWith("[]")) v[k.slice(0, -2)] = [...((v[k.slice(0, -2)] as unknown[]) ?? []), val];
          else v[k] = val;
        }
        setBusy(true);
        try {
          const res = await post(url, transform ? transform(v) : v);
          setMsg({ ok: true, text: "Saved" });
          const to = redirect?.(res);
          if (to) router.push(to);
          else router.refresh();
          if (!to) (e.target as HTMLFormElement).reset?.();
        } catch (err) {
          setMsg({ ok: false, text: err instanceof ApiError ? err.message : "Failed" });
        } finally {
          setBusy(false);
        }
      }}
    >
      {children}
      <div className="mt-4 flex items-center gap-3">
        <button className={btn("primary", "sm")} disabled={busy}>{busy ? "Saving…" : submit}</button>
        {msg && <span className={`text-[12px] ${msg.ok ? "text-uncommon" : "text-red-300"}`} role="status">{msg.text}</span>}
      </div>
    </form>
  );
}

export function Upload({ universeId, cardId, label }: { universeId: string; cardId?: string; label: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string>();
  return (
    <label className={`${btn("glass", "sm")} cursor-pointer`}>
      {label}
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const fd = new FormData();
          fd.set("file", f);
          fd.set("universeId", universeId);
          if (cardId) fd.set("cardId", cardId);
          const res = await fetch("/api/studio/upload", { method: "POST", body: fd });
          const d = (await res.json()) as { message?: string };
          setMsg(res.ok ? "Uploaded" : d.message ?? "Upload failed");
          router.refresh();
        }}
      />
      {msg && <span className="ml-2 text-[11px] text-bone-3">{msg}</span>}
    </label>
  );
}

export function SelectPatch({ url, body, name, value, options }: { url: string; body: Record<string, unknown>; name: string; value: string; options: string[] }) {
  const router = useRouter();
  const [v, setV] = useState(value);
  return (
    <select
      className="rounded-lg border border-white/10 bg-ink-3 px-2 py-1 text-[12px]"
      value={v}
      aria-label={name}
      onChange={async (e) => {
        setV(e.target.value);
        try {
          await post(url, { ...body, [name]: e.target.value });
          router.refresh();
        } catch {
          setV(value);
        }
      }}
    >
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

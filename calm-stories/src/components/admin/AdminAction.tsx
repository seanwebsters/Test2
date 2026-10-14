"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { cx } from "@/lib/util";

/** Button that POSTs/PUTs JSON to an admin endpoint, then refreshes server data. */
export function AdminAction({
  endpoint,
  body,
  method = "POST",
  label,
  pendingLabel,
  confirmText,
  className,
  onDone,
}: {
  endpoint: string;
  body?: unknown;
  method?: "POST" | "PUT";
  label: string;
  pendingLabel?: string;
  confirmText?: string;
  className?: string;
  onDone?: (data: unknown) => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col">
      <button
        className={cx("btn-ghost btn-sm", className)}
        disabled={pending}
        onClick={() => {
          if (confirmText && !window.confirm(confirmText)) return;
          setError(null);
          start(async () => {
            const res = await fetch(endpoint, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body ?? {}) });
            const data = (await res.json().catch(() => ({}))) as { error?: string };
            if (!res.ok) setError(data.error ?? "Failed");
            else {
              onDone?.(data);
              router.refresh();
            }
          });
        }}
      >
        {pending ? pendingLabel ?? "Working…" : label}
      </button>
      {error && <span role="alert" className="mt-1 text-[11px] text-rose-300">{error}</span>}
    </span>
  );
}

/** Re-fetch server components periodically while something is in progress. */
export function AutoRefresh({ active, intervalMs = 2000 }: { active: boolean; intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(t);
  }, [active, intervalMs, router]);
  return null;
}

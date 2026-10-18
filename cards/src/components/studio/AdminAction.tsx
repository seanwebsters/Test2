"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { btn, type BtnKind } from "@/components/ui/styles";
import { ApiError, post } from "@/lib/view/client-api";

/** A button that POSTs JSON to an admin endpoint and refreshes the page. */
export function AdminAction({ url, body, label, kind = "glass", confirm, size = "sm" }: { url: string; body: unknown; label: string; kind?: BtnKind; confirm?: string; size?: "sm" | "md" }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string>();
  const router = useRouter();
  return (
    <span className="inline-flex flex-col">
      <button
        className={btn(kind, size)}
        disabled={pending}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          setErr(undefined);
          start(async () => {
            try {
              await post(url, body);
              router.refresh();
            } catch (e) {
              setErr(e instanceof ApiError ? e.message : "Failed");
            }
          });
        }}
      >
        {pending ? "…" : label}
      </button>
      {err && <span className="mt-1 max-w-xs text-[11px] text-red-300" role="alert">{err}</span>}
    </span>
  );
}

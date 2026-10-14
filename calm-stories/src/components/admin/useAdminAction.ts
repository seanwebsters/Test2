"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

/** POST/PATCH helper for admin controls: refreshes server data and reports errors. */
export function useAdminAction() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const call = useCallback(
    async (url: string, method: "POST" | "PATCH" | "PUT", payload: unknown, success?: string): Promise<unknown> => {
      setPending(true);
      setMessage(null);
      try {
        const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setMessage(body.error ?? `Failed (${res.status})`);
          return null;
        }
        if (success) setMessage(success);
        router.refresh();
        return body;
      } finally {
        setPending(false);
      }
    },
    [router],
  );
  return { call, pending, message, setMessage };
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { btn } from "@/components/ui/styles";
import { ApiError, post } from "@/lib/view/client-api";

export function ReleaseControl({ episodeId, releaseAt, released }: { episodeId: string; releaseAt: number; released: boolean }) {
  const router = useRouter();
  const toLocal = (ms: number) => new Date(ms - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const [v, setV] = useState(toLocal(releaseAt));
  const [err, setErr] = useState<string>();
  const send = async (when: string) => {
    try {
      await post("/api/studio/release", { episodeId, releaseAt: when });
      router.refresh();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed");
    }
  };
  return (
    <span className="flex flex-wrap items-center justify-end gap-2">
      <input type="datetime-local" value={v} onChange={(e) => setV(e.target.value)} className="rounded-lg border border-white/10 bg-ink-3 px-2 py-1 text-[12px]" aria-label="Release time" />
      <button className={btn("glass", "sm")} onClick={() => send(new Date(v).toISOString())}>Reschedule</button>
      {!released && <button className={btn("primary", "sm")} onClick={() => send("now")}>Release now</button>}
      {err && <span className="text-[11px] text-red-300">{err}</span>}
    </span>
  );
}

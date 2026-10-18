"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { post } from "@/lib/view/client-api";
import { btn } from "@/components/ui/styles";

/** Demo billing: activates the Collector Pass without any payment. */
export function PassToggle({ active }: { active: boolean }) {
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const router = useRouter();
  if (!active && !confirm)
    return (
      <button className={btn("light")} onClick={() => setConfirm(true)}>
        Try Collector Pass (demo)
      </button>
    );
  if (!active && confirm)
    return (
      <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm">
        <p className="font-semibold">Demo checkout</p>
        <p className="mt-1 text-bone-3">Payments are not enabled. Activating gives you 30 days of pass benefits for free so you can try them. No card details are collected.</p>
        <div className="mt-3 flex gap-2">
          <button className={btn("primary", "sm")} disabled={pending} onClick={() => start(async () => { await post("/api/me/pass", { active: true }); setConfirm(false); router.refresh(); })}>
            Activate demo pass
          </button>
          <button className={btn("ghost", "sm")} onClick={() => setConfirm(false)}>Cancel</button>
        </div>
      </div>
    );
  return (
    <button className={btn("glass", "sm")} disabled={pending} onClick={() => start(async () => { await post("/api/me/pass", { active: false }); router.refresh(); })}>
      Cancel demo pass
    </button>
  );
}

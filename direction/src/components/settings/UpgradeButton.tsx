"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useCelebrate } from "@/components/app/Celebrate";
import { Sheet } from "@/components/ui/primitives";
import { api } from "@/lib/client";

export function UpgradeButton({ mode, signedIn }: { mode: "mock" | "stripe"; signedIn: boolean }) {
  const router = useRouter();
  const { celebrate, toast } = useCelebrate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const go = async () => {
    if (!signedIn) {
      router.push("/onboarding");
      return;
    }
    setBusy(true);
    try {
      const r = await api<{ mode: "mock" | "stripe"; url?: string }>("/api/billing/checkout", { method: "POST", body: {} });
      if (r.mode === "stripe" && r.url) {
        window.location.href = r.url;
        return;
      }
      setConfirmOpen(false);
      celebrate({ kind: "upgrade", title: "Welcome to Plus!", subtitle: "More paths, unlimited coaching and interview practice are unlocked." });
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button className="btn-primary w-full text-base" disabled={busy} onClick={() => (mode === "mock" && signedIn ? setConfirmOpen(true) : go())}>
        <Sparkles size={18} /> {signedIn ? "Upgrade to Plus" : "Get started free"}
      </button>
      <Sheet open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Demo checkout">
        <div className="rounded-3xl border-2 border-dashed border-sun bg-sun-soft p-4 text-sm">
          <strong>This is a mock checkout.</strong> Live billing isn&apos;t configured on this deployment, so <strong>no payment will be taken</strong>. Plus will be enabled on your account for 30 days so you can try every feature.
        </div>
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-surface-2 p-4">
          <span className="font-bold">Direction Plus · monthly</span>
          <span className="font-display text-xl font-extrabold">£6.99</span>
        </div>
        <button className="btn-primary mt-4 w-full" disabled={busy} onClick={go}>
          {busy ? "Activating…" : "Activate Plus (no charge)"}
        </button>
      </Sheet>
    </>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check } from "lucide-react";
import { useCelebrate } from "@/components/app/Celebrate";
import { api } from "@/lib/client";
import { cn } from "@/lib/cn";

export function StartChallenge({ options }: { options: { slug: string; title: string; percent: number }[] }) {
  const router = useRouter();
  const { celebrate, toast } = useCelebrate();
  const [picked, setPicked] = useState(options.slice(0, 3).map((o) => o.slug));
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((o) => {
          const on = picked.includes(o.slug);
          return (
            <button
              key={o.slug}
              aria-pressed={on}
              onClick={() => setPicked((p) => (on ? p.filter((x) => x !== o.slug) : p.length >= 3 ? p : [...p, o.slug]))}
              className={cn("focus-ring flex items-center justify-between rounded-3xl border-2 bg-surface p-4 text-left", on ? "border-teal" : "border-line")}
            >
              <span>
                <span className="block font-display font-bold">{o.title}</span>
                <span className="text-xs font-bold text-teal">{o.percent}% match</span>
              </span>
              <span className={cn("grid h-6 w-6 place-items-center rounded-full border-2", on ? "border-teal bg-teal text-white" : "border-line")}>{on && <Check size={14} strokeWidth={3} />}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-ink-3">Pick up to three. We&apos;ll add a wildcard career every fifth day.</p>
      <button
        className="btn-primary mt-4 w-full"
        disabled={busy || picked.length === 0}
        onClick={async () => {
          setBusy(true);
          try {
            await api("/api/challenge", { body: { action: "start", careers: picked } });
            celebrate({ kind: "challenge", title: "Challenge accepted!", subtitle: "Day 1 is waiting in today's missions." });
            router.refresh();
          } catch (e) {
            toast((e as Error).message, "error");
            setBusy(false);
          }
        }}
      >
        Start the 30-day challenge
      </button>
    </div>
  );
}

export function StopChallenge() {
  const router = useRouter();
  return (
    <button
      className="text-xs font-bold text-ink-3 underline"
      onClick={async () => {
        if (!confirm("End the challenge? Missions you completed still count towards those paths.")) return;
        await api("/api/challenge", { body: { action: "stop" } });
        router.refresh();
      }}
    >
      End challenge
    </button>
  );
}

export function SaveVerdict({ verdict }: { verdict: string }) {
  const router = useRouter();
  const { toast } = useCelebrate();
  return (
    <button
      className="btn-ghost btn-sm"
      onClick={async () => {
        await api("/api/challenge", { body: { action: "finish", verdict } });
        toast("Saved to your journey");
        router.refresh();
      }}
    >
      This is my direction
    </button>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pause, Play, Sparkles } from "lucide-react";
import { useCelebrate } from "@/components/app/Celebrate";
import { Pip } from "@/components/brand/Pip";
import { Sheet } from "@/components/ui/primitives";
import { api, ApiError } from "@/lib/client";

export function StartPathButton({ careerSlug, title, label, activeSlugs, activeTitles, className = "btn-primary" }: { careerSlug: string; title: string; label?: string; activeSlugs: string[]; activeTitles: Record<string, string>; className?: string }) {
  const router = useRouter();
  const { toast, celebrate } = useCelebrate();
  const [busy, setBusy] = useState(false);
  const [limit, setLimit] = useState(false);

  const start = async (switchFrom?: string) => {
    setBusy(true);
    try {
      await api("/api/paths", { body: { careerSlug, switchFrom: switchFrom ?? null } });
      setLimit(false);
      celebrate({ kind: "path", title: `Your path: ${title}`, subtitle: switchFrom ? `${activeTitles[switchFrom]} is paused — all progress kept.` : "Level 1 is unlocked. Your first missions are ready." });
      router.push(`/path?career=${careerSlug}`);
      router.refresh();
    } catch (e) {
      if (e instanceof ApiError && e.code === "path_limit") setLimit(true);
      else toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button className={className} disabled={busy} onClick={() => start()}>
        <Play size={16} /> {label ?? "Start this path"}
      </button>
      <Sheet open={limit} onClose={() => setLimit(false)} title="Switch your active path?">
        <div className="flex items-center gap-3 rounded-3xl bg-mint-soft p-4">
          <Pip mood="thinking" size={56} animate={false} />
          <p className="text-sm font-semibold">Direction Free has one active path at a time. Switching pauses your current path — nothing is lost, and your skills carry over.</p>
        </div>
        <div className="mt-4 space-y-2">
          {activeSlugs.map((s) => (
            <button key={s} className="btn-primary w-full" disabled={busy} onClick={() => start(s)}>
              Pause {activeTitles[s]} &amp; start {title}
            </button>
          ))}
          <Link href="/plus" className="btn-ghost w-full">
            <Sparkles size={16} className="text-lavender" /> Keep both with Plus
          </Link>
        </div>
      </Sheet>
    </>
  );
}

export function PausePathButton({ careerSlug }: { careerSlug: string }) {
  const router = useRouter();
  const { toast } = useCelebrate();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="btn-ghost btn-sm"
      disabled={busy}
      onClick={async () => {
        if (!confirm("Pause this path? Your progress is saved and you can resume any time.")) return;
        setBusy(true);
        try {
          await api(`/api/paths/${careerSlug}`, { method: "PATCH", body: { action: "pause" } });
          toast("Path paused. Progress saved.");
          router.refresh();
        } catch (e) {
          toast((e as Error).message, "error");
        } finally {
          setBusy(false);
        }
      }}
    >
      <Pause size={14} /> Pause
    </button>
  );
}

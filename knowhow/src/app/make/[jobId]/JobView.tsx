"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useApp } from "@/components/providers/AppState";
import { Check, CircleAlert, Loader2, Wand2, X } from "@/components/ui/Icon";
import type { AiJobRecord } from "@/lib/model";
import { cn } from "@/lib/cn";

export function JobView({ id }: { id: string }) {
  const { api, refresh } = useApp();
  const router = useRouter();
  const [job, setJob] = useState<AiJobRecord | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const j = await api<AiJobRecord>(`/api/ai/jobs/${id}`);
        if (stop) return;
        setJob(j);
        if (j.status === "done" && j.seriesId) {
          await refresh();
          setTimeout(() => router.replace(`/ai/${j.seriesId}`), j.mode === "demo" ? 900 : 1600);
          return;
        }
        if (j.status !== "failed") setTimeout(tick, 1500);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Couldn't load the job");
      }
    };
    void tick();
    return () => { stop = true; };
  }, [id, api, router, refresh]);

  return (
    <div className="pb-safe-nav px-4 pt-[calc(24px+var(--safe-top))] md:px-10 md:pt-12">
      <div className="max-w-2xl">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-lavender"><Wand2 size={14} /> {job?.mode === "demo" ? "Demo mode" : "Building your series"}</div>
        <h1 className="display mt-4 text-[34px] md:text-[56px]">&ldquo;{job?.prompt ?? "…"}&rdquo;</h1>
        {err && <p className="mt-6 text-coral">{err}</p>}
        {job?.mode === "demo" && job.status === "done" && (
          <p className="mt-4 rounded-2xl bg-white/[0.05] p-4 text-sm text-cream-dim">Matched to a <strong className="text-cream">sample series written in advance</strong>. It was not generated from your prompt. Opening it now…</p>
        )}
        {job?.status === "failed" && (
          <div className="mt-6 rounded-[24px] border border-coral/30 bg-coral/10 p-5">
            <div className="flex items-center gap-2 font-bold text-coral"><CircleAlert size={18} /> Couldn&apos;t build this one</div>
            <p className="mt-2 text-sm text-cream-dim">{job.error}</p>
            <Link href="/make" className="btn-ghost mt-4 h-10 px-4">Try another topic</Link>
          </div>
        )}
        {job && job.mode === "live" && (
          <ol className="mt-8 space-y-1">
            {job.steps.map((s, i) => (
              <motion.li key={s.key} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className={cn("flex gap-4 rounded-2xl p-3", s.status === "running" && "bg-white/[0.05]")}>
                <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink", s.status === "done" ? "bg-lime" : s.status === "running" ? "bg-lavender" : s.status === "failed" ? "bg-coral" : s.status === "skipped" ? "bg-white/20" : "border border-white/15 bg-transparent text-cream-mute")}>
                  {s.status === "done" ? <Check size={16} strokeWidth={3} /> : s.status === "running" ? <Loader2 size={16} className="animate-spin" /> : s.status === "failed" ? <X size={16} /> : <span className="text-xs">{i + 1}</span>}
                </span>
                <div className="min-w-0">
                  <div className={cn("font-semibold", s.status === "pending" && "text-cream-mute")}>{s.label}</div>
                  {s.detail && <div className="mt-0.5 text-sm text-cream-dim">{s.detail}</div>}
                </div>
              </motion.li>
            ))}
          </ol>
        )}
        {!job && !err && <div className="skeleton mt-8 h-64" />}
      </div>
    </div>
  );
}

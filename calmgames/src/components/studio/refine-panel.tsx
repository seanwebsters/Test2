"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUp, Bookmark, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { GameVersion, Job } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";

export const SUGGESTIONS = ["Make the colours warmer.", "Add more levels.", "Make it slightly more challenging.", "Replace the garden with a coastal landscape.", "Make the animations slower and more elegant."];

interface Props {
  versions: GameVersion[];
  selected: number;
  current: number;
  job: Job | null;
  disabledReason?: string;
  autoFocus?: boolean;
  onSelect: (n: number) => void;
  onRefine: (instruction: string) => Promise<void>;
}

export function RefinePanel({ versions, selected, current, job, disabledReason, autoFocus, onSelect, onRefine }: Props) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const busy = !!job && (job.status === "running" || job.status === "queued");
  const pending = busy && job?.kind === "refine" ? (job.input as { instruction: string }).instruction : null;

  useEffect(() => {
    if (autoFocus) input.current?.focus();
  }, [autoFocus]);
  useEffect(() => end.current?.scrollIntoView({ block: "nearest" }), [versions.length, pending]);

  async function submit(instruction = text) {
    if (!instruction.trim() || busy || disabledReason) return;
    setSending(true);
    try {
      await onRefine(instruction.trim());
      setText("");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-display text-xl text-midnight">Refine</p>
        <Badge tone="neutral">{versions.length} version{versions.length === 1 ? "" : "s"}</Badge>
      </div>
      <div className="-mx-1 flex-1 space-y-3 overflow-y-auto px-1 pb-3">
        {versions.map((v) => (
          <motion.div key={v.number} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
            {v.instruction && <div className="ml-6 rounded-2xl rounded-br-md bg-midnight px-4 py-2.5 text-[13.5px] text-ivory">{v.instruction}</div>}
            <button
              onClick={() => onSelect(v.number)}
              className={cn("w-full rounded-2xl border px-4 py-3 text-left transition-all", selected === v.number ? "border-midnight/40 bg-paper shadow-soft" : "border-line/80 bg-paper/50 hover:border-midnight/20")}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13.5px] font-medium text-midnight">
                  Version {v.number}
                  {v.label ? ` · ${v.label}` : ""}
                </span>
                <span className="flex items-center gap-1.5">
                  {v.saved && <Bookmark className="size-3.5 fill-current text-midnight/60" aria-label="Saved" />}
                  {v.number === current && <Badge tone="midnight">Current</Badge>}
                </span>
              </div>
              <p className="mt-1 text-[12px] text-muted">
                {v.qa ? (v.qa.passed ? "QA passed" : v.qa.ran ? "QA found issues" : "Not tested") : "Not tested"} · {timeAgo(v.createdAt)}
              </p>
            </button>
          </motion.div>
        ))}
        {pending && (
          <div className="space-y-2">
            <div className="ml-6 rounded-2xl rounded-br-md bg-midnight px-4 py-2.5 text-[13.5px] text-ivory">{pending}</div>
            <div className="flex items-center gap-2 rounded-2xl border border-dashed border-lavender bg-lavender-soft/40 px-4 py-3 text-[13px] text-[#4b3f7a]">
              <Loader2 className="size-4 animate-spin" /> The agents are making version {versions.length + 1}…
            </div>
          </div>
        )}
        <div ref={end} />
      </div>
      <div className="border-t border-line/70 pt-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => setText(s)} disabled={busy || !!disabledReason} className="rounded-full border border-line bg-paper/70 px-3 py-1 text-[12px] text-ink/70 transition hover:border-midnight/25 hover:text-ink disabled:opacity-40">
              {s}
            </button>
          ))}
        </div>
        <div className="relative">
          <Textarea
            ref={input}
            value={text}
            rows={3}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
            disabled={busy || !!disabledReason}
            placeholder={disabledReason ?? (busy ? "Waiting for the current run…" : "Describe a change, e.g. make the animations slower and more elegant.")}
            aria-label="Describe a change"
            className="pr-14"
          />
          <Button size="icon-sm" className="absolute bottom-3 right-3" onClick={() => submit()} disabled={!text.trim() || busy || sending || !!disabledReason} aria-label="Send">
            {sending ? <Loader2 className="animate-spin" /> : <ArrowUp />}
          </Button>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-muted">
          <Sparkles className="size-3" /> Each change runs all six agents and creates a new version. Earlier versions are kept.
        </p>
      </div>
    </div>
  );
}

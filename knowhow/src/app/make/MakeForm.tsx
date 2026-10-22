"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useApp } from "@/components/providers/AppState";
import { CircleAlert, Loader2, Sparkles, Wand2 } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

export function MakeForm({ status, samples, initial }: { status: { ai: boolean; model: string | null; tts: string | null }; samples: string[]; initial: string }) {
  const [prompt, setPrompt] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { api, state } = useApp();
  const router = useRouter();

  const submit = async (text = prompt) => {
    if (text.trim().length < 4) return setError("Tell us a bit more about what you want to learn.");
    setBusy(true);
    setError(null);
    try {
      const job = await api<{ id: string; status: string; seriesId?: string; error?: string }>("/api/ai/series", { body: { prompt: text } });
      router.push(`/make/${job.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setBusy(false);
    }
  };

  return (
    <div className="pb-safe-nav relative min-h-[100svh] overflow-hidden px-4 pt-[calc(24px+var(--safe-top))] md:px-10 md:pt-12">
      <div className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full opacity-40 blur-[120px]" style={{ background: "conic-gradient(#B6A1FF, #FF92C7, #FF7768, #B6A1FF)" }} />
      <div className="relative max-w-4xl">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-lavender"><Wand2 size={14} /> AI personal series</div>
        <h1 className="display mt-4 text-[44px] md:text-[96px]">Make me <span className="text-transparent" style={{ backgroundImage: "linear-gradient(90deg,#B6A1FF,#FF92C7,#FF7768)", WebkitBackgroundClip: "text", backgroundClip: "text" }}>smarter</span> about…</h1>

        <form onSubmit={(e) => { e.preventDefault(); void submit(); }} className="mt-8">
          <div className="relative rounded-[32px] border border-white/15 bg-ink-2/80 p-2 backdrop-blur focus-within:border-lavender/60">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void submit(); } }}
              placeholder="…how record labels make money"
              rows={2}
              maxLength={200}
              className="w-full resize-none bg-transparent px-4 pt-3 text-2xl font-semibold leading-snug outline-none placeholder:text-cream-mute md:text-3xl"
              aria-label="What do you want to learn about?"
            />
            <div className="flex items-center justify-between px-3 pb-2">
              <span className="text-xs text-cream-mute">{prompt.length}/200</span>
              <button type="submit" disabled={busy} className="btn h-12 px-6 text-ink" style={{ background: "linear-gradient(90deg,#B6A1FF,#FF92C7)" }}>
                {busy ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />} Build my series
              </button>
            </div>
          </div>
        </form>
        {error && <p className="mt-3 flex items-center gap-2 text-sm text-coral"><CircleAlert size={16} /> {error}</p>}

        <div className="mt-6 flex flex-wrap gap-2">
          {samples.map((s, i) => (
            <motion.button key={s} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} onClick={() => { setPrompt(s); void submit(s); }} disabled={busy} className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-cream-dim transition hover:border-white/30 hover:text-cream">
              {s}
            </motion.button>
          ))}
        </div>

        <div className={cn("mt-10 max-w-2xl rounded-[28px] border p-5 text-sm", status.ai ? "border-lime/30 bg-lime/5" : "border-white/10 bg-white/[0.03]")}>
          {status.ai ? (
            <>
              <div className="font-bold text-lime">Live generation is on</div>
              <p className="mt-1 text-cream-dim">
                Claude ({status.model}) writes your curriculum and scripts. {status.tts ? `Narration by ${status.tts}.` : "No TTS key is set, so episodes play with your browser's built-in voice (development fallback)."} Covers are generative artwork, not AI images.
              </p>
              {state && <p className="mt-2 text-cream-mute">{state.ai.remaining} of {state.ai.limit} series left this month{!state.plus && " · KNOWHOW+ gets 5"}.</p>}
            </>
          ) : (
            <>
              <div className="font-bold">Demo mode</div>
              <p className="mt-1 text-cream-dim">
                No AI key is configured on this server, so KNOWHOW can&apos;t write new series. The five suggestions above open <strong className="text-cream">sample series written in advance</strong> to show the format, narrated ahead of time. Set <code className="rounded bg-white/10 px-1">ANTHROPIC_API_KEY</code> (and optionally a TTS key) to generate any topic.
              </p>
            </>
          )}
        </div>

        <ol className="mt-10 grid max-w-3xl grid-cols-2 gap-x-6 gap-y-2 text-sm text-cream-mute md:grid-cols-5">
          {["Interpret", "Difficulty", "Curriculum", "Episodes", "Scripts", "Titles", "Narration", "Cover", "Library", "What's next"].map((s, i) => (
            <li key={s} className="flex items-center gap-2"><span className="text-xs tabular-nums text-lavender">{String(i + 1).padStart(2, "0")}</span>{s}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}

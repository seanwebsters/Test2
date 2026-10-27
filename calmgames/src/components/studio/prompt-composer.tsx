"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea, Label } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api";
import { useStudio } from "@/lib/client-store";
import { CATEGORIES, type Category, type Game, type Job } from "@/lib/types";
import type { LabConcept } from "@/lib/agents/schemas";
import { cn, usd } from "@/lib/utils";
import Link from "next/link";

const ARCHETYPES = [
  { id: "auto", label: "Let the studio choose", note: "The Creative Director picks the best fit." },
  { id: "tile-path", label: "Tile path", note: "Rotate tiles to guide a flow." },
  { id: "garden", label: "Mindful garden", note: "Plant, water and grow." },
  { id: "constellation", label: "Constellation", note: "Connect stars into figures." },
  { id: "freeform", label: "Freeform · experimental", note: "Model-written code in the sandbox; less reliable." },
] as const;

export const EXAMPLE_PROMPT = "Create a mindful gardening game where players restore a beautiful Mediterranean garden.";

interface SettingsResponse {
  status: { anthropic: boolean };
  estimate: { generate: { typicalUsd: number; worstCaseUsd: number } };
}

export function PromptComposer({ variant = "hero", initialPrompt = "", initialCategory, concept }: { variant?: "hero" | "full"; initialPrompt?: string; initialCategory?: Category; concept?: LabConcept }) {
  const router = useRouter();
  const toast = useStudio((s) => s.toast);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [category, setCategory] = useState<Category | undefined>(initialCategory);
  const [archetype, setArchetype] = useState<(typeof ARCHETYPES)[number]["id"]>(concept?.archetype ?? "auto");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<SettingsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<SettingsResponse>("/api/settings").then(setInfo).catch(() => {});
  }, []);
  useEffect(() => setPrompt(initialPrompt), [initialPrompt]);

  async function generate() {
    const text = prompt.trim() || EXAMPLE_PROMPT;
    setBusy(true);
    setError(null);
    try {
      const { game } = await api<{ job: Job; game: Game }>("/api/jobs", { method: "POST", json: { kind: "generate", prompt: text, category, archetype, fromConcept: concept } });
      toast({ title: "The studio is on it", body: "Six agents are working on your game. You can watch each one as it goes." });
      router.push(`/games/${game.id}`);
    } catch (e) {
      setBusy(false);
      setError((e as Error).message);
      if (!(e instanceof ApiError && e.status === 503)) toast({ title: "Couldn't start generation", body: (e as Error).message, tone: "error" });
    }
  }

  const missingKey = info && !info.status.anthropic;
  return (
    <div className={cn("relative", variant === "hero" && "max-w-3xl")}>
      <motion.div layout className="rounded-[28px] border border-line bg-paper/95 p-2 shadow-lift">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === "Enter" && generate()}
          rows={variant === "hero" ? 3 : 5}
          placeholder={EXAMPLE_PROMPT}
          aria-label="Describe the game you want"
          className="border-0 bg-transparent px-4 pt-4 text-[17px] leading-relaxed focus:ring-0"
        />
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 pb-2">
          <p className="text-[12px] text-muted">
            {info ? (
              <>Estimated cost <span className="font-medium text-ink/80">{usd(info.estimate.generate.typicalUsd)}</span> (up to {usd(info.estimate.generate.worstCaseUsd)} with repairs)</>
            ) : (
              <span className="skeleton inline-block h-3 w-40 rounded-full align-middle" />
            )}
          </p>
          <Button size="lg" onClick={generate} disabled={busy || !!missingKey}>
            {busy ? <Loader2 className="animate-spin" /> : null}
            {busy ? "Starting the studio" : "Generate game"}
            {!busy && <ArrowRight />}
          </Button>
        </div>
      </motion.div>

      {missingKey && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-peach/50 bg-peach-soft/70 px-4 py-3 text-[13.5px] text-[#6d3f27]">
          <KeyRound className="mt-0.5 size-4 shrink-0" />
          <p>
            Generation needs an Anthropic API key. Add <code className="rounded bg-white/60 px-1">ANTHROPIC_API_KEY</code> to <code className="rounded bg-white/60 px-1">calmgames/.env.local</code> and restart the dev server. The studio never substitutes simulated agents.{" "}
            <Link href="/settings" className="underline underline-offset-2">Settings</Link>
          </p>
        </div>
      )}
      {error && !missingKey && <p className="mt-3 text-[13px] text-[#8f3f3f]">{error}</p>}

      <div className="mt-6">
        {variant === "full" && <Label>Category</Label>}
        <div className="flex flex-wrap gap-2" role="group" aria-label="Category">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(category === c ? undefined : c)}
              aria-pressed={category === c}
              className={cn(
                "rounded-full border px-4 py-1.5 text-[13px] transition-all duration-300",
                category === c ? "border-midnight bg-midnight text-ivory" : "border-line bg-paper/70 text-ink/70 hover:border-midnight/30 hover:text-ink",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {variant === "full" && (
        <div className="mt-8">
          <Label>Game engine</Label>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {ARCHETYPES.map((a) => (
              <button
                key={a.id}
                onClick={() => setArchetype(a.id)}
                aria-pressed={archetype === a.id}
                className={cn("rounded-2xl border p-4 text-left transition-all duration-300", archetype === a.id ? "border-midnight/60 bg-paper shadow-soft" : "border-line bg-paper/50 hover:border-midnight/25")}
              >
                <p className="text-[14px] font-medium text-midnight">{a.label}</p>
                <p className="mt-1 text-[12.5px] text-muted">{a.note}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

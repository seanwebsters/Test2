"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Page, PageHeader } from "@/components/shell/app-shell";
import { PromptComposer } from "@/components/studio/prompt-composer";
import { useData } from "@/lib/use-data";
import type { Game } from "@/lib/types";

function CreateInner() {
  const params = useSearchParams();
  const conceptId = params.get("concept");
  const { data } = useData<{ game: Game }>(conceptId ? `/api/games/${conceptId}` : null);
  const concept = data?.game.concept;
  const prompt = data ? `${data.game.name}: ${data.game.description} ${concept ? `Mechanic: ${concept.mechanic} Emotional goal: ${concept.emotionalGoal} Visual direction: ${concept.visualDirection}` : ""}` : "";
  return (
    <Page>
      <PageHeader eyebrow="Create game" title="What would you like to make?" description="Write a brief like you'd give a small creative team: a setting, a feeling, an interaction. Mention a length or an inspiration if you like." />
      <PromptComposer variant="full" initialPrompt={prompt} initialCategory={data?.game.category} />
      <div className="mt-14 grid gap-4 md:grid-cols-3">
        {[
          ["How it works", "Ideation, Game Design and Art Direction write typed specifications. Development turns them into a configuration for a tested game engine. QA plays it in a real browser and asks for repairs if anything breaks."],
          ["What you get", "A playable game in the preview, every agent's output to inspect, a QA report from real checks, and a version you can refine conversationally and export."],
          ["Good briefs", "“A 60-second puzzle on a tranquil island at sunset, inspired by Apricus.” “A slow night-sky game for winding down before bed.”"],
        ].map(([t, b]) => (
          <div key={t} className="rounded-3xl border border-line/70 bg-paper/60 p-6">
            <p className="font-display text-lg text-midnight">{t}</p>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{b}</p>
          </div>
        ))}
      </div>
    </Page>
  );
}

export default function CreatePage() {
  return (
    <Suspense>
      <CreateInner />
    </Suspense>
  );
}

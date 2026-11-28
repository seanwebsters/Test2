"use client";

import { useEffect, useState } from "react";
import type { Criterion } from "@/content/types";
import type { CoachResult } from "@/app/api/ai/coach/route";
import { scorePrompt } from "./coach";

let statusCache: Promise<{ text: boolean; image: boolean }> | null = null;
export function fetchStatus() {
  statusCache =
    statusCache ??
    fetch("/api/ai/status")
      .then((r) => r.json())
      .catch(() => ({ text: false, image: false }));
  return statusCache;
}

export function useAiStatus() {
  const [s, setS] = useState<{ text: boolean; image: boolean } | null>(null);
  useEffect(() => {
    fetchStatus().then(setS);
  }, []);
  return s;
}

export type ChatMode = "chat" | "write" | "brainstorm" | "analyse" | "website";
export interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

export async function streamChat(
  mode: ChatMode,
  messages: ChatMsg[],
  onText: (full: string) => void,
  opts: { doc?: string; signal?: AbortSignal } = {},
): Promise<{ live: boolean; text: string }> {
  const r = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode, messages, doc: opts.doc }),
    signal: opts.signal,
  });
  if (!r.ok || !r.body) {
    const msg = r.status === 429 ? "You're going a bit fast! Wait a moment and try again." : "Something went wrong. Please try again.";
    onText(msg);
    return { live: false, text: msg };
  }
  const live = r.headers.get("x-aibi-live") === "1";
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    text += dec.decode(value, { stream: true });
    onText(text);
  }
  return { live, text };
}

export async function coachPrompt(args: {
  task: { title: string; brief: string; output?: string };
  prompt: string;
  criteria: Criterion[];
  demo: { strong: string; weak: string };
}): Promise<CoachResult & { heuristic: ReturnType<typeof scorePrompt> }> {
  const heuristic = scorePrompt(args.prompt, args.criteria);
  const body = {
    task: args.task,
    prompt: args.prompt,
    demo: args.demo,
    heuristic: { score: heuristic.score, passed: heuristic.passed.map((c) => c.label), missed: heuristic.missed.map((c) => ({ label: c.label, tip: c.tip })) },
  };
  try {
    const r = await fetch("/api/ai/coach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(String(r.status));
    return { ...(await r.json()), heuristic };
  } catch {
    return {
      live: false,
      heuristic,
      response: heuristic.score >= 60 ? args.demo.strong : args.demo.weak,
      feedback: {
        headline: "Here's how your prompt measures up.",
        strengths: heuristic.passed.slice(0, 3).map((c) => `You included ${c.label.toLowerCase()}.`),
        improvements: heuristic.missed.slice(0, 3).map((c) => c.tip),
        improvedPrompt: args.prompt,
        score: heuristic.score,
      },
    };
  }
}

export async function generateImage(prompt: string): Promise<{ url: string; live: boolean } | { error: string }> {
  try {
    const r = await fetch("/api/ai/image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt }) });
    if (!r.ok) return { error: r.status === 429 ? "You're going a bit fast! Try again in a minute." : "Couldn't create the image. Please try again." };
    return await r.json();
  } catch {
    return { error: "Couldn't reach the image service. Check your connection." };
  }
}

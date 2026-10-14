"use client";

import { useState } from "react";
import type { AiSettings } from "@/lib/types";
import { Btn, Field, inputCls } from "@/components/storymaker/ui";
import { useAdminAction } from "./useAdminAction";

const TASKS = ["concept", "world", "characters", "outline", "script", "rewrite", "continuity", "direction", "sleep_check", "metadata", "chat"] as const;

const PROMPT_LABELS: Record<string, string> = {
  storymaker_system: "Storymaker system prompt",
  concept: "Series concept",
  world: "World Bible",
  characters: "Characters",
  outline: "Season outline",
  script: "Episode script",
  rewrite: "Rewrite a passage",
  continuity: "Continuity check",
  direction: "Next-episode direction",
  sleep_check: "Sleep suitability",
};

export function AiSettingsForm({ settings, defaults }: { settings: AiSettings; defaults: Record<string, string> }) {
  const { call, pending, message } = useAdminAction();
  const [s, setS] = useState(settings);
  const [promptKey, setPromptKey] = useState(Object.keys(defaults)[0] ?? "script");
  const set = <K extends keyof AiSettings>(k: K, v: AiSettings[K]) => setS((p) => ({ ...p, [k]: v }));
  const dollars = (c: number) => (c / 100).toFixed(2);
  const cents = (v: string) => Math.round(Number(v || 0) * 100);
  const save = () => {
    const { id: _id, updated_at: _u, ...patch } = s;
    void call("/api/admin/settings", "PATCH", patch, "Settings saved.");
  };
  const custom = s.prompt_templates[promptKey];

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="space-y-6"
      aria-label="AI settings"
    >
      <section className="card-surface grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
        <h2 className="font-serif text-2xl font-semibold md:col-span-2 xl:col-span-4">Providers</h2>
        <Field label="Writing provider" hint="Auto uses Anthropic, then OpenAI, then the simulated writer.">
          <select value={s.writing_provider} onChange={(e) => set("writing_provider", e.target.value as AiSettings["writing_provider"])} className={inputCls}>
            <option value="auto">Auto</option>
            <option value="anthropic">Anthropic</option>
            <option value="openai">OpenAI</option>
            <option value="mock">Simulated (no cost)</option>
          </select>
        </Field>
        <Field label="Anthropic model">
          <input value={s.writing_model_anthropic} onChange={(e) => set("writing_model_anthropic", e.target.value)} className={inputCls} />
        </Field>
        <Field label="OpenAI model">
          <input value={s.writing_model_openai} onChange={(e) => set("writing_model_openai", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Voice provider" hint="Voice cloning is not supported.">
          <select value={s.voice_provider} onChange={(e) => set("voice_provider", e.target.value as AiSettings["voice_provider"])} className={inputCls}>
            <option value="auto">Auto</option>
            <option value="elevenlabs">ElevenLabs</option>
            <option value="mock">Simulated (no cost)</option>
          </select>
        </Field>
        <Field label="Cover art" hint="Image generation isn’t connected in this build.">
          <input value="Procedural illustration (built in)" readOnly className={inputCls} />
        </Field>
        <Field label="Soundscapes" hint="Procedurally synthesised ambience beds.">
          <input value="Built-in soundscape library" readOnly className={inputCls} />
        </Field>
        <Field label="Approval policy" hint="Every episode is reviewed by an editor before release.">
          <select value={s.approval_policy} onChange={(e) => set("approval_policy", e.target.value as AiSettings["approval_policy"])} className={inputCls}>
            <option value="all_content">Review all content</option>
            <option value="community_and_engine">Review community and engine content</option>
          </select>
        </Field>
      </section>

      <section className="card-surface grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
        <h2 className="font-serif text-2xl font-semibold md:col-span-2 xl:col-span-4">Limits</h2>
        <Field label="Monthly AI budget (USD)" hint="Generation stops when this is reached.">
          <input type="number" min={0} step="1" value={dollars(s.monthly_cost_limit_cents)} onChange={(e) => set("monthly_cost_limit_cents", cents(e.target.value))} className={inputCls} />
        </Field>
        <Field label="Per-job budget (USD)">
          <input type="number" min={0} step="0.5" value={dollars(s.per_job_cost_limit_cents)} onChange={(e) => set("per_job_cost_limit_cents", cents(e.target.value))} className={inputCls} />
        </Field>
        <Field label="Retries per step">
          <input type="number" min={0} max={5} value={s.retry_limit} onChange={(e) => set("retry_limit", Number(e.target.value))} className={inputCls} />
        </Field>
        <Field label="Concurrent jobs">
          <input type="number" min={1} max={10} value={s.max_concurrent_jobs} onChange={(e) => set("max_concurrent_jobs", Number(e.target.value))} className={inputCls} />
        </Field>
      </section>

      <section className="card-surface p-5">
        <h2 className="font-serif text-2xl font-semibold">Model per task</h2>
        <p className="mt-1 text-xs text-mist">Optional overrides for the Anthropic model used by each task. Leave empty to use the default writing model.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {TASKS.map((t) => (
            <Field key={t} label={t.replace("_", " ")}>
              <input
                value={s.task_models[t] ?? ""}
                placeholder={s.writing_model_anthropic}
                onChange={(e) => {
                  const next = { ...s.task_models };
                  if (e.target.value.trim()) next[t] = e.target.value.trim();
                  else delete next[t];
                  set("task_models", next);
                }}
                className={inputCls}
              />
            </Field>
          ))}
        </div>
      </section>

      <section className="card-surface space-y-3 p-5">
        <h2 className="font-serif text-2xl font-semibold">Prompt templates</h2>
        <Field label="Template">
          <select value={promptKey} onChange={(e) => setPromptKey(e.target.value)} className={inputCls}>
            {Object.keys(defaults).map((k) => (
              <option key={k} value={k}>{PROMPT_LABELS[k] ?? k}{s.prompt_templates[k] ? " (customised)" : ""}</option>
            ))}
          </select>
        </Field>
        <Field label={custom ? "Custom prompt" : "Default prompt (edit to customise)"} hint="Saved prompts apply to new generations. Clear the text to restore the default.">
          <textarea
            rows={10}
            value={custom ?? defaults[promptKey] ?? ""}
            onChange={(e) => {
              const next = { ...s.prompt_templates };
              if (e.target.value === defaults[promptKey] || !e.target.value.trim()) delete next[promptKey];
              else next[promptKey] = e.target.value;
              set("prompt_templates", next);
            }}
            className={`${inputCls} font-mono text-xs`}
          />
        </Field>
        {custom && <Btn type="button" variant="ghost" onClick={() => { const next = { ...s.prompt_templates }; delete next[promptKey]; set("prompt_templates", next); }}>Restore default</Btn>}
      </section>

      <div className="sticky bottom-4 flex items-center gap-3">
        <Btn type="submit" variant="primary" disabled={pending}>{pending ? "Saving…" : "Save settings"}</Btn>
        {message && <p role="status" className="text-sm text-lavender">{message}</p>}
      </div>
    </form>
  );
}

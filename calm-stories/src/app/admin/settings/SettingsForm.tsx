"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AiSettings } from "@/lib/types";

const TASKS = ["concept", "world", "characters", "outline", "script", "rewrite", "continuity", "assistant", "direction", "metadata"];

export function SettingsForm({ initial }: { initial: AiSettings }) {
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [state, setState] = useState<string>("");
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("Saving…");
    const { id: _id, updated_at: _u, ...body } = s;
    const res = await fetch("/api/admin/settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    setState(res.ok ? "Saved." : (((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Failed"));
    router.refresh();
  };
  return (
    <form onSubmit={save} className="space-y-8">
      <section className="card space-y-4 p-6">
        <h2 className="headline text-2xl">Writing</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-xs text-mist">Provider
            <select className="input mt-1" value={s.writing_provider} onChange={(e) => setS({ ...s, writing_provider: e.target.value as AiSettings["writing_provider"] })}>
              <option value="auto">Auto (Anthropic → OpenAI → simulator)</option><option value="anthropic">Anthropic</option><option value="openai">OpenAI</option><option value="mock">Simulator only</option>
            </select>
          </label>
          <label className="text-xs text-mist">Default Anthropic model<input className="input mt-1" value={s.writing_model_anthropic} onChange={(e) => setS({ ...s, writing_model_anthropic: e.target.value })} /></label>
          <label className="text-xs text-mist">Default OpenAI model<input className="input mt-1" value={s.writing_model_openai} onChange={(e) => setS({ ...s, writing_model_openai: e.target.value })} /></label>
        </div>
        <details>
          <summary className="cursor-pointer text-sm">Model selection by task</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {TASKS.map((t) => (
              <label key={t} className="text-xs text-mist capitalize">{t}
                <input className="input mt-1" placeholder="(use default)" value={s.task_models[t] ?? ""} onChange={(e) => setS({ ...s, task_models: { ...s.task_models, [t]: e.target.value } })} />
              </label>
            ))}
          </div>
        </details>
        <details>
          <summary className="cursor-pointer text-sm">Prompt templates (added to the house guidance per task)</summary>
          <div className="mt-3 grid gap-3">
            {TASKS.map((t) => (
              <label key={t} className="text-xs text-mist capitalize">{t}
                <textarea rows={2} className="input mt-1" value={s.prompt_templates[t] ?? ""} onChange={(e) => setS({ ...s, prompt_templates: { ...s.prompt_templates, [t]: e.target.value } })} />
              </label>
            ))}
          </div>
        </details>
      </section>
      <section className="card grid gap-4 p-6 sm:grid-cols-3">
        <h2 className="headline text-2xl sm:col-span-3">Voice, image & sound</h2>
        <label className="text-xs text-mist">Voice provider
          <select className="input mt-1" value={s.voice_provider} onChange={(e) => setS({ ...s, voice_provider: e.target.value as AiSettings["voice_provider"] })}>
            <option value="auto">Auto (ElevenLabs if configured)</option><option value="elevenlabs">ElevenLabs</option><option value="mock">Simulated placeholder</option>
          </select>
        </label>
        <label className="text-xs text-mist">Image provider
          <select className="input mt-1" value={s.image_provider} onChange={(e) => setS({ ...s, image_provider: e.target.value as AiSettings["image_provider"] })}>
            <option value="auto">Auto (OpenAI Images if configured)</option><option value="openai">OpenAI Images</option><option value="procedural">Procedural artwork only</option>
          </select>
        </label>
        <label className="text-xs text-mist">Sound provider
          <select className="input mt-1" value={s.sound_provider} onChange={(e) => setS({ ...s, sound_provider: e.target.value as AiSettings["sound_provider"] })}>
            <option value="library">In-house ambience library</option><option value="generative">Generative audio (integration point)</option>
          </select>
        </label>
      </section>
      <section className="card grid gap-4 p-6 sm:grid-cols-3">
        <h2 className="headline text-2xl sm:col-span-3">Limits, retries & approvals</h2>
        <label className="text-xs text-mist">Monthly cost limit (¢)<input type="number" min={0} className="input mt-1" value={s.monthly_cost_limit_cents} onChange={(e) => setS({ ...s, monthly_cost_limit_cents: Number(e.target.value) })} /></label>
        <label className="text-xs text-mist">Per-job cost limit (¢)<input type="number" min={0} className="input mt-1" value={s.per_job_cost_limit_cents} onChange={(e) => setS({ ...s, per_job_cost_limit_cents: Number(e.target.value) })} /></label>
        <label className="text-xs text-mist">Retries per step<input type="number" min={0} max={5} className="input mt-1" value={s.retry_limit} onChange={(e) => setS({ ...s, retry_limit: Number(e.target.value) })} /></label>
        <label className="text-xs text-mist">Concurrent production jobs<input type="number" min={1} max={20} className="input mt-1" value={s.max_concurrent_jobs} onChange={(e) => setS({ ...s, max_concurrent_jobs: Number(e.target.value) })} /></label>
        <label className="text-xs text-mist sm:col-span-2">Approval policy
          <select className="input mt-1" value={s.approval_policy} onChange={(e) => setS({ ...s, approval_policy: e.target.value as AiSettings["approval_policy"] })}>
            <option value="all_content">Editorial approval for all content (Calm Originals too)</option>
            <option value="community_and_engine">Community & engine content only (Calm Originals still reviewed in this build)</option>
          </select>
        </label>
      </section>
      <div className="flex items-center gap-3">
        <button className="btn-primary" type="submit">Save AI settings</button>
        <span role="status" className="text-sm text-mist">{state}</span>
      </div>
    </form>
  );
}

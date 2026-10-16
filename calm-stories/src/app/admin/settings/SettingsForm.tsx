"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AgentSettings } from "@/lib/types";

const FIELDS: { key: keyof AgentSettings; label: string; hint: string; type?: "number" }[] = [
  { key: "writer_model", label: "Writing model (Claude)", hint: "Used by the Showrunner, Writer and Sleep Editor." },
  { key: "tts_model", label: "ElevenLabs narration model", hint: "e.g. eleven_multilingual_v2" },
  { key: "default_voice_id", label: "Default ElevenLabs voice ID", hint: "Series can override this in their production settings." },
  { key: "sfx_model", label: "ElevenLabs sound-effects model", hint: "Used for the looping ambience bed." },
  { key: "image_model", label: "Nano Banana model (Gemini)", hint: "e.g. gemini-2.5-flash-image" },
  { key: "per_job_budget_cents", label: "Default budget per episode (¢)", hint: "Runs stop before a paid call that would exceed it.", type: "number" },
  { key: "max_concurrent_jobs", label: "Episodes in production at once", hint: "One per series at a time regardless.", type: "number" },
];

export function SettingsForm({ initial, canEdit }: { initial: AgentSettings; canEdit: boolean }) {
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { id: _id, updated_at: _u, ...body } = f;
    const res = await fetch("/api/admin/agent-settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setMsg(res.ok ? { ok: true, text: "Saved." } : { ok: false, text: data.error ?? "Couldn't save." });
    if (res.ok) router.refresh();
  };
  return (
    <form onSubmit={save} className="card mt-6 space-y-4 p-5">
      <fieldset disabled={!canEdit} className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map((fd) => (
          <label key={fd.key} className="text-xs text-mist">
            {fd.label}
            <input
              className="input mt-1 text-sm"
              type={fd.type ?? "text"}
              value={String(f[fd.key])}
              onChange={(e) => setF({ ...f, [fd.key]: fd.type === "number" ? Number(e.target.value) : e.target.value })}
            />
            <span className="mt-1 block text-[11px] text-mist/70">{fd.hint}</span>
          </label>
        ))}
      </fieldset>
      {canEdit ? (
        <div className="flex items-center gap-3">
          <button className="btn-primary btn-sm">Save settings</button>
          {msg && <span role="status" className={msg.ok ? "text-sm text-emerald-200" : "text-sm text-rose-300"}>{msg.text}</span>}
        </div>
      ) : (
        <p className="text-xs text-mist">Only administrators can change these.</p>
      )}
    </form>
  );
}

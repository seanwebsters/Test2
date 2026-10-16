"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AgentProfile } from "@/lib/studio/types";

export function AgentEditor({ agentKey, name, title, initial, canEdit }: { agentKey: string; name: string; title: string; initial: AgentProfile; canEdit: boolean }) {
  const router = useRouter();
  const [f, setF] = useState({ instructions: initial.instructions, model: initial.model, effort: initial.effort, enabled: initial.enabled });
  const [msg, setMsg] = useState<string | null>(null);
  const save = async () => {
    const res = await fetch(`/api/studio/agents/${agentKey}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(f) });
    setMsg(res.ok ? "Saved." : (((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Couldn't save."));
    if (res.ok) router.refresh();
  };
  return (
    <li className="rounded-2xl border border-white/10 bg-white/[0.03]">
      <details>
        <summary className="flex cursor-pointer items-center gap-3 p-4">
          <span className="font-serif text-xl text-white">{name}</span>
          <span className="text-xs text-mist">{title}</span>
          <span className="ml-auto text-xs text-mist">{f.model} · {f.effort}{f.enabled ? "" : " · off"}</span>
        </summary>
        <fieldset disabled={!canEdit} className="space-y-3 px-4 pb-4">
          <textarea rows={12} className="input font-mono text-[12.5px] leading-relaxed" value={f.instructions} onChange={(e) => setF({ ...f, instructions: e.target.value })} />
          <div className="flex flex-wrap items-end gap-3 text-xs text-mist">
            <label>Model<input className="input mt-1 w-56" value={f.model} onChange={(e) => setF({ ...f, model: e.target.value })} /></label>
            <label>Effort<select className="input mt-1" value={f.effort} onChange={(e) => setF({ ...f, effort: e.target.value as typeof f.effort })}>{["low", "medium", "high", "xhigh"].map((x) => <option key={x}>{x}</option>)}</select></label>
            <label className="flex items-center gap-2 pb-2"><input type="checkbox" className="accent-lavender" checked={f.enabled} onChange={(e) => setF({ ...f, enabled: e.target.checked })} /> Enabled</label>
            {canEdit && <button type="button" className="btn-primary btn-sm" onClick={save}>Save</button>}
            {msg && <span role="status">{msg}</span>}
          </div>
          {!canEdit && <p className="text-xs text-mist">Only administrators can change agent instructions.</p>}
        </fieldset>
      </details>
    </li>
  );
}

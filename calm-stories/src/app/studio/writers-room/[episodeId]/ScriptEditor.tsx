"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Script = { scenes: { index: number; title: string; text: string }[] };

export function ScriptEditor({ deliverableId, initial }: { deliverableId: string; initial: Script }) {
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const save = async () => {
    setBusy(true);
    const res = await fetch(`/api/studio/deliverables/${deliverableId}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ data: s, note }) });
    setBusy(false);
    if (!res.ok) return setMsg(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Couldn't save.");
    router.push("?");
    router.refresh();
  };
  return (
    <div className="mt-4 space-y-4">
      {s.scenes.map((sc, i) => (
        <label key={sc.index} className="block">
          <span className="label">Scene {sc.index} · {sc.title}</span>
          <textarea rows={10} className="input font-serif text-[17px] leading-relaxed" value={sc.text} onChange={(e) => setS({ scenes: s.scenes.map((x, n) => (n === i ? { ...x, text: e.target.value } : x)) })} />
        </label>
      ))}
      <input className="input" placeholder="What did you change? (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="flex items-center gap-3"><button className="btn-primary btn-sm" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save as new version"}</button>{msg && <span className="text-sm text-rose-300">{msg}</span>}</div>
    </div>
  );
}

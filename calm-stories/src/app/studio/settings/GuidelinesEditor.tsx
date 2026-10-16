"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type G = { id: string; content: string; benchmarks: { title: string; excerpt: string; why: string }[] };

/** Human-editable writing guidelines and reference benchmarks. */
export function GuidelinesEditor({ id, initial, compact }: { id: string; initial: G; compact?: boolean }) {
  const router = useRouter();
  const [g, setG] = useState<G>({ id, content: initial.content, benchmarks: initial.benchmarks });
  const [msg, setMsg] = useState<string | null>(null);
  const save = async () => {
    const res = await fetch("/api/studio/guidelines", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(g) });
    setMsg(res.ok ? "Saved – agents use this from their next task." : (((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Couldn't save."));
    if (res.ok) router.refresh();
  };
  return (
    <div className="mt-3 space-y-4">
      <textarea rows={compact ? 6 : 22} className="input font-mono text-[13px] leading-relaxed" value={g.content} onChange={(e) => setG({ ...g, content: e.target.value })} placeholder={compact ? "e.g. Ilan never raises his voice. Avoid describing the train as 'magical' – show it." : ""} />
      {!compact && (
        <div className="space-y-3">
          <h3 className="label">Reference benchmarks</h3>
          {g.benchmarks.map((b, i) => (
            <div key={i} className="space-y-2 rounded-2xl bg-white/[0.03] p-3">
              <input className="input" value={b.title} onChange={(e) => setG({ ...g, benchmarks: g.benchmarks.map((x, n) => (n === i ? { ...x, title: e.target.value } : x)) })} />
              <textarea rows={4} className="input font-serif text-[15px]" value={b.excerpt} onChange={(e) => setG({ ...g, benchmarks: g.benchmarks.map((x, n) => (n === i ? { ...x, excerpt: e.target.value } : x)) })} />
              <input className="input text-sm" value={b.why} onChange={(e) => setG({ ...g, benchmarks: g.benchmarks.map((x, n) => (n === i ? { ...x, why: e.target.value } : x)) })} />
              <button type="button" className="text-xs text-rose-300" onClick={() => setG({ ...g, benchmarks: g.benchmarks.filter((_, n) => n !== i) })}>Remove</button>
            </div>
          ))}
          <button type="button" className="btn-ghost btn-sm" onClick={() => setG({ ...g, benchmarks: [...g.benchmarks, { title: "New benchmark", excerpt: "", why: "" }] })}>+ Add benchmark</button>
        </div>
      )}
      <div className="flex items-center gap-3"><button type="button" className="btn-primary btn-sm" onClick={save}>Save guidelines</button>{msg && <span role="status" className="text-xs text-mist">{msg}</span>}</div>
    </div>
  );
}

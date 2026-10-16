"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type E = { term: string; alias: string; notes: string };

export function PronunciationEditor({ seriesId, initial }: { seriesId: string; initial: E[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<E[]>(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const save = async () => {
    const res = await fetch("/api/studio/pronunciations", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ series_id: seriesId, entries: rows.filter((r) => r.term && r.alias) }) });
    setMsg(res.ok ? "Saved and uploaded to ElevenLabs." : (((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Couldn't save."));
    router.refresh();
  };
  return (
    <div className="mt-3 space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_1.4fr_auto]">
          <input className="input" aria-label="Term" value={r.term} onChange={(e) => setRows(rows.map((x, n) => (n === i ? { ...x, term: e.target.value } : x)))} placeholder="Vaelith" />
          <input className="input" aria-label="Say it as" value={r.alias} onChange={(e) => setRows(rows.map((x, n) => (n === i ? { ...x, alias: e.target.value } : x)))} placeholder="Vay-lith" />
          <input className="input" aria-label="Notes" value={r.notes} onChange={(e) => setRows(rows.map((x, n) => (n === i ? { ...x, notes: e.target.value } : x)))} placeholder="the northern capital" />
          <button type="button" className="text-xs text-rose-300" onClick={() => setRows(rows.filter((_, n) => n !== i))}>Remove</button>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button type="button" className="btn-ghost btn-sm" onClick={() => setRows([...rows, { term: "", alias: "", notes: "" }])}>+ Add</button>
        <button type="button" className="btn-primary btn-sm" onClick={save}>Save dictionary</button>
        {msg && <span role="status" className="text-xs text-mist">{msg}</span>}
      </div>
    </div>
  );
}

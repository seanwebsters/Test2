"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ProduceForm({ series, defaultSeries }: { series: { id: string; title: string }[]; defaultSeries?: string }) {
  const router = useRouter();
  const [seriesId, setSeriesId] = useState(defaultSeries ?? series[0]?.id ?? "");
  const [minutes, setMinutes] = useState(20);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/productions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ series_id: seriesId, target_minutes: minutes }) });
    setBusy(false);
    if (!res.ok) return setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Couldn't start production.");
    router.push("/admin/agents");
    router.refresh();
  };
  return (
    <form onSubmit={submit} className="card flex flex-wrap items-end gap-2 p-3">
      {!defaultSeries && (
        <label className="text-xs text-mist">
          Series
          <select className="input mt-1 py-1.5 text-sm" value={seriesId} onChange={(e) => setSeriesId(e.target.value)}>
            {series.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </label>
      )}
      <label className="text-xs text-mist">
        Length (min)
        <input type="number" min={1} max={60} className="input mt-1 w-24 py-1.5 text-sm" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />
      </label>
      <button className="btn-primary btn-sm" disabled={busy || !seriesId}>{busy ? "Starting…" : "Produce next episode"}</button>
      {error && <p role="alert" className="w-full text-xs text-rose-300">{error}</p>}
    </form>
  );
}

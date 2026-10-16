"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

interface Opt {
  id: string;
  title: string;
  seasons: { number: number; title: string; episodes: number }[];
}

function audioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const a = new Audio();
    a.preload = "metadata";
    a.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      Number.isFinite(a.duration) ? resolve(a.duration) : reject(new Error("Unknown duration"));
    };
    a.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This browser can't read that audio file."));
    };
    a.src = url;
  });
}

export function AddEpisodeForm({ series, preselect }: { series: Opt[]; preselect: string | null }) {
  const router = useRouter();
  const [seriesId, setSeriesId] = useState(preselect && series.some((s) => s.id === preselect) ? preselect : (series[0]?.id ?? ""));
  const current = useMemo(() => series.find((s) => s.id === seriesId), [series, seriesId]);
  const lastSeason = current?.seasons[current.seasons.length - 1]?.number ?? 1;
  const [season, setSeason] = useState<number>(lastSeason);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [when, setWhen] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (f: File | null) => {
    setFile(f);
    setDuration(null);
    setError(null);
    if (!f) return;
    try {
      setDuration(await audioDuration(f));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read the file.");
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !duration) {
      setError("Choose an audio file first.");
      return;
    }
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    form.append("series_id", seriesId);
    form.append("season_number", String(season));
    form.append("title", title);
    form.append("summary", summary);
    form.append("duration_seconds", String(Math.round(duration)));
    if (when) form.append("requested_release_at", new Date(when).toISOString());
    const res = await fetch("/api/admin/episodes", { method: "POST", body: form });
    const body = (await res.json().catch(() => ({}))) as { error?: string; review_id?: string; issues?: string[] };
    setBusy(false);
    if (!res.ok) {
      setError(body.error ? `${body.error}${body.issues ? ` (${body.issues.join("; ")})` : ""}` : "Upload failed.");
      return;
    }
    router.push(`/admin/review?id=${body.review_id}`);
    router.refresh();
  };

  const nextNumber = (current?.seasons.find((s) => s.number === season)?.episodes ?? 0) + 1;

  return (
    <form onSubmit={submit} className="card mt-6 space-y-5 p-6">
      <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
        <label className="text-xs text-mist">Series
          <select className="input mt-1" value={seriesId} onChange={(e) => { setSeriesId(e.target.value); const s = series.find((x) => x.id === e.target.value); setSeason(s?.seasons[s.seasons.length - 1]?.number ?? 1); }}>
            {series.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        </label>
        <label className="text-xs text-mist">Season
          <select className="input mt-1" value={season} onChange={(e) => setSeason(Number(e.target.value))}>
            {current?.seasons.map((s) => <option key={s.number} value={s.number}>Season {s.number}</option>)}
            <option value={lastSeason + 1}>New: Season {lastSeason + 1}</option>
          </select>
        </label>
      </div>
      <p className="-mt-2 text-xs text-mist">This will be Episode {nextNumber} of Season {season}.</p>
      <label className="block text-xs text-mist">Episode title
        <input className="input mt-1" required maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. The Lanterns on the Lake" />
      </label>
      <label className="block text-xs text-mist">Description
        <textarea className="input mt-1" rows={3} maxLength={2000} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="One or two sentences listeners see on the series page." />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-xs text-mist">Audio file (MP3, WAV, M4A, AAC)
          <input type="file" required accept="audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a,audio/aac,.mp3,.wav,.m4a,.aac" className="input mt-1 file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-3 file:py-1 file:text-night" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
          {file && <span className="mt-1 block text-mist">{(file.size / 1024 / 1024).toFixed(1)} MB{duration ? ` · ${Math.floor(duration / 60)}:${String(Math.round(duration % 60)).padStart(2, "0")}` : " · reading…"}</span>}
        </label>
        <label className="block text-xs text-mist">Requested release (your local time, optional)
          <input type="datetime-local" className="input mt-1" value={when} onChange={(e) => setWhen(e.target.value)} />
        </label>
      </div>
      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      <div className="flex items-center gap-3 border-t border-white/10 pt-5">
        <button className="btn-accent" type="submit" disabled={busy || !file || !duration || !title.trim()}>{busy ? "Uploading…" : "Upload & send to review"}</button>
        <span className="text-xs text-mist">Nothing is published until an editor approves it.</span>
      </div>
    </form>
  );
}

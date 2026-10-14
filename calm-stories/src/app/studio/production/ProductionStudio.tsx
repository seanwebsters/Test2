"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AiProductionJob, ArtworkSpec, AudioQaReport, Episode, ProductionSettings, SoundLayer, Soundscape, VoiceProfile } from "@/lib/types";
import { SceneArt } from "@/components/art/SceneArt";
import { Icon } from "@/components/ui/Icon";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { ConfirmProvider, useConfirm } from "@/components/ui/Dialog";
import { StatusPill } from "@/components/storymaker/SectionPanels";
import { api, runTool } from "@/components/storymaker/api";
import { cx, formatDuration } from "@/lib/util";

interface ProdData {
  episode: Episode;
  series: { id: string; title: string; artwork: ArtworkSpec };
  settings: ProductionSettings;
  layers: SoundLayer[];
  sections: { index: number; words: number; excerpt: string; asset: { id: string; url: string; duration_seconds: number; simulated: boolean } | null }[];
  mix: { id: string; url: string; duration_seconds: number; simulated: boolean; qa: AudioQaReport | null; mime_type: string; created_at: string; peaks: number[] | null } | null;
  jobs: (AiProductionJob & { progress: number })[];
  voices: VoiceProfile[];
  soundscapes: Soundscape[];
  tts: { provider: string; simulated: boolean };
  has_script: boolean;
}

const LAYERS: { kind: SoundLayer["kind"]; label: string }[] = [
  { kind: "rain", label: "Gentle rain" },
  { kind: "thunder", label: "Distant thunder" },
  { kind: "ocean", label: "Ocean waves" },
  { kind: "fire", label: "Fireplace" },
  { kind: "wind", label: "Soft wind" },
  { kind: "forest", label: "Forest at night" },
  { kind: "stream", label: "Stream" },
  { kind: "village", label: "Night village" },
  { kind: "space", label: "Space ambience" },
];

export function ProductionStudio({ episodeId }: { episodeId: string }) {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <Studio episodeId={episodeId} />
      </ConfirmProvider>
    </ToastProvider>
  );
}

function Studio({ episodeId }: { episodeId: string }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [d, setD] = useState<ProdData | null>(null);
  const [settings, setSettings] = useState<ProductionSettings | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const previewRef = useRef<HTMLAudioElement>(null);
  const [previewLabel, setPreviewLabel] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await api<ProdData>(`/api/studio/production/${episodeId}`);
    setD(data);
    setSettings((s) => (dirty && s ? s : data.settings));
  }, [episodeId, dirty]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeJob = d?.jobs.find((j) => ["queued", "running"].includes(j.status));
  useEffect(() => {
    if (!activeJob) return;
    const t = setInterval(() => void load(), 1200);
    return () => clearInterval(t);
  }, [activeJob, load]);

  const locked = d ? ["in_review", "approved", "published"].includes(d.episode.status) : false;
  const seriesId = d?.series.id ?? null;

  const play = (url: string, label: string) => {
    const a = previewRef.current;
    if (!a) return;
    window.speechSynthesis?.cancel();
    a.src = url;
    setPreviewLabel(label);
    void a.play();
  };

  const apply = async (): Promise<boolean> => {
    if (!settings || !d) return false;
    const removed = d.settings.extra_layers.filter((l) => !settings.extra_layers.some((x) => x.kind === l.kind)).map((l) => l.kind);
    try {
      await runTool(
        "update_production_settings",
        {
          episode_id: episodeId,
          voice_id: settings.voice_id ?? undefined,
          speed: settings.speed,
          warmth: settings.warmth,
          stability: settings.stability,
          soundscape_id: settings.soundscape_id ?? undefined,
          add_layers: settings.extra_layers,
          remove_layers: removed,
          ambience_volume: settings.ambience_volume,
          music_volume: settings.music_volume,
        },
        seriesId,
      );
      setDirty(false);
      await load();
      return true;
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't save settings", "error");
      return false;
    }
  };

  const change = (patch: Partial<ProductionSettings>) => {
    setSettings((s) => (s ? { ...s, ...patch } : s));
    setDirty(true);
  };

  const generate = async (sections?: number[]) => {
    if (dirty && !(await apply())) return;
    if (d && !d.tts.simulated && !(await confirm({ title: "Generate narration?", body: `This uses ${d.tts.provider}, a paid text-to-speech service.`, confirmLabel: "Generate" }))) return;
    setBusy("narrate");
    try {
      const o = await runTool("generate_narration", { episode_id: episodeId, sections }, seriesId);
      if (o.status === "executed") toast(o.result.summary);
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't start narration", "error");
    } finally {
      setBusy(null);
    }
  };

  const remix = async () => {
    if (dirty && !(await apply())) return;
    setBusy("mix");
    try {
      const o = await runTool("mix_episode_audio", { episode_id: episodeId }, seriesId);
      if (o.status === "executed") toast(o.result.summary);
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't start mix", "error");
    } finally {
      setBusy(null);
    }
  };

  const previewVoice = async (v: VoiceProfile) => {
    if (!settings) return;
    if (d && !d.tts.simulated && !(await confirm({ title: `Preview ${v.name}?`, body: "Voice previews use the paid text-to-speech provider.", confirmLabel: "Preview" }))) return;
    setBusy(`voice-${v.id}`);
    try {
      const o = await runTool("preview_voice", { voice_id: v.id, speed: settings.speed, warmth: settings.warmth, stability: settings.stability }, seriesId);
      if (o.status === "executed") {
        const data = o.result.data as { url: string; simulated: boolean };
        play(data.url, `${v.name}${data.simulated ? " (simulated placeholder)" : ""}`);
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "Preview failed", "error");
    } finally {
      setBusy(null);
    }
  };

  const deviceVoice = (v: VoiceProfile) => {
    if (!("speechSynthesis" in window) || !settings) return;
    previewRef.current?.pause();
    const u = new SpeechSynthesisUtterance("Take a slow breath in, and let it go. Tonight, the lanterns are lit, and there is nowhere else you need to be.");
    u.rate = settings.speed * 0.9;
    u.pitch = v.tone === "deep" ? 0.7 : v.tone === "bright" ? 1.15 : 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    setPreviewLabel(`Device voice approximating ${v.name}`);
  };

  const previewAmbience = async () => {
    if (!settings) return;
    setBusy("ambience");
    try {
      const sc = d?.soundscapes.find((s) => s.id === settings.soundscape_id);
      const layers = [...(sc?.layers.filter((l) => l.kind !== "pad") ?? []), ...settings.extra_layers, ...(settings.music_volume > 0 ? [{ kind: "pad" as const, gain: settings.music_volume * 0.8 }] : [])];
      const o = await runTool("generate_soundscape", { layers }, seriesId);
      if (o.status === "executed") play((o.result.data as { url: string }).url, "Soundscape preview");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Preview failed", "error");
    } finally {
      setBusy(null);
    }
  };

  if (!d || !settings) return <div className="pt-32 text-center text-mist">Loading production…</div>;

  const narrated = d.sections.filter((s) => s.asset).length;
  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-16 pt-24 sm:px-8">
      <nav aria-label="Breadcrumb" className="text-xs text-mist">
        <Link href="/studio" className="hover:text-white">Studio</Link> › <Link href={`/studio/series/${d.series.id}`} className="hover:text-white">{d.series.title}</Link> › Audio
      </nav>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <span className="h-16 w-12 overflow-hidden rounded-xl ring-1 ring-white/10"><SceneArt spec={d.series.artwork} className="h-full w-full" /></span>
        <div className="flex-1">
          <h1 className="headline text-4xl leading-none">Produce Audio · {d.episode.title}</h1>
          <p className="mt-1 text-sm text-mist">Episode {d.episode.number} · {d.sections.length} narration sections · {narrated} narrated</p>
        </div>
        <StatusPill status={d.episode.status} />
        <Link className="btn-ghost btn-sm" href={`/studio/series/${d.series.id}/episodes/${d.episode.id}`}>Script</Link>
      </div>

      {d.tts.simulated && (
        <p className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/5 px-4 py-3 text-sm text-amber-100">
          No voice provider is configured, so narration is rendered as a <strong>simulated placeholder</strong> – a soft hum that follows the rhythm of the text, used to test pacing, mixing and QA. Add <code className="rounded bg-white/10 px-1">ELEVENLABS_API_KEY</code> and licensed voice IDs to generate real speech.
        </p>
      )}
      {!d.has_script && <p className="mt-5 text-sm text-rose-200">This episode has no script yet.</p>}

      <audio ref={previewRef} className="hidden" onEnded={() => setPreviewLabel(null)} />
      {previewLabel && (
        <div className="fixed bottom-[calc(var(--player-h)+1rem)] left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full bg-white px-4 py-2 text-sm text-night shadow-xl">
          <Icon name="volume" size={16} /> Previewing: {previewLabel}
          <button aria-label="Stop preview" onClick={() => { previewRef.current?.pause(); window.speechSynthesis?.cancel(); setPreviewLabel(null); }}><Icon name="close" size={16} /></button>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
          <section className="card p-5" aria-labelledby="narrator-h">
            <h2 id="narrator-h" className="headline text-2xl">Narrator</h2>
            <p className="text-xs text-mist">Only approved voices with documented consent and licences are available.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {d.voices.map((v) => (
                <div key={v.id} className={cx("rounded-3xl border p-4 transition", settings.voice_id === v.id ? "border-lavender bg-lavender/10" : "border-white/10")}>
                  <button className="w-full text-left" disabled={locked} onClick={() => change({ voice_id: v.id })} aria-pressed={settings.voice_id === v.id}>
                    <div className="font-serif text-xl">{v.name}</div>
                    <div className="text-xs text-mist">{v.accent} · {v.tone} · {v.description}</div>
                  </button>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <button className="btn-ghost btn-sm" disabled={busy !== null} onClick={() => previewVoice(v)}>{busy === `voice-${v.id}` ? "Rendering…" : "Preview"}</button>
                    <button className="btn-ghost btn-sm" onClick={() => deviceVoice(v)} title="Uses your device's built-in speech voice – an approximation for quick listening.">Device voice</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <Slider label="Narration speed" min={0.7} max={1.1} step={0.05} value={settings.speed} display={`${settings.speed.toFixed(2)}×`} onChange={(v) => change({ speed: v })} disabled={locked} />
              <Slider label="Warmth (emotional delivery)" min={0} max={1} step={0.05} value={settings.warmth} display={`${Math.round(settings.warmth * 100)}%`} onChange={(v) => change({ warmth: v })} disabled={locked} />
              <Slider label="Stability" min={0} max={1} step={0.05} value={settings.stability} display={`${Math.round(settings.stability * 100)}%`} onChange={(v) => change({ stability: v })} disabled={locked} />
            </div>
          </section>

          <section className="card p-5" aria-labelledby="sound-h">
            <h2 id="sound-h" className="headline text-2xl">Soundscape</h2>
            <p className="text-xs text-mist">Ambience is synthesised in-house – no third-party recordings or licences needed.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {d.soundscapes.map((s) => (
                <div key={s.id} className={cx("rounded-2xl border p-3 text-sm", settings.soundscape_id === s.id ? "border-lavender bg-lavender/10" : "border-white/10")}>
                  <button className="w-full text-left" disabled={locked} onClick={() => change({ soundscape_id: s.id })} aria-pressed={settings.soundscape_id === s.id}>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-[11px] text-mist">{s.description}</div>
                  </button>
                  <button className="mt-2 text-xs text-lavender hover:underline" onClick={() => play(s.sample_url, s.name)}>▶ Listen</button>
                </div>
              ))}
            </div>
            <h3 className="label mt-5">Environmental sounds</h3>
            <div className="flex flex-wrap gap-2">
              {LAYERS.map((l) => {
                const on = settings.extra_layers.find((x) => x.kind === l.kind);
                return (
                  <div key={l.kind} className={cx("flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs", on ? "border-lavender bg-lavender/10" : "border-white/10")}>
                    <label className="flex cursor-pointer items-center gap-1.5">
                      <input type="checkbox" className="accent-lavender" disabled={locked} checked={Boolean(on)} onChange={(e) => change({ extra_layers: e.target.checked ? [...settings.extra_layers, { kind: l.kind, gain: 0.5 }] : settings.extra_layers.filter((x) => x.kind !== l.kind) })} />
                      {l.label}
                    </label>
                    {on && (
                      <input type="range" min={0.1} max={1} step={0.05} value={on.gain} aria-label={`${l.label} level`} className="w-16 accent-lavender" onChange={(e) => change({ extra_layers: settings.extra_layers.map((x) => (x.kind === l.kind ? { ...x, gain: Number(e.target.value) } : x)) })} />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Slider label="Ambience volume" min={0} max={1} step={0.05} value={settings.ambience_volume} display={`${Math.round(settings.ambience_volume * 100)}%`} onChange={(v) => change({ ambience_volume: v })} disabled={locked} />
              <Slider label="Music volume" min={0} max={0.6} step={0.05} value={settings.music_volume} display={`${Math.round(settings.music_volume * 100)}%`} onChange={(v) => change({ music_volume: v })} disabled={locked} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="btn-ghost btn-sm" disabled={busy !== null} onClick={previewAmbience}>{busy === "ambience" ? "Rendering…" : "Preview soundscape"}</button>
              {dirty && !locked && <button className="btn-primary btn-sm" onClick={apply}>Save settings</button>}
            </div>
          </section>

          <section className="card p-5" aria-labelledby="sections-h">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="sections-h" className="headline text-2xl">Narration sections</h2>
              <button className="btn-accent btn-sm" disabled={locked || !d.has_script || busy !== null || Boolean(activeJob)} onClick={() => generate()}>
                <Icon name="wave" size={14} /> {narrated ? "Generate missing sections" : "Generate narration"}
              </button>
            </div>
            <p className="mt-1 text-xs text-mist">Regenerate any section on its own – the rest of the episode is kept.</p>
            <ol className="mt-4 space-y-2">
              {d.sections.map((s) => (
                <li key={s.index} className="flex items-center gap-3 rounded-2xl bg-white/[0.03] p-3 text-sm">
                  <span className="w-6 text-center font-serif text-lg text-mist">{s.index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-xs text-mist">{s.excerpt}…</p>
                    <p className="mt-1 text-[11px] text-mist">{s.words} words {s.asset ? `· ${formatDuration(s.asset.duration_seconds)}${s.asset.simulated ? " · simulated" : ""}` : "· not narrated"}</p>
                  </div>
                  {s.asset && <button className="btn-ghost btn-sm" onClick={() => play(s.asset!.url, `Section ${s.index + 1}`)} aria-label={`Play section ${s.index + 1}`}><Icon name="play" size={12} /></button>}
                  <button className="btn-ghost btn-sm" disabled={locked || busy !== null || Boolean(activeJob)} onClick={() => generate([s.index])}>{s.asset ? "Regenerate" : "Narrate"}</button>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-6">
          {activeJob && <JobCard job={activeJob} />}
          <section className="card p-5" aria-labelledby="mix-h">
            <div className="flex items-center justify-between">
              <h2 id="mix-h" className="headline text-2xl">Finished mix</h2>
              {d.mix && !locked && <button className="btn-ghost btn-sm" disabled={busy !== null || Boolean(activeJob)} onClick={remix}>Re-mix</button>}
            </div>
            {d.mix ? (
              <>
                <Waveform url={d.mix.url} precomputed={d.mix.peaks} />
                <audio controls src={d.mix.url} className="mt-3 w-full" preload="none" aria-label="Finished mix" />
                <p className="mt-2 text-xs text-mist">{formatDuration(d.mix.duration_seconds)} · {d.mix.mime_type === "audio/mpeg" ? "MP3 (FFmpeg loudness-normalised)" : "WAV"}{d.mix.simulated ? " · contains simulated narration" : ""}</p>
                {d.mix.qa && <QaReport qa={d.mix.qa} />}
              </>
            ) : (
              <p className="mt-3 text-sm text-mist">Generate the narration to create the first mix. Ambience and music are added automatically with gentle fades and ducking under the voice.</p>
            )}
          </section>
          {d.jobs.filter((j) => j !== activeJob).slice(0, 3).map((j) => <JobCard key={j.id} job={j} compact />)}
        </aside>
      </div>
    </div>
  );
}

function Slider({ label, min, max, step, value, display, onChange, disabled }: { label: string; min: number; max: number; step: number; value: number; display: string; onChange: (v: number) => void; disabled?: boolean }) {
  const id = `s-${label.replace(/\W+/g, "-")}`;
  return (
    <div>
      <div className="flex justify-between text-xs"><label htmlFor={id} className="text-mist">{label}</label><span className="tabular-nums">{display}</span></div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} className="mt-2 w-full accent-lavender" />
    </div>
  );
}

function JobCard({ job, compact }: { job: AiProductionJob & { progress: number }; compact?: boolean }) {
  return (
    <section className="card p-4 text-sm" aria-live="polite">
      <div className="flex items-center justify-between">
        <span className="font-medium capitalize">{job.kind.replace("_", " ")} job</span>
        <span className={cx("text-xs", job.status === "failed" ? "text-rose-300" : job.status === "succeeded" ? "text-emerald-200" : "text-lavender")}>{job.status}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-gradient-to-r from-periwinkle to-lavender transition-all" style={{ width: `${job.progress}%` }} /></div>
      {!compact && (
        <ol className="mt-3 space-y-1 text-xs">
          {job.steps.map((s) => (
            <li key={s.id} className="flex justify-between gap-2">
              <span className={s.status === "succeeded" ? "text-white" : "text-mist"}>{s.status === "succeeded" ? "✓" : s.status === "running" ? "…" : s.status === "failed" ? "✗" : "○"} {s.label}</span>
              {s.output_preview && <span className="truncate text-mist">{s.output_preview}</span>}
            </li>
          ))}
        </ol>
      )}
      {job.error && <p className="mt-2 text-xs text-rose-300">{job.error}</p>}
    </section>
  );
}

function QaReport({ qa }: { qa: AudioQaReport }) {
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Audio quality checks</h3>
        <span className={cx("text-xs", qa.passed ? "text-emerald-200" : "text-rose-300")}>{qa.passed ? "Passed" : "Needs attention"}</span>
      </div>
      <ul className="mt-2 space-y-1 text-xs">
        {qa.issues.map((i, k) => (
          <li key={k} className={i.severity === "pass" ? "text-mist" : i.severity === "warn" ? "text-amber-100" : "text-rose-200"}>
            {i.severity === "pass" ? "✓" : i.severity === "warn" ? "!" : "✗"} <span className="capitalize">{i.check.replace("_", " ")}</span>: {i.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Waveform({ url, precomputed }: { url: string; precomputed: number[] | null }) {
  const [peaks, setPeaks] = useState<number[] | null>(precomputed);
  useEffect(() => {
    if (precomputed) {
      setPeaks(precomputed);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const buf = await (await fetch(url)).arrayBuffer();
        const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ac = new Ctx();
        const audio = await ac.decodeAudioData(buf);
        const data = audio.getChannelData(0);
        const n = 160;
        const size = Math.floor(data.length / n);
        const p: number[] = [];
        for (let i = 0; i < n; i++) {
          let m = 0;
          for (let j = i * size; j < (i + 1) * size; j += 64) m = Math.max(m, Math.abs(data[j] ?? 0));
          p.push(m);
        }
        void ac.close();
        if (alive) setPeaks(p);
      } catch {
        if (alive) setPeaks([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [url, precomputed]);
  if (!peaks) return <div className="mt-3 h-20 animate-pulse rounded-2xl bg-white/5" />;
  const max = Math.max(0.01, ...peaks);
  return (
    <svg viewBox="0 0 320 80" className="mt-3 h-20 w-full" role="img" aria-label="Waveform of the finished mix">
      {peaks.map((p, i) => {
        const h = Math.max(1, (p / max) * 76);
        return <rect key={i} x={i * 2} y={40 - h / 2} width={1.2} height={h} rx={0.6} fill="#A99BF4" opacity={0.85} />;
      })}
    </svg>
  );
}

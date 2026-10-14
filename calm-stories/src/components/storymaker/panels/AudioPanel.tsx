"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { PauseIcon, PlayIcon } from "@/components/icons";
import type { ProductionView } from "@/lib/audio/production";
import type { ProductionSettings, SoundLayer } from "@/lib/types";
import { cx, formatDuration } from "@/lib/util";
import { useWorkspace } from "../WorkspaceContext";
import { Btn, Empty, Field, PanelHeader, StatusPill, inputCls } from "../ui";

const LAYER_KINDS: SoundLayer["kind"][] = ["rain", "forest", "ocean", "fire", "wind", "stream", "village", "space", "thunder", "pad"];

export function AudioPanel() {
  const { snapshot, episodeId, openEpisode, api, act, busy, notify } = useWorkspace();
  const episodes = snapshot!.episodes;
  const ep = episodes.find((e) => e.id === episodeId) ?? episodes[0] ?? null;
  const [view, setView] = useState<ProductionView | null>(null);
  const [s, setS] = useState<ProductionSettings | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const scriptVersion = snapshot!.scripts.find((x) => x.episode_id === ep?.id)?.current_version_id ?? null;

  const load = useCallback(async () => {
    if (!ep) return;
    try {
      const v = await api<ProductionView>(`/api/storymaker/episodes/${ep.id}/production`);
      setView(v);
      setS(v.production.settings);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Could not load audio");
    }
  }, [api, ep, notify]);
  useEffect(() => {
    void load();
  }, [load, scriptVersion, ep?.audio_asset_id]);

  const play = (url: string) => {
    const a = audio.current;
    if (!a) return;
    if (playing === url) {
      a.pause();
      setPlaying(null);
      return;
    }
    a.src = url;
    void a.play().catch(() => setPlaying(null));
    setPlaying(url);
  };

  if (!ep) return <Empty>Plan a season or add an episode first.</Empty>;
  const locked = ["in_review", "approved", "published"].includes(ep.status);
  const isBusy = !!busy;
  const run = async (tool: string, input: unknown, label: string) => {
    await act(tool, input, { label });
    await load();
  };
  const dirty = !!view && !!s && JSON.stringify(view.production.settings) !== JSON.stringify(s);
  const missing = view?.sections.filter((x) => !x.asset || x.stale).length ?? 0;

  return (
    <div>
      <audio ref={audio} onEnded={() => setPlaying(null)} onPause={() => setPlaying((p) => (audio.current?.ended ? null : p))} hidden />
      <PanelHeader title="Audio" hint="Narrator, delivery, ambience, mixing and quality checks.">
        <select value={ep.id} onChange={(e) => openEpisode(e.target.value)} className={cx(inputCls, "max-w-xs")} aria-label="Episode">
          {episodes.map((e) => (
            <option key={e.id} value={e.id}>
              {e.number}. {e.title}
            </option>
          ))}
        </select>
      </PanelHeader>
      {view?.voiceProvider.simulated && (
        <p className="mb-4 rounded-2xl bg-amber-300/10 px-4 py-2 text-sm text-amber-100">
          Simulated narrator: no voice provider key is configured, so narration is a quiet placeholder murmur timed to your script, not a real voice. Mixing, mastering and QA are real. See docs/INTEGRATIONS.md to connect ElevenLabs.
        </p>
      )}
      {locked && <p className="mb-4 rounded-2xl bg-amber-300/10 px-4 py-2 text-sm text-amber-100">Audio is locked while the episode is {ep.status.replace("_", " ")}.</p>}
      {!view || !s ? (
        <p className="text-sm text-mist">Loading…</p>
      ) : (
        <div className="space-y-8">
          <section>
            <h3 className="font-serif text-2xl font-semibold">Narrator</h3>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {view.voices.map((v) => (
                <li key={v.id}>
                  <label className={cx("flex h-full cursor-pointer gap-3 rounded-2xl border p-3 text-sm", s.voice_id === v.id ? "border-lavender/70 bg-lavender/10" : "border-white/10 bg-white/[0.03]")}>
                    <input type="radio" name="voice" className="mt-1 accent-lavender" checked={s.voice_id === v.id} onChange={() => setS({ ...s, voice_id: v.id })} disabled={locked} />
                    <span className="min-w-0 flex-1">
                      <span className="font-semibold">{v.name}</span> <span className="text-xs text-mist">· {v.accent} · {v.tone}</span>
                      <span className="mt-1 block text-mist">{v.description}</span>
                    </span>
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.preventDefault();
                        const r = await act("preview_voice", { voice_id: v.id, speed: s.speed, warmth: s.warmth, stability: s.stability }, { label: "Rendering preview…", quiet: true });
                        const url = (r.data as { url?: string } | undefined)?.url;
                        if (url) play(url);
                      }}
                      disabled={isBusy}
                      className="grid h-9 w-9 shrink-0 place-items-center self-center rounded-full bg-white/10 hover:bg-white/20"
                      aria-label={`Preview ${v.name}`}
                    >
                      <PlayIcon className="h-4 w-4" />
                    </button>
                  </label>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-mist">Only licensed library voices with documented consent are available. Voice cloning is not offered.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Slider label="Speed" min={0.7} max={1.1} step={0.05} value={s.speed} onChange={(speed) => setS({ ...s, speed })} format={(x) => `${x.toFixed(2)}×`} disabled={locked} />
              <Slider label="Warmth (emotion)" min={0} max={1} step={0.05} value={s.warmth} onChange={(warmth) => setS({ ...s, warmth })} format={(x) => `${Math.round(x * 100)}%`} disabled={locked} />
              <Slider label="Stability" min={0} max={1} step={0.05} value={s.stability} onChange={(stability) => setS({ ...s, stability })} format={(x) => `${Math.round(x * 100)}%`} disabled={locked} />
            </div>
          </section>

          <section>
            <h3 className="font-serif text-2xl font-semibold">Ambience & music</h3>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {view.soundscapes.map((sc) => (
                <li key={sc.id}>
                  <label className={cx("flex cursor-pointer items-center gap-3 rounded-2xl border p-3 text-sm", s.soundscape_id === sc.id ? "border-lavender/70 bg-lavender/10" : "border-white/10 bg-white/[0.03]")}>
                    <input type="radio" name="soundscape" className="accent-lavender" checked={s.soundscape_id === sc.id} onChange={() => setS({ ...s, soundscape_id: sc.id })} disabled={locked} />
                    <span className="min-w-0 flex-1">
                      <span className="font-semibold">{sc.name}</span>
                      <span className="block truncate text-xs text-mist">{sc.description}</span>
                    </span>
                    <button type="button" onClick={(e) => (e.preventDefault(), play(sc.sample_url))} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label={`Listen to ${sc.name}`}>
                      {playing === sc.sample_url ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
                    </button>
                  </label>
                </li>
              ))}
              <li>
                <label className={cx("flex cursor-pointer items-center gap-3 rounded-2xl border p-3 text-sm", !s.soundscape_id ? "border-lavender/70 bg-lavender/10" : "border-white/10 bg-white/[0.03]")}>
                  <input type="radio" name="soundscape" className="accent-lavender" checked={!s.soundscape_id} onChange={() => setS({ ...s, soundscape_id: null })} disabled={locked} />
                  <span>Narration only</span>
                </label>
              </li>
            </ul>
            <fieldset className="mt-4">
              <legend className="text-xs text-mist">Extra sound layers (up to 4)</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {LAYER_KINDS.map((k) => {
                  const on = s.extra_layers.find((l) => l.kind === k);
                  return (
                    <button
                      key={k}
                      type="button"
                      disabled={locked || (!on && s.extra_layers.length >= 4)}
                      aria-pressed={!!on}
                      onClick={() => setS({ ...s, extra_layers: on ? s.extra_layers.filter((l) => l.kind !== k) : [...s.extra_layers, { kind: k, gain: 0.3 }] })}
                      className={cx("rounded-full border px-3 py-1 text-xs capitalize disabled:opacity-40", on ? "border-lavender bg-lavender/20 text-white" : "border-white/10 text-mist")}
                    >
                      {k}
                    </button>
                  );
                })}
              </div>
              {s.extra_layers.length > 0 && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {s.extra_layers.map((l, i) => (
                    <Slider key={l.kind} label={`${l.kind} level`} min={0} max={1} step={0.05} value={l.gain} onChange={(gain) => setS({ ...s, extra_layers: s.extra_layers.map((x, j) => (j === i ? { ...x, gain } : x)) })} format={(x) => `${Math.round(x * 100)}%`} disabled={locked} />
                  ))}
                </div>
              )}
            </fieldset>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Slider label="Ambience volume" min={0} max={1} step={0.05} value={s.ambience_volume} onChange={(ambience_volume) => setS({ ...s, ambience_volume })} format={(x) => `${Math.round(x * 100)}%`} disabled={locked} />
              <Slider label="Music volume" min={0} max={1} step={0.05} value={s.music_volume} onChange={(music_volume) => setS({ ...s, music_volume })} format={(x) => `${Math.round(x * 100)}%`} disabled={locked} />
            </div>
          </section>

          <div className="flex flex-wrap gap-2">
            <Btn
              variant="outline"
              disabled={!dirty || isBusy || locked}
              onClick={async () => {
                await act("set_narration", { episode_id: ep.id, voice_id: s.voice_id ?? undefined, speed: s.speed, warmth: s.warmth, stability: s.stability }, { label: "Saving…", quiet: true });
                await run("generate_soundscape", { episode_id: ep.id, soundscape_id: s.soundscape_id ?? undefined, extra_layers: s.extra_layers, ambience_volume: s.ambience_volume, music_volume: s.music_volume }, "Saving…");
              }}
            >
              Save audio settings
            </Btn>
            {dirty && <span className="self-center text-xs text-mist">Unsaved changes</span>}
          </div>

          <section>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-serif text-2xl font-semibold">Narration</h3>
              <Btn variant="primary" disabled={isBusy || locked || dirty || !view.sections.length || missing === 0} onClick={() => run("generate_narration", { episode_id: ep.id }, "Narrating…")}>
                {missing === view.sections.length ? "Generate narration" : `Update ${missing} section${missing === 1 ? "" : "s"}`}
                {view.pendingCents > 0 ? ` · ~$${(view.pendingCents / 100).toFixed(2)}` : ""}
              </Btn>
            </div>
            {!view.sections.length ? (
              <Empty>Write the script first. Narration is generated section by section from it.</Empty>
            ) : (
              <ol className="mt-3 space-y-2">
                {view.sections.map((sec) => (
                  <li key={sec.index} className="flex items-start gap-3 rounded-2xl bg-white/[0.04] p-3 text-sm">
                    <button
                      disabled={!sec.asset}
                      onClick={() => sec.asset && play(sec.asset.url)}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30"
                      aria-label={`Play section ${sec.index + 1}`}
                    >
                      {playing === sec.asset?.url ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-mist">
                        Section {sec.index + 1} · {sec.words} words
                        {sec.asset ? ` · ${formatDuration(sec.asset.duration_seconds)}` : ""} ·{" "}
                        <span className={sec.asset ? (sec.stale ? "text-amber-200" : "text-emerald-200") : "text-mist"}>{sec.asset ? (sec.stale ? "out of date" : "ready") : "not narrated"}</span>
                        {sec.asset?.simulated ? " · simulated" : ""}
                      </p>
                      <p className="mt-1 line-clamp-2 text-mist">{sec.text}</p>
                    </div>
                    <Btn className="shrink-0 px-2 py-1 text-xs" disabled={isBusy || locked || dirty} onClick={() => run("generate_narration", { episode_id: ep.id, section_index: sec.index }, `Regenerating section ${sec.index + 1}…`)}>
                      Regenerate
                    </Btn>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-serif text-2xl font-semibold">Mix & master</h3>
              <Btn variant="primary" disabled={isBusy || locked || dirty || !view.sections.some((x) => x.asset && !x.stale)} onClick={() => run("mix_episode_audio", { episode_id: ep.id }, "Mixing and mastering…")}>
                {view.mix ? "Remix" : "Mix and master"}
              </Btn>
            </div>
            {view.mix ? (
              <div className="card-surface mt-3 space-y-4 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <button onClick={() => play(view.mix!.url)} className="grid h-11 w-11 place-items-center rounded-full bg-white text-night" aria-label={playing === view.mix.url ? "Pause mix" : "Play mix"}>
                    {playing === view.mix.url ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
                  </button>
                  <div className="text-sm">
                    <p className="font-semibold">Finished episode · {formatDuration(view.mix.duration_seconds)}</p>
                    <p className="text-xs text-mist">
                      {view.mix.mime_type === "audio/mpeg" ? "MP3" : "WAV"}
                      {view.mix.simulated ? " · contains simulated narration" : ""}
                    </p>
                  </div>
                  <StatusPill status={ep.status} />
                  <Link href={`/listen/${ep.id}`} className="ml-auto text-sm text-lavender hover:text-white">
                    Open in player
                  </Link>
                </div>
                {view.mix.qa && <QaReport qa={view.mix.qa} />}
              </div>
            ) : (
              <p className="mt-2 text-sm text-mist">Mixing joins the narration with gentle pauses, lays it over your ambience, levels and limits it, and adds long fades.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function Slider({ label, value, onChange, min, max, step, format, disabled }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number; format: (v: number) => string; disabled?: boolean }) {
  return (
    <Field label={`${label}: ${format(value)}`}>
      <input type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} className="range w-full" />
    </Field>
  );
}

export const QA_LABELS: Record<string, string> = {
  clipping: "Clipping",
  loudness: "Loudness",
  peaks: "Peaks",
  silence: "Silence",
  transitions: "Transitions",
  missing_segments: "Missing segments",
  pronunciation: "Pronunciation",
  unwanted_sfx: "Unwanted sound effects",
  background_level: "Background level",
  pacing: "Pacing",
};

export function QaReport({ qa }: { qa: NonNullable<ProductionView["mix"]>["qa"] }) {
  if (!qa) return null;
  const tone = { pass: "bg-emerald-300", warn: "bg-amber-300", fail: "bg-rose-300" } as const;
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-lavender">Audio QA · {qa.passed ? "passed" : "needs attention"}</p>
      <dl className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <div>
          <dt className="text-mist">Peak</dt>
          <dd>{qa.peak_dbfs.toFixed(1)} dBFS</dd>
        </div>
        <div>
          <dt className="text-mist">Loudness (approx.)</dt>
          <dd>{qa.integrated_loudness_approx_lufs.toFixed(1)} LUFS</dd>
        </div>
        <div>
          <dt className="text-mist">Pace</dt>
          <dd>{qa.words_per_minute ?? "–"} wpm</dd>
        </div>
        <div>
          <dt className="text-mist">Duration</dt>
          <dd>{formatDuration(qa.duration_seconds)}</dd>
        </div>
      </dl>
      <ul className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
        {qa.issues.map((i) => (
          <li key={i.check} className="flex items-start gap-2">
            <span className={cx("mt-1.5 h-2 w-2 shrink-0 rounded-full", tone[i.severity])} aria-hidden />
            <span>
              <span>{QA_LABELS[i.check]}</span>
              <span className="sr-only">: {i.severity}</span>
              <span className="block text-xs text-mist">{i.message}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

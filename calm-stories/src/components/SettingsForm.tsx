"use client";

import { useState } from "react";
import type { UserSettings } from "@/lib/types";

export function SettingsForm({ initial }: { initial: UserSettings }) {
  const [s, setS] = useState(initial);
  const [status, setStatus] = useState<string | null>(null);
  async function save(patch: Partial<UserSettings>) {
    const next = { ...s, ...patch };
    setS(next);
    setStatus("Saving…");
    const res = await fetch("/api/settings", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
    setStatus(res.ok ? "Saved. Playback changes apply from the next page load." : "Could not save");
  }
  const row = "flex items-center justify-between gap-6 py-4";
  return (
    <div className="space-y-8">
      <section className="card-surface divide-y divide-white/5 px-6">
        <h2 className="pt-6 font-serif text-2xl font-semibold">Playback</h2>
        <Toggle label="Autoplay next episode" hint="Continue to the next episode when one finishes." checked={s.autoplay_next} onChange={(v) => save({ autoplay_next: v })} />
        <label className={row}>
          <span>
            <span className="block">Autoplay limit</span>
            <span className="block text-xs text-mist">Stop after this many episodes in a row, so listening winds down rather than running all night.</span>
          </span>
          <select value={s.autoplay_limit} onChange={(e) => save({ autoplay_limit: Number(e.target.value) })} className="rounded-xl border border-white/10 bg-night-2 px-3 py-2">
            {[1, 2, 3, 5, 10].map((n) => (
              <option key={n} value={n}>{n} episode{n === 1 ? "" : "s"}</option>
            ))}
          </select>
        </label>
        <label className={row}>
          <span>Default speed</span>
          <select value={s.default_speed} onChange={(e) => save({ default_speed: Number(e.target.value) })} className="rounded-xl border border-white/10 bg-night-2 px-3 py-2">
            {[0.75, 0.85, 1, 1.1, 1.25].map((n) => (
              <option key={n} value={n}>{n}×</option>
            ))}
          </select>
        </label>
        <label className={row}>
          <span>Default sleep timer</span>
          <select value={s.default_sleep_timer_minutes ?? ""} onChange={(e) => save({ default_sleep_timer_minutes: e.target.value ? Number(e.target.value) : null })} className="rounded-xl border border-white/10 bg-night-2 px-3 py-2">
            <option value="">Off</option>
            {[15, 30, 45, 60, 90].map((n) => (
              <option key={n} value={n}>{n} minutes</option>
            ))}
          </select>
        </label>
      </section>
      <section className="card-surface divide-y divide-white/5 px-6">
        <h2 className="pt-6 font-serif text-2xl font-semibold">Notifications & privacy</h2>
        <Toggle label="New episode updates" hint="Hear about new episodes from series and creators you follow." checked={s.new_episode_updates} onChange={(v) => save({ new_episode_updates: v })} />
        <Toggle label="Private listening history" hint="Keep resume points, but don't record listening events for analytics or recommendations." checked={s.private_listening_history} onChange={(v) => save({ private_listening_history: v })} />
      </section>
      <p className="text-sm text-mist" aria-live="polite">{status}</p>
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-6 py-4">
      <span>
        <span className="block">{label}</span>
        <span className="block text-xs text-mist">{hint}</span>
      </span>
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="relative h-6 w-11 shrink-0 rounded-full bg-white/15 transition peer-checked:bg-lavender/80 peer-focus-visible:ring-2 peer-focus-visible:ring-lavender after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
    </label>
  );
}

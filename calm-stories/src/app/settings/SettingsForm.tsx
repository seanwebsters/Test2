"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface S {
  autoplay_next: boolean;
  autoplay_limit: number;
  default_speed: number;
  default_sleep_timer_minutes: number | null;
  new_episode_updates: boolean;
  private_listening_history: boolean;
}

export function SettingsForm({ initial }: { initial: S }) {
  const [s, setS] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const router = useRouter();
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("saving");
    const res = await fetch("/api/settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(s) });
    setStatus(res.ok ? "saved" : "error");
    if (res.ok) router.refresh();
  };
  const clearHistory = async () => {
    if (!confirm("Clear your listening history and progress? This can't be undone.")) return;
    const res = await fetch("/api/settings/history", { method: "DELETE" });
    setStatus(res.ok ? "saved" : "error");
    router.refresh();
  };
  return (
    <form onSubmit={save} className="card mt-6 space-y-6 p-6">
      <h2 className="headline text-2xl">Listening</h2>
      <label className="flex items-start gap-3">
        <input type="checkbox" checked={s.autoplay_next} onChange={(e) => setS({ ...s, autoplay_next: e.target.checked })} className="mt-1 accent-lavender" />
        <span>
          <span className="block font-medium">Continue to the next episode automatically</span>
          <span className="text-sm text-mist">Playback always stops after a few episodes in a row, so stories never run all night.</span>
        </span>
      </label>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="limit">Stop autoplay after</label>
          <select id="limit" value={s.autoplay_limit} onChange={(e) => setS({ ...s, autoplay_limit: Number(e.target.value) })} className="input">
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} episode{n > 1 ? "s" : ""}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="speed">Default speed</label>
          <select id="speed" value={s.default_speed} onChange={(e) => setS({ ...s, default_speed: Number(e.target.value) })} className="input">
            {[0.75, 0.9, 1, 1.1, 1.25].map((n) => <option key={n} value={n}>{n}×</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="timer">Default sleep timer</label>
          <select id="timer" value={s.default_sleep_timer_minutes ?? ""} onChange={(e) => setS({ ...s, default_sleep_timer_minutes: e.target.value ? Number(e.target.value) : null })} className="input">
            <option value="">Off</option>
            {[15, 30, 45, 60].map((n) => <option key={n} value={n}>{n} minutes</option>)}
          </select>
        </div>
      </div>
      <h2 className="headline pt-2 text-2xl">Updates & privacy</h2>
      <label className="flex items-start gap-3">
        <input type="checkbox" checked={s.new_episode_updates} onChange={(e) => setS({ ...s, new_episode_updates: e.target.checked })} className="mt-1 accent-lavender" />
        <span>
          <span className="block font-medium">New episode updates</span>
          <span className="text-sm text-mist">Get an update when a series you follow releases an episode. No streaks, no nudges.</span>
        </span>
      </label>
      <label className="flex items-start gap-3">
        <input type="checkbox" checked={s.private_listening_history} onChange={(e) => setS({ ...s, private_listening_history: e.target.checked })} className="mt-1 accent-lavender" />
        <span>
          <span className="block font-medium">Don&rsquo;t use my listening history for recommendations</span>
          <span className="text-sm text-mist">Recommendations will be based on popular series only.</span>
        </span>
      </label>
      <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-5">
        <button type="submit" className="btn-primary" disabled={status === "saving"}>{status === "saving" ? "Saving…" : "Save settings"}</button>
        <button type="button" onClick={clearHistory} className="btn-danger">Clear listening history</button>
        <span role="status" className="text-sm text-mist">{status === "saved" ? "Saved." : status === "error" ? "Couldn't save – try again." : ""}</span>
      </div>
    </form>
  );
}

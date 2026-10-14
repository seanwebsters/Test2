"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cx } from "@/lib/util";

export interface CalItem {
  id: string;
  title: string;
  number: number;
  series: string;
  series_id: string;
  hue: number;
  release_at: string;
  status: string;
}

const DAY = 86400000;
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function Calendar({ items: initial, startMs, days }: { items: CalItem[]; startMs: number; days: number }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const seriesList = [...new Map(items.map((i) => [i.series_id, i.series])).entries()];

  const move = async (id: string, dayIndex: number) => {
    const item = items.find((i) => i.id === id);
    if (!item || item.status === "published") return;
    const old = new Date(item.release_at);
    const target = new Date(startMs + dayIndex * DAY);
    target.setUTCHours(old.getUTCHours(), old.getUTCMinutes(), 0, 0);
    if (target.getTime() < Date.now()) {
      setError("Releases can only be moved to a future time.");
      return;
    }
    const prev = items;
    setItems(items.map((i) => (i.id === id ? { ...i, release_at: target.toISOString() } : i)));
    setError(null);
    const res = await fetch("/api/admin/schedule", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ episode_id: id, release_at: target.toISOString() }) });
    if (!res.ok) {
      setItems(prev);
      setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Couldn't reschedule");
    } else router.refresh();
  };

  return (
    <div className="mt-6">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="text-xs text-mist">Series
          <select className="input ml-2 inline-block w-auto py-1.5 text-sm" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All series</option>
            {seriesList.map(([id, t]) => <option key={id} value={id}>{t}</option>)}
          </select>
        </label>
        {error && <span role="alert" className="text-sm text-rose-300">{error}</span>}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {Array.from({ length: days }, (_, d) => {
          const date = new Date(startMs + d * DAY);
          const dayItems = items
            .filter((i) => filter === "all" || i.series_id === filter)
            .filter((i) => {
              const t = new Date(i.release_at).getTime();
              return t >= startMs + d * DAY && t < startMs + (d + 1) * DAY;
            })
            .sort((a, b) => (a.release_at < b.release_at ? -1 : 1));
          const isToday = date.getTime() === today.getTime();
          const past = date.getTime() < today.getTime();
          return (
            <div
              key={d}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(d);
              }}
              onDragLeave={() => setOver((o) => (o === d ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                const id = e.dataTransfer.getData("text/plain") || dragId;
                if (id) void move(id, d);
              }}
              className={cx("min-h-[140px] rounded-2xl border p-2 transition", over === d ? "border-lavender bg-lavender/10" : "border-white/10 bg-white/[0.02]", past && "opacity-60", isToday && "ring-1 ring-lavender/60")}
              aria-label={date.toUTCString().slice(0, 11)}
            >
              <div className="mb-2 flex items-baseline justify-between text-xs">
                <span className="text-mist">{WD[date.getUTCDay()]}</span>
                <span className={cx("font-serif text-lg", isToday ? "text-lavender" : "")}>{date.getUTCDate()}</span>
              </div>
              <ul className="space-y-1.5">
                {dayItems.map((i) => (
                  <li
                    key={i.id}
                    draggable={i.status !== "published"}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", i.id);
                      setDragId(i.id);
                    }}
                    className={cx(
                      "cursor-grab rounded-xl border-l-4 bg-night-2 px-2 py-1.5 text-[11px] leading-tight active:cursor-grabbing",
                      i.status === "published" ? "cursor-default border-emerald-300" : i.status === "approved" ? "border-lavender" : "border-amber-300",
                    )}
                    title={`${i.series} · Episode ${i.number}: ${i.title} (${i.status})`}
                  >
                    <div className="text-mist">{new Date(i.release_at).toISOString().slice(11, 16)} UTC</div>
                    <div className="truncate font-medium">{i.series}</div>
                    <div className="truncate text-mist">Ep {i.number} · {i.title}</div>
                    {i.status !== "published" && (
                      <div className="mt-1 flex gap-1 sm:hidden">
                        <button className="rounded bg-white/10 px-1.5" aria-label="Move a day earlier" onClick={() => move(i.id, d - 1)}>‹</button>
                        <button className="rounded bg-white/10 px-1.5" aria-label="Move a day later" onClick={() => move(i.id, d + 1)}>›</button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

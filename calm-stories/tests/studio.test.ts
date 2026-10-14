import { beforeEach, describe, expect, it } from "vitest";
import { freshDb, viewers } from "./helpers";
import type { LocalDatabase } from "@/lib/db/local";
import { playsByDay, statsFor, studioEpisode, studioOverview, studioProduction, studioSeries } from "@/lib/studio";
import { listNotifications, markRead, unreadCount } from "@/lib/notifications";
import type { ListeningEvent } from "@/lib/types";

let db: LocalDatabase;
beforeEach(() => {
  db = freshDb();
});

function ev(kind: ListeningEvent["kind"], user: string, at: string, sample = false): ListeningEvent {
  return { id: `${kind}-${user}-${at}`, user_id: user, anonymous_id: null, episode_id: "e", series_id: "s", kind, position_seconds: 0, listened_seconds: 600, is_sample: sample, created_at: at };
}

describe("Creator Studio", () => {
  it("summarises listening and flags sample data", () => {
    const events = [ev("play", "a", "2026-10-13T10:00:00Z"), ev("play", "b", "2026-10-14T10:00:00Z", true), ev("complete", "a", "2026-10-13T10:30:00Z")];
    const s = statsFor(events);
    expect(s).toMatchObject({ plays: 2, completions: 1, completionRate: 0.5, listeners: 2, includesSample: true });
    expect(statsFor(events.slice(0, 1)).includesSample).toBe(false);
    const days = playsByDay(events, 7, new Date("2026-10-14T23:00:00Z"));
    expect(days).toHaveLength(7);
    expect(days.at(-1)).toEqual({ date: "2026-10-14", plays: 1 });
    expect(days.at(-2)).toEqual({ date: "2026-10-13", plays: 1 });
  });

  it("shows creators only their own series", async () => {
    const creator = await viewers.creator();
    const o = await studioOverview(creator);
    expect(o.rows.length).toBeGreaterThan(0);
    expect(o.rows.every((r) => r.series.creator_id === creator.user!.id)).toBe(true);
    const mine = o.rows[0]!.series;
    const detail = await studioSeries(creator, mine.id);
    expect(detail.rows.length).toBeGreaterThan(0);
    const ep = detail.rows[0]!.episode;
    const epView = await studioEpisode(creator, mine.id, ep.id);
    expect(epView.episode.id).toBe(ep.id);
    expect(epView.retention).toHaveLength(4);

    // Another creator can't see it, and episode/series ids must match.
    await expect(studioSeries(await viewers.otherCreator(), mine.id)).rejects.toThrow();
    const other = (await db.list("series")).find((s) => s.id !== mine.id)!;
    await expect(studioEpisode(creator, other.id, ep.id)).rejects.toThrow();
    // Listeners have no studio.
    await expect(studioOverview(await viewers.listener())).rejects.toThrow(/Creator/);
    expect((await studioProduction(creator)).bySeries.length).toBe(o.rows.length);
  });
});

describe("Notifications", () => {
  it("marks only the viewer's own notifications as read", async () => {
    const listener = await viewers.listener();
    const free = await viewers.free();
    const now = new Date().toISOString();
    await db.insert("notifications", { id: "n-mine", user_id: listener.user!.id, kind: "new_episode", title: "New", body: "", link: null, read: false, created_at: now });
    await db.insert("notifications", { id: "n-theirs", user_id: free.user!.id, kind: "system", title: "Hi", body: "", link: null, read: false, created_at: now });
    const before = await unreadCount(listener);
    expect(before).toBeGreaterThan(0);
    expect(await markRead(listener, ["n-theirs", "n-mine"])).toBe(1);
    expect((await db.get("notifications", "n-theirs"))?.read).toBe(false);
    expect(await unreadCount(listener)).toBe(before - 1);
    await markRead(listener, "all");
    expect(await unreadCount(listener)).toBe(0);
    expect((await listNotifications(listener)).every((n) => n.user_id === listener.user!.id)).toBe(true);
    expect(await unreadCount(await viewers.visitor())).toBe(0);
  });
});

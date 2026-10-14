import { beforeEach, describe, expect, it } from "vitest";
import { freshDb, viewers } from "./helpers";
import { canEditSeries, canViewSeries, listenAccess } from "@/lib/auth/policy";
import { getHomeShelves, getPlayerTrack, getSeriesPage, resumePoint, searchCatalog } from "@/lib/services/catalog";
import { recordProgress, setSaved, setFollowSeries } from "@/lib/services/listener";
import { signSession, verifySession } from "@/lib/auth/session";
import { rateLimit } from "@/lib/ratelimit";
import { encodeWav, decodeWav } from "@/lib/audio/wav";
import { renderAmbience, rmsDb } from "@/lib/audio/synth";
import { buildSeedSnapshot } from "@/lib/seed/build";
import type { LocalDatabase } from "@/lib/db/local";

let db: LocalDatabase;
beforeEach(() => {
  db = freshDb();
});

describe("seed catalogue", () => {
  it("has at least 20 distinct published series with episodes", () => {
    const s = buildSeedSnapshot(new Date());
    const published = s.series.filter((x) => x.status === "published");
    expect(published.length).toBeGreaterThanOrEqual(20);
    expect(new Set(published.map((x) => x.slug)).size).toBe(published.length);
    for (const series of published) expect(s.episodes.some((e) => e.series_id === series.id)).toBe(true);
  });
  it("is deterministic for the same clock", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    expect(JSON.stringify(buildSeedSnapshot(now))).toBe(JSON.stringify(buildSeedSnapshot(now)));
  });
});

describe("entitlements and privacy", () => {
  it("visitors can preview episode 1 but not later episodes", async () => {
    const v = await viewers.visitor();
    const series = (await db.findOne("series", { slug: "the-moonlit-kingdom" }))!;
    const [ep1, ep2] = await db.list("episodes", { where: { series_id: series.id }, orderBy: { column: "number" } });
    expect(listenAccess(v, series, ep1!)).toBe("preview");
    expect(listenAccess(v, series, ep2!)).toBe("locked");
    expect(listenAccess(await viewers.free(), series, ep2!)).toBe("locked");
    expect(listenAccess(await viewers.listener(), series, ep2!)).toBe("full");
  });

  it("drafts are visible only to their creator and admins", async () => {
    const draft = (await db.findOne("series", { slug: "the-lighthouse-bakery" }))!;
    expect(canViewSeries(await viewers.visitor(), draft)).toBe(false);
    expect(canViewSeries(await viewers.listener(), draft)).toBe(false);
    expect(canViewSeries(await viewers.otherCreator(), draft)).toBe(false);
    expect(canViewSeries(await viewers.creator(), draft)).toBe(true);
    expect(canViewSeries(await viewers.admin(), draft)).toBe(true);
    expect(canEditSeries(await viewers.otherCreator(), draft)).toBe(false);
    expect(await getSeriesPage(await viewers.listener(), "the-lighthouse-bakery")).toBeNull();
    const results = await searchCatalog(await viewers.creator(), "lighthouse bakery", null);
    expect(results.find((r) => r.slug === "the-lighthouse-bakery")).toBeUndefined();
  });

  it("scheduled (future) episodes are not playable", async () => {
    const future = (await db.list("episodes", { where: { status: "approved" } }))[0];
    expect(future).toBeDefined();
    expect(await getPlayerTrack(await viewers.listener(), future!.id)).toBeNull();
  });

  it("player tracks for locked episodes carry no audio source", async () => {
    const t = await getPlayerTrack(await viewers.visitor(), "ep-the-moonlit-kingdom-2");
    expect(t?.access).toBe("locked");
    expect(t?.src).toBe("");
  });
});

describe("Journey A: listener", () => {
  it("browse → open series → play → save → resume", async () => {
    const v = await viewers.listener();
    const home = await getHomeShelves(v);
    const titles = home.shelves.map((s) => s.title);
    expect(titles).toContain("Continue Listening");
    expect(titles).toContain("Trending Sleep Stories");
    expect(titles).toContain("Recommended For You");

    const page = (await getSeriesPage(v, "orbit-of-quiet"))!;
    const ep1 = page.seasons[0]!.episodes[0]!;
    const track = (await getPlayerTrack(v, ep1.id))!;
    expect(track.src).toBe(`/api/stream/${ep1.id}`);

    await setSaved(v, page.series.id, true);
    await setFollowSeries(v, page.series.id, true);
    await recordProgress(v, { episodeId: ep1.id, position: 120, duration: 600, event: "pause" });

    const again = (await getSeriesPage(v, "orbit-of-quiet"))!;
    expect(again.card.saved).toBe(true);
    expect(again.following).toBe(true);
    expect(again.resume?.episodeId).toBe(ep1.id);
    expect((await getPlayerTrack(v, ep1.id))!.startAt).toBe(120);

    await recordProgress(v, { episodeId: ep1.id, position: 600, duration: 600, event: "complete" });
    const after = (await getSeriesPage(v, "orbit-of-quiet"))!;
    expect(after.resume?.episodeId).toBe(page.seasons[0]!.episodes[1]!.id);
  });

  it("visitors cannot record progress for locked episodes", async () => {
    await expect(recordProgress(await viewers.visitor(), { episodeId: "ep-the-moonlit-kingdom-2", position: 1, duration: 10 })).rejects.toThrow();
  });
});

describe("resumePoint", () => {
  it("returns the next episode after a completed one", () => {
    const eps = [1, 2, 3].map((n) => ({ id: `e${n}`, number: n, title: `E${n}` })) as never;
    const r = resumePoint(eps, [{ episode_id: "e1", completed: true, updated_at: "2026-01-01", position_seconds: 10, duration_seconds: 10 }] as never);
    expect(r?.episodeId).toBe("e2");
  });
});

describe("infrastructure", () => {
  it("session cookies are tamper-proof", () => {
    const v = signSession("user-ada");
    expect(verifySession(v)).toBe("user-ada");
    expect(verifySession(v.replace(/.$/, (c) => (c === "a" ? "b" : "a")))).toBeNull();
    expect(verifySession("garbage")).toBeNull();
  });
  it("rate limiter blocks after the limit", () => {
    const key = `t-${Math.random()}`;
    for (let i = 0; i < 5; i++) expect(rateLimit(key, 5, 1000)).toBe(true);
    expect(rateLimit(key, 5, 1000)).toBe(false);
    expect(rateLimit(key, 5, 70000)).toBe(true);
  });
  it("synthesised ambience is gentle: no clipping, quiet, faded edges", () => {
    const pcm = renderAmbience([{ kind: "rain", gain: 0.8 }, { kind: "pad", gain: 0.2 }], { seconds: 20, seed: 3 });
    let peak = 0;
    for (const v of pcm) peak = Math.max(peak, Math.abs(v));
    expect(peak).toBeLessThan(0.55);
    expect(rmsDb(pcm)).toBeLessThan(-20);
    expect(Math.abs(pcm[0]!)).toBeLessThan(0.001);
    const round = decodeWav(encodeWav(pcm));
    expect(round.samples.length).toBe(pcm.length);
  });
});

import { describe, expect, it } from "vitest";
import { ANONYMOUS, canEditSeries, canStreamEpisode, canUseLibrary, isEpisodePublic, tierOf } from "@/lib/auth/policy";
import { freshDb, viewerFor } from "./helpers";

const series = { status: "published" as const, creator_id: "usr_iris-vale" };
const now = new Date("2026-10-14T12:00:00Z");

describe("episode visibility", () => {
  it("publishes approved episodes only once their release time has passed", () => {
    expect(isEpisodePublic({ status: "approved", release_at: "2026-10-15T00:00:00Z" }, series, now)).toBe(false);
    expect(isEpisodePublic({ status: "approved", release_at: "2026-10-13T00:00:00Z" }, series, now)).toBe(true);
    expect(isEpisodePublic({ status: "in_review", release_at: "2026-10-13T00:00:00Z" }, series, now)).toBe(false);
    expect(isEpisodePublic({ status: "draft", release_at: null }, series, now)).toBe(false);
  });
  it("never exposes episodes of unpublished series", () => {
    expect(isEpisodePublic({ status: "published", release_at: null }, { status: "draft" }, now)).toBe(false);
  });
});

describe("entitlements and roles are independent", () => {
  it("gates full listening on Premium but allows previews", async () => {
    const db = freshDb(now);
    const maya = await viewerFor(db, "usr_maya");
    const free = await viewerFor(db, "usr_visitor-free");
    const hana = await viewerFor(db, "usr_hana-okafor"); // creator without Premium
    const ep = { status: "published" as const, release_at: null, is_preview: false };
    const preview = { ...ep, is_preview: true };
    const other = { status: "published" as const, creator_id: "usr_calm-originals" };
    expect(canStreamEpisode(ANONYMOUS, preview, other, now).allowed).toBe(true);
    expect(canStreamEpisode(ANONYMOUS, ep, other, now)).toEqual({ allowed: false, reason: "premium_required" });
    expect(canStreamEpisode(free, ep, other, now).allowed).toBe(false);
    expect(canStreamEpisode(maya, ep, other, now).allowed).toBe(true);
    // Creator role does not grant Premium listening of other people's work…
    expect(canStreamEpisode(hana, ep, other, now).allowed).toBe(false);
    // …but creators can always hear their own drafts.
    expect(canStreamEpisode(hana, { status: "draft", release_at: null, is_preview: false }, { status: "draft", creator_id: "usr_hana-okafor" }, now).allowed).toBe(true);
    expect(canUseLibrary(maya)).toBe(true);
    expect(canUseLibrary(hana)).toBe(false);
    expect(tierOf(hana)).toBe("creator");
  });
  it("only lets creators edit their own series (admins edit all)", async () => {
    const db = freshDb(now);
    const iris = await viewerFor(db, "usr_iris-vale");
    const admin = await viewerFor(db, "usr_calm-editor");
    const maya = await viewerFor(db, "usr_maya");
    expect(canEditSeries(iris, { creator_id: "usr_iris-vale" })).toBe(true);
    expect(canEditSeries(iris, { creator_id: "usr_hana-okafor" })).toBe(false);
    expect(canEditSeries(maya, { creator_id: "usr_maya" })).toBe(false);
    expect(canEditSeries(admin, { creator_id: "usr_hana-okafor" })).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { ANONYMOUS, canStreamEpisode, canUseLibrary, canViewSeries, isEpisodePublic, tierOf } from "@/lib/auth/policy";
import { freshDb, viewerFor } from "./helpers";

const series = { status: "published" as const };
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

describe("entitlements and staff roles are independent", () => {
  it("gates full listening on Premium but allows previews", async () => {
    const db = freshDb(now);
    const maya = await viewerFor(db, "usr_maya");
    const free = await viewerFor(db, "usr_visitor-free");
    const ep = { status: "published" as const, release_at: null, is_preview: false };
    const preview = { ...ep, is_preview: true };
    expect(canStreamEpisode(ANONYMOUS, preview, series, now).allowed).toBe(true);
    expect(canStreamEpisode(ANONYMOUS, ep, series, now)).toEqual({ allowed: false, reason: "premium_required" });
    expect(canStreamEpisode(free, ep, series, now).allowed).toBe(false);
    expect(canStreamEpisode(maya, ep, series, now).allowed).toBe(true);
    expect(canUseLibrary(maya)).toBe(true);
    expect(canUseLibrary(free)).toBe(false);
    expect(tierOf(maya)).toBe("premium");
    expect(tierOf(free)).toBe("free");
  });
  it("only lets Calm staff see unreleased content", async () => {
    const db = freshDb(now);
    const admin = await viewerFor(db, "usr_calm-editor");
    const maya = await viewerFor(db, "usr_maya");
    const draft = { status: "draft" as const };
    const ep = { status: "in_review" as const, release_at: null, is_preview: false };
    expect(canViewSeries(maya, draft)).toBe(false);
    expect(canViewSeries(admin, draft)).toBe(true);
    expect(canStreamEpisode(maya, ep, draft, now)).toEqual({ allowed: false, reason: "not_found" });
    expect(canStreamEpisode(admin, ep, draft, now).allowed).toBe(true);
    expect(tierOf(admin)).toBe("admin");
  });
});

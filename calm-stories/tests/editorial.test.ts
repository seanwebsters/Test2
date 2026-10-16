import { describe, expect, it } from "vitest";
import { addUploadedEpisode, decideReview } from "@/lib/services/editorial";
import { releaseDueEpisodes } from "@/lib/services/releases";
import { isEpisodePublic } from "@/lib/auth/policy";
import { encodeWav } from "@/lib/audio/wav";
import { freshDb } from "./helpers";

function wav() {
  const data = encodeWav(new Float32Array(2205));
  return { type: "audio/wav", size: data.length, data };
}

describe("upload → review → scheduled release", () => {
  it("keeps uploads private until approved and released", async () => {
    const db = freshDb();
    const series = (await db.list("series", { where: { status: "published" } }))[0]!;
    const future = new Date(Date.now() + 3 * 86400000).toISOString();
    const { episode_id, review_id } = await addUploadedEpisode({
      seriesId: series.id,
      seasonNumber: 1,
      title: "The Lantern Keeper",
      summary: "A quiet walk along the harbour wall.",
      durationSeconds: 1500,
      requestedReleaseAt: future,
      file: wav(),
      uploadedBy: "usr_calm-editor",
    });
    let ep = (await db.get("episodes", episode_id))!;
    expect(ep.status).toBe("in_review");
    expect(isEpisodePublic(ep, series)).toBe(false);
    const review = (await db.get("editorial_reviews", review_id))!;
    expect(review.checks.find((c) => c.name === "audio")?.status).not.toBe("fail");

    await decideReview(review_id, "usr_calm-editor", { decision: "approve" });
    ep = (await db.get("episodes", episode_id))!;
    expect(ep.status).toBe("approved");
    expect(ep.release_at).toBe(future);
    expect(isEpisodePublic(ep, series)).toBe(false);

    await releaseDueEpisodes(new Date(Date.now() + 4 * 86400000));
    ep = (await db.get("episodes", episode_id))!;
    expect(ep.status).toBe("published");
    expect(isEpisodePublic(ep, series, new Date(Date.now() + 4 * 86400000))).toBe(true);
  });

  it("rejects files that aren't audio", async () => {
    const db = freshDb();
    const series = (await db.list("series"))[0]!;
    const data = Buffer.from("not audio at all");
    await expect(
      addUploadedEpisode({ seriesId: series.id, seasonNumber: 1, title: "x", summary: "y", durationSeconds: 600, requestedReleaseAt: null, file: { type: "audio/mpeg", size: data.length, data }, uploadedBy: "usr_calm-editor" }),
    ).rejects.toThrow(/valid audio/);
  });
});

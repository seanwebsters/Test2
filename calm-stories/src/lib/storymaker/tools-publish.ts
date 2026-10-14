import "server-only";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { badRequest } from "@/lib/errors";
import { hashString, newId, nowIso, prng } from "@/lib/util";
import { computeReviewChecks } from "@/lib/services/review-checks";
import { generateImage, imageProviderStatus } from "@/lib/media/images";
import { defineTool } from "./registry";
import { currentScriptText, getEpisodeInSeries } from "./scripts";
import { paletteFor } from "./tools-story";

const SceneEnum = z.enum(["kingdom", "forest", "cabin", "space", "ocean", "garden", "library", "village", "coast", "desert", "aurora", "city", "lake"]);

function shiftHex(hex: string, rand: () => number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.max(0, Math.min(255, Math.round(c + (rand() - 0.5) * 40))));
  return `#${ch.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

defineTool({
  name: "generate_cover_art",
  description:
    "Create new series key art. Uses the configured image provider when available; otherwise renders a new procedural cinematic scene in the series' visual style.",
  input: z.object({ scene: SceneEnum.optional(), prompt: z.string().max(1000).optional(), kind: z.enum(["cover", "banner", "episode"]).default("cover") }),
  permission: "creator",
  seriesScoped: true,
  confirm: (_i, ctx) => (!ctx.confirmed && imageProviderStatus().configured ? `Image generation uses ${imageProviderStatus().provider} (paid).` : null),
  async run(input, ctx) {
    const db = getDb();
    const s = ctx.series!;
    const scene = input.scene ?? s.artwork.scene;
    const seed = hashString(`${s.id}:${Date.now()}`);
    const rand = prng(seed);
    const base = scene === s.artwork.scene ? s.artwork.palette : paletteFor(scene);
    const palette = base.map((c) => (c.startsWith("#") ? shiftHex(c, rand) : c)) as [string, string, string, string];
    const generated = await generateImage({
      prompt: input.prompt ?? `${s.title}: ${s.tagline}. Cinematic, peaceful key art, ${scene}, moonlight, premium entertainment poster, no text.`,
      seriesId: s.id,
    });
    const spec = { scene, palette, seed, image_url: generated?.url ?? null };
    await db.insert("artwork_assets", {
      id: newId("art"),
      owner_id: ctx.viewer.user.id,
      series_id: s.id,
      episode_id: null,
      character_id: null,
      kind: input.kind,
      source: generated ? "generated" : "procedural",
      spec,
      prompt: input.prompt ?? null,
      provider: generated?.provider ?? "calm-procedural",
      simulated: !generated,
      created_at: nowIso(),
    });
    if (input.kind === "cover") await db.update("series", s.id, { artwork: spec, updated_at: nowIso() });
    return {
      summary: generated ? "New cover art generated and applied." : `New ${scene} key art rendered in your series palette and applied as the cover. (Procedural artwork – connect an image provider for AI-generated art.)`,
      focus: { section: "artwork" },
    };
  },
});

defineTool({
  name: "save_rights_declaration",
  description: "Record the creator's ownership and rights declaration for the series (required before submitting for review).",
  input: z.object({
    original_work: z.boolean(),
    ai_assisted: z.boolean().default(true),
    third_party_material: z.string().max(2000).default("None"),
    voice_consent: z.boolean(),
  }),
  permission: "creator",
  seriesScoped: true,
  async run(input, ctx) {
    const db = getDb();
    const existing = await db.findOne("rights_declarations", { series_id: ctx.series!.id });
    const row = { id: existing?.id ?? newId("rgt"), series_id: ctx.series!.id, user_id: ctx.viewer.user.id, ...input, accepted_terms_version: "2026-01", created_at: nowIso() };
    await db.upsert("rights_declarations", row);
    if (input.ai_assisted) await db.update("series", ctx.series!.id, { ai_disclosure: ctx.series!.ai_disclosure ?? "Written with Calm Storymaker assistance and reviewed by the creator." });
    return { summary: "Rights declaration saved.", focus: { section: "publishing" } };
  },
});

defineTool({
  name: "submit_for_review",
  description: "Submit an episode to Calm's editorial team. It stays private until approved; an optional requested release time is honoured only after approval.",
  input: z.object({ episode_id: z.string(), requested_release_at: z.string().datetime().optional(), note: z.string().max(1000).default("") }),
  permission: "creator",
  seriesScoped: true,
  confirm: (_i, ctx) => (ctx.confirmed ? null : "Submitting sends this episode to Calm's editorial team for review before it can be published."),
  async run(input, ctx) {
    const db = getDb();
    const ep = await getEpisodeInSeries(input.episode_id, ctx.series!.id);
    if (["in_review", "approved", "published"].includes(ep.status)) throw badRequest("This episode is already in review or released.");
    if (!(await currentScriptText(ep.id))) throw badRequest("Write and approve the script first.");
    if (!ep.audio_asset_id) throw badRequest("Produce the audio before submitting.");
    if (!ctx.series!.is_official && !(await db.findOne("rights_declarations", { series_id: ctx.series!.id }))) {
      throw badRequest("Complete the ownership & rights declaration in Publishing first.");
    }
    if (input.requested_release_at && new Date(input.requested_release_at) < new Date()) throw badRequest("Choose a release time in the future.");
    const checks = await computeReviewChecks(ep.id);
    const now = nowIso();
    await db.insert("editorial_reviews", {
      id: newId("rev"),
      episode_id: ep.id,
      series_id: ep.series_id,
      submitted_by: ctx.viewer.user.id,
      source: "creator",
      status: "pending",
      checks,
      requested_release_at: input.requested_release_at ?? null,
      reviewer_id: null,
      notes: input.note,
      created_at: now,
      decided_at: null,
    });
    await db.update("episodes", ep.id, { status: "in_review", updated_at: now });
    const editors = await db.list("user_roles", { where: { role: ["admin", "editor"] } });
    for (const uid of new Set(editors.map((e) => e.user_id))) {
      await db.insert("notifications", { id: newId("ntf"), user_id: uid, kind: "review", title: "New episode awaiting review", body: `${ctx.series!.title} – Episode ${ep.number}: ${ep.title}`, link: "/admin/review", read: false, created_at: now });
    }
    const failing = checks.filter((c) => c.status === "fail").length;
    return { summary: `Submitted “${ep.title}” for editorial review.${failing ? ` ${failing} automated check(s) need attention – editors will see them.` : ""} You'll be notified when it's reviewed.`, focus: { section: "publishing" } };
  },
});

defineTool({
  name: "schedule_episode",
  description: "Request (or change) the release time for an episode. Approved episodes are published automatically at this time; unapproved ones keep the request for the editor.",
  input: z.object({ episode_id: z.string(), release_at: z.string().datetime() }),
  permission: "creator",
  seriesScoped: true,
  confirm: (_i, ctx) => (ctx.confirmed ? null : "Scheduling sets when this episode becomes public (after editorial approval)."),
  async run(input, ctx) {
    const db = getDb();
    const ep = await getEpisodeInSeries(input.episode_id, ctx.series!.id);
    if (new Date(input.release_at) < new Date()) throw badRequest("Choose a time in the future.");
    if (ep.status === "published") throw badRequest("This episode is already published.");
    if (ep.status === "approved") {
      await db.update("episodes", ep.id, { release_at: input.release_at, updated_at: nowIso() });
      const sched = await db.findOne("publishing_schedules", { episode_id: ep.id, status: "scheduled" });
      if (sched) await db.update("publishing_schedules", sched.id, { release_at: input.release_at, updated_at: nowIso() });
      return { summary: `Release moved to ${new Date(input.release_at).toUTCString()}.`, focus: { section: "publishing" } };
    }
    const review = (await db.list("editorial_reviews", { where: { episode_id: ep.id, status: "pending" } }))[0];
    if (review) await db.update("editorial_reviews", review.id, { requested_release_at: input.release_at });
    else await db.update("episodes", ep.id, { release_at: input.release_at, updated_at: nowIso() });
    return { summary: `Requested release time saved. It takes effect once the episode is approved.`, focus: { section: "publishing" } };
  },
});

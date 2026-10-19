import "server-only";
import { getDb } from "@/lib/db";
import { nowIso } from "@/lib/util";
import type { ArtworkAsset } from "@/lib/types";
import { getBible, seriesContext, updateBible } from "../bible";
import { registerHandler, type NewStep, type StepContext } from "../engine";
import { StepFailure } from "../errors";
import { applyTitle, artworkForReview, generateArtwork } from "../art";
import { getStudioSettings } from "../settings";
import { CoverPromptsSchema, ImageReviewSchema, VisualIdentitySchema, type ImageReview } from "../schemas";
import type { SeriesBible } from "../types";

/** Series art chain, appended once the bible is consistent. Ends at the greenlight gate. */
export function artSteps(after: string): NewStep[] {
  return [
    { key: "visual_identity", type: "art.visual_identity", agent: "art_director", label: "Create the visual identity", activity: "thinking", deps: [after] },
    { key: "portraits", type: "art.portraits", agent: "art_director", label: "Paint character portraits", activity: "typing", deps: ["visual_identity"] },
    { key: "posters", type: "art.posters", agent: "art_director", label: "Create poster concepts", activity: "typing", deps: ["portraits"], params: { round: 1 } },
    { key: "poster_review", type: "art.poster_review", agent: "art_director", label: "Review posters and pick the strongest", activity: "reading", deps: ["posters"], params: { round: 1 } },
    { key: "greenlight", type: "series.greenlight", agent: "network_executive", label: "Greenlight the series", activity: "reading", deps: ["poster_review"] },
  ];
}

function visualBrief(b: SeriesBible): string {
  const v = b.visual_identity;
  if (!v) return "";
  return `Visual identity – palette: ${v.palette.map((p) => `${p.name} ${p.hex}`).join(", ")}. Lighting: ${v.lighting}. Mood: ${v.mood}. Composition: ${v.composition_rules.join("; ")}.`;
}

/* ---------------- Series key art (house prompt) ---------------- */

export const KEY_ART_COMPOSITIONS = [
  "hands almost touching over a glowing relic",
  "vast symmetrical wide shot with tiny silhouetted lovers",
  "mirrored split profile across one light source",
  "overhead figure adrift on still water among lanterns",
  "low-angle hero shot through falling petals/snow/embers",
  "candlelit interior, painterly chiaroscuro",
  "single iconic object centred on dark field, A24-style",
  "golden-hour silhouette against an enormous moon",
];
export const KEY_ART_PALETTES = [
  "midnight blue & silver",
  "emerald & antique gold",
  "frost white & pale ice blue",
  "deep violet & amber candlelight",
  "storm grey & bioluminescent teal",
  "rose-gold dawn & soft lilac",
  "ink black & molten copper",
  "sea-glass green & moonlit pearl",
];
export const KEY_ART_LETTERING = [
  "towering condensed serif with metallic sheen",
  "hand-lettered calligraphic",
  "glowing neon-edged retro",
  "carved stone-textured",
  "delicate art-nouveau",
  "bold modern sans with wide tracking",
  "gilded ornate fairytale",
];

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)]!;

/** The studio's key-art prompt: one random composition, palette and lettering per story, so no two match. */
export function keyArtPrompt(input: { title: string; logline: string; world: string; tone: string }): { prompt: string; composition: string; palette: string; lettering: string } {
  const composition = pick(KEY_ART_COMPOSITIONS);
  const palette = pick(KEY_ART_PALETTES);
  const lettering = pick(KEY_ART_LETTERING);
  const prompt = `Premium cinematic theatrical key art poster for a new streaming original series, Netflix / HBO campaign calibre. Photorealistic film still, natural film grain, shot on ARRI large-format with anamorphic lens, rich cinematic colour grade, dramatic but calm and dreamy. Composition: ${composition}. Palette: ${palette}. It must look completely unlike any other poster — its own concept, framing, lighting and typography; no generic person standing in a landscape, no generic castle. Draw one striking, original visual idea from this story. Story: ${input.logline}. World: ${input.world.slice(0, 600)}. Mood: ${input.tone}. The title "${input.title}" is baked into the artwork as a ${lettering}, perfectly spelled, integrated into the design. No other text, no taglines, no credits, no logos.`;
  return { prompt, composition, palette, lettering };
}

/** Bible world as prose for the key-art prompt. */
function worldText(b: SeriesBible): string {
  const w = b.world;
  if (!w) return b.identity?.premise ?? "";
  return [w.name, w.overview, w.atmosphere, ...w.recurring_locations.map((l) => `${l.name}: ${l.description}`)].filter(Boolean).join(" ");
}

const NO_TEXT = "Premium theatrical film-marketing quality: considered composition, motivated cinematic light, restrained palette, believable materials and textures, expressive faces with real character. Absolutely no text, letters, logos, watermarks or signatures anywhere in the image.";

async function leadReferences(seriesId: string, max = 2) {
  const db = getDb();
  const chars = (await db.list("characters", { where: { series_id: seriesId } })).filter((c) => c.portrait_asset_id);
  const order = { lead: 0, love_interest: 1, supporting: 2, narrator: 3 } as const;
  const refs: { mimeType: string; data: Buffer; label: string; name: string }[] = [];
  for (const c of chars.sort((a, b) => order[a.role] - order[b.role]).slice(0, max)) {
    const a = await db.get("artwork_assets", c.portrait_asset_id!);
    const img = a ? await artworkForReview(a, 768) : null;
    if (img) refs.push({ ...img, label: `${c.name} – keep this exact face, hair and look`, name: c.name });
  }
  return refs;
}

registerHandler("art.visual_identity", async (ctx) => {
  const db = getDb();
  const sid = ctx.run.series_id!;
  const res = await ctx.claude({
    context: await seriesContext(sid),
    prompt: "Create this series' visual identity: palette (5–6 colours with hex), lighting, mood, composition rules, typography direction for the title, a poster brief, three distinct poster concept prompts, and a stable visual description for every character (refining their bible description so artwork stays consistent all season).",
    schema: VisualIdentitySchema,
  });
  const v = res.data;
  await updateBible(sid, (b) => ({ ...b, visual_identity: { palette: v.palette, lighting: v.lighting, mood: v.mood, composition_rules: v.composition_rules, typography: v.typography, poster_brief: v.poster_brief } }), {
    reason: "Visual identity created",
    agent: "art_director",
    runId: ctx.run.id,
  });
  for (const cv of v.character_visuals) {
    const c = await db.findOne("characters", { series_id: sid, name: cv.name });
    if (c) await db.update("characters", c.id, { visual_description: cv.visual_description, updated_at: nowIso() });
  }
  const hex = v.palette.map((p) => p.hex).filter((h) => /^#[0-9a-f]{6}$/i.test(h));
  const series = await db.get("series", sid);
  if (series && hex.length >= 4) await db.update("series", sid, { artwork: { ...series.artwork, palette: [hex[0]!, hex[1]!, hex[2]!, hex[3]!] } });
  await ctx.deliver({ kind: "visual_identity", key: "visual_identity", title: "Visual identity", data: v, reasoning: v.mood, model: res.model });
  return { summary: `${v.palette.map((p) => p.name).join(", ")} · ${v.typography.title_direction}` };
});

registerHandler("art.portraits", async (ctx) => {
  const db = getDb();
  const sid = ctx.run.series_id!;
  const bible = await getBible(sid);
  const order = { lead: 0, love_interest: 1, supporting: 2, narrator: 3 } as const;
  const chars = (await db.list("characters", { where: { series_id: sid } })).sort((a, b) => order[a.role] - order[b.role]).slice(0, 4);
  const made: string[] = [];
  for (const c of chars) {
    if (c.portrait_asset_id) continue; // resume without repaying
    await ctx.ensureBudget(5);
    const { asset, cost_cents } = await generateArtwork({
      meta: ctx.meta,
      seriesId: sid,
      characterId: c.id,
      kind: "character_portrait",
      aspectRatio: "3:4",
      prompt: `Character portrait for an original romantasy audio series. ${c.name}: ${c.visual_description}. Head-and-shoulders, three-quarter view, natural expression that shows their personality (${c.personality}). ${visualBrief(bible)} ${NO_TEXT}`,
    });
    await ctx.addCost(cost_cents);
    await db.update("artwork_assets", asset.id, { status: "selected" });
    await db.update("characters", c.id, { portrait_asset_id: asset.id, updated_at: nowIso() });
    made.push(c.name);
  }
  return { summary: made.length ? `Portraits: ${made.join(", ")}.` : "Portraits already in place." };
});

async function reviewImages(ctx: StepContext, assets: ArtworkAsset[], brief: string): Promise<ImageReview & { model: string }> {
  const images = [];
  for (const a of assets) {
    const img = await artworkForReview(a);
    if (!img) throw new StepFailure("Couldn't load an image for review.");
    images.push(img);
  }
  const res = await ctx.claude({
    context: await seriesContext(ctx.run.series_id!),
    images,
    prompt: `Review these ${assets.length} images (in order, numbered from 1) as the Art Director. ${brief}\nJudge composition, character consistency with the descriptions, anatomy and AI artefacts, palette fidelity, and whether it would stand out as premium film marketing. Select the strongest usable one (0 if none are usable).`,
    schema: ImageReviewSchema,
  });
  const db = getDb();
  for (const e of res.data.evaluations) {
    const a = assets[e.image_index - 1];
    if (a) await db.update("artwork_assets", a.id, { review: { strengths: e.strengths, issues: e.issues, consistency: e.consistency } });
  }
  return { ...res.data, model: res.model };
}

registerHandler("art.posters", async (ctx) => {
  const db = getDb();
  const sid = ctx.run.series_id!;
  const round = Number(ctx.step.params.round ?? 1);
  const bible = await getBible(sid);
  const existing = (await db.list("artwork_assets", { where: { run_id: ctx.run.id, kind: "poster" } })).filter((a) => a.prompt.includes(`[r${round}]`));
  if (existing.length) return { summary: `Key art already created (round ${round}).` };
  // One image per story, title baked in by the model (Nano Banana 2, 2:3 portrait).
  const art = keyArtPrompt({
    title: bible.identity?.title ?? "",
    logline: bible.identity?.logline ?? bible.identity?.premise ?? "",
    world: worldText(bible),
    tone: bible.identity?.tone ?? "",
  });
  await ctx.ensureBudget(10);
  const { cost_cents } = await generateArtwork({ meta: ctx.meta, seriesId: sid, kind: "poster", aspectRatio: "2:3", prompt: `[r${round}] ${art.prompt}` });
  await ctx.addCost(cost_cents);
  return { summary: `Key art created – ${art.composition}; ${art.palette}; ${art.lettering} title.` };
});

registerHandler("art.poster_review", async (ctx) => {
  const db = getDb();
  const sid = ctx.run.series_id!;
  const round = Number(ctx.step.params.round ?? 1);
  const posters = (await db.list("artwork_assets", { where: { run_id: ctx.run.id, kind: "poster" } })).filter((a) => a.prompt.includes(`[r${round}]`));
  if (!posters.length) throw new StepFailure("No poster concepts to review.");
  if (posters.length === 1) {
    // House key art: one image with the title already baked in – use it as is.
    const only = posters[0]!;
    await db.update("artwork_assets", only.id, { status: "selected" });
    const s1 = await db.get("series", sid);
    if (s1) await db.update("series", sid, { artwork: { ...s1.artwork, image_url: only.variants["1200w"] ?? only.url }, updated_at: nowIso() });
    return { summary: "Key art selected." };
  }
  const review = await reviewImages(ctx, posters, "These are poster concepts for the series.");
  await ctx.deliver({ kind: "image_review", key: "poster_review", title: `Poster review (round ${round})`, data: review, reasoning: review.rationale, model: review.model });
  if (review.selected_index < 1 && round < 2) {
    const feedback = review.evaluations.flatMap((e) => e.issues.map((i) => i.suggestion)).slice(0, 6).join(" ");
    return {
      summary: "No usable poster – sending back for another round.",
      addSteps: [
        { key: `posters_r${round + 1}`, type: "art.posters", agent: "art_director", label: "Create new poster concepts", activity: "typing", deps: [ctx.step.key], params: { round: round + 1, feedback } },
        { key: `poster_review_r${round + 1}`, type: "art.poster_review", agent: "art_director", label: "Review the new posters", activity: "reading", deps: [`posters_r${round + 1}`], params: { round: round + 1 } },
      ],
    };
  }
  const chosen = posters[Math.max(1, review.selected_index) - 1]!;
  await db.update("artwork_assets", chosen.id, { status: "selected" });
  const bible = await getBible(sid);
  const titled = await applyTitle(chosen, { title: bible.identity?.title ?? "", footer: "A Sleep Stories Original" });
  const series = await db.get("series", sid);
  if (series) await db.update("series", sid, { artwork: { ...series.artwork, image_url: titled.variants["1200w"] ?? titled.url }, updated_at: nowIso() });
  return { summary: `Selected poster ${review.selected_index}: ${review.rationale.slice(0, 160)}` };
});

/* ---------------- Episode covers ---------------- */

export function coverSteps(after: string): NewStep[] {
  return [
    { key: "cover_concepts", type: "art.cover_concepts", agent: "art_director", label: "Create episode cover concepts", activity: "typing", deps: [after] },
    { key: "cover_review", type: "art.cover_review", agent: "art_director", label: "Review covers and pick one", activity: "reading", deps: ["cover_concepts"] },
  ];
}

registerHandler("art.cover_concepts", async (ctx) => {
  const db = getDb();
  const sid = ctx.run.series_id!;
  const ep = (await db.get("episodes", ctx.run.episode_id!))!;
  const bible = await getBible(sid);
  const script = await db.findOne("episode_scripts", { episode_id: ep.id });
  const plan = await ctx.claude({
    context: await seriesContext(sid),
    prompt: `Write ${(await getStudioSettings()).cover_concepts === 1 ? "one cover-art prompt" : "two or three distinct cover-art prompts"} for episode ${ep.number}, “${ep.title}”: ${ep.summary}\nUse the episode's most evocative image from the script (opening scenes below). Cinematic 16:9 composition, features the named characters exactly as described, no text.\n\n${script?.scenes.slice(0, 2).map((s) => s.text.slice(0, 1500)).join("\n\n") ?? ""}`,
    schema: CoverPromptsSchema,
  });
  const chars = await db.list("characters", { where: { series_id: sid } });
  const featured = chars.filter((c) => plan.data.characters_featured.some((n) => n.toLowerCase().includes(c.name.toLowerCase().split(" ")[0]!)));
  const refs: { mimeType: string; data: Buffer; label: string }[] = [];
  for (const c of featured.slice(0, 2)) {
    const a = c.portrait_asset_id ? await db.get("artwork_assets", c.portrait_asset_id) : null;
    const img = a ? await artworkForReview(a, 768) : null;
    if (img) refs.push({ ...img, label: `${c.name} – keep this exact face, hair and look` });
  }
  for (const [i, p] of plan.data.prompts.slice(0, (await getStudioSettings()).cover_concepts).entries()) {
    await ctx.ensureBudget(5);
    const { cost_cents } = await generateArtwork({
      meta: ctx.meta,
      seriesId: sid,
      episodeId: ep.id,
      kind: "episode_cover",
      aspectRatio: "16:9",
      references: refs,
      prompt: `Episode cover ${i + 1} for “${bible.identity?.title}”, episode ${ep.number} “${ep.title}”. ${p} ${featured.map((c) => `${c.name}: ${c.visual_description}`).join(" ")} ${visualBrief(bible)} ${NO_TEXT}`,
    });
    await ctx.addCost(cost_cents);
  }
  return { summary: `${Math.min(3, plan.data.prompts.length)} cover concepts for “${ep.title}”.` };
});

registerHandler("art.cover_review", async (ctx) => {
  const db = getDb();
  const covers = await db.list("artwork_assets", { where: { run_id: ctx.run.id, kind: "episode_cover" } });
  if (!covers.length) throw new StepFailure("No covers to review.");
  if (covers.length === 1) {
    // Budget mode: a single concept is used directly – no paid image review.
    const only = covers[0]!;
    await db.update("artwork_assets", only.id, { status: "selected" });
    const ep1 = (await db.get("episodes", ctx.run.episode_id!))!;
    const s1 = (await db.get("series", ctx.run.series_id!))!;
    await applyTitle(only, { title: ep1.title, kicker: `${s1.title} · Episode ${ep1.number}` });
    await db.update("episodes", ep1.id, { artwork_url: only.variants["1200w"] ?? only.url, updated_at: nowIso() });
    return { summary: "Cover in place (single concept – no review needed)." };
  }
  const review = await reviewImages(ctx, covers, "These are episode cover concepts; they must match the series identity and keep characters consistent with their portraits.");
  await ctx.deliver({ kind: "image_review", key: "cover_review", title: "Cover review", data: review, reasoning: review.rationale, model: review.model });
  const chosen = covers[Math.max(1, review.selected_index) - 1]!;
  await db.update("artwork_assets", chosen.id, { status: "selected" });
  const ep = (await db.get("episodes", ctx.run.episode_id!))!;
  const series = (await db.get("series", ctx.run.series_id!))!;
  await applyTitle(chosen, { title: ep.title, kicker: `${series.title} · Episode ${ep.number}` });
  await db.update("episodes", ep.id, { artwork_url: chosen.variants["1200w"] ?? chosen.url, updated_at: nowIso() });
  return { summary: `Selected cover ${Math.max(1, review.selected_index)}${review.selected_index < 1 ? " (best available – flagged for your review)" : ""}.` };
});

/* ---------------- Environments and promotional assets ---------------- */

registerHandler("art.environments", async (ctx) => {
  const sid = ctx.run.series_id!;
  const bible = await getBible(sid);
  const locations = (bible.world?.recurring_locations ?? []).slice(0, 3);
  if (!locations.length) throw new StepFailure("The bible has no recurring locations yet.");
  for (const loc of locations) {
    await ctx.ensureBudget(5);
    const { cost_cents } = await generateArtwork({
      meta: ctx.meta,
      seriesId: sid,
      kind: "environment",
      aspectRatio: "16:9",
      prompt: `Environment concept art for “${bible.identity?.title}”: ${loc.name}. ${loc.description} Sensory details: ${loc.sensory_details.join(", ")}. Wide establishing shot, no people. ${visualBrief(bible)} ${NO_TEXT}`,
    });
    await ctx.addCost(cost_cents);
  }
  return { summary: `${locations.length} environment paintings: ${locations.map((l) => l.name).join(", ")}.` };
});

registerHandler("art.social", async (ctx) => {
  const db = getDb();
  const sid = ctx.run.series_id!;
  const bible = await getBible(sid);
  const poster = (await db.list("artwork_assets", { where: { series_id: sid, kind: "poster" } })).find((a) => a.status === "selected" || a.status === "approved");
  const refs = [...(poster ? [{ ...(await artworkForReview(poster, 768))!, label: "Series key art – match this look" }] : []), ...(await leadReferences(sid, 1))];
  const made: string[] = [];
  for (const [ratio, label] of [["1:1", "square social post"], ["9:16", "vertical story / reel cover"]] as const) {
    await ctx.ensureBudget(5);
    const { asset, cost_cents } = await generateArtwork({
      meta: ctx.meta,
      seriesId: sid,
      kind: ratio === "1:1" ? "social" : "promo",
      aspectRatio: ratio,
      references: refs,
      prompt: `Promotional ${label} for the audio series “${bible.identity?.title}”, consistent with the reference key art and characters. Leave clean space in the top third for the title. ${visualBrief(bible)} ${NO_TEXT}`,
    });
    await ctx.addCost(cost_cents);
    await applyTitle(asset, { title: bible.identity?.title ?? "", footer: bible.identity?.tagline });
    made.push(label);
  }
  return { summary: `Promo assets: ${made.join(", ")} (with typeset title).` };
});

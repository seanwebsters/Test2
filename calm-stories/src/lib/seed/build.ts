import type * as T from "@/lib/types";
import { DEFAULT_SCRIPT_SETTINGS } from "@/lib/types";
import { emptySnapshot, type Snapshot } from "@/lib/db/local";
import { hashString, prng, slugify } from "@/lib/util";
import { SEED_CREATORS, SEED_SERIES, SEED_SOUNDSCAPES, SEED_VOICES } from "./catalog";
import { DEFAULT_AGENT_CONFIGS, DEFAULT_AI_SETTINGS } from "./agents";

const DAY = 86400000;

/** Stable ids so links survive a database reset. */
export const DEMO_USERS = {
  listener: "user-ada",
  creator: "user-juniper-vale",
  admin: "user-calm-editor",
} as const;

function iso(d: Date | number) {
  return new Date(d).toISOString();
}

/**
 * Builds the complete demo database. Deterministic for a given `now`, so
 * tests and local resets always produce the same catalogue.
 */
export function buildSeedSnapshot(now: Date): Snapshot {
  const s = emptySnapshot();
  const t0 = now.getTime();
  const created = iso(t0 - 400 * DAY);

  /* ---------- users, creators, roles, entitlements ---------- */
  const creatorUserId = new Map<string, string>();
  for (const c of SEED_CREATORS) {
    const id = `user-${c.username}`;
    creatorUserId.set(c.key, id);
    s.users.push({ id, username: c.username, display_name: c.display_name, email: `${c.username}@example.com`, avatar_hue: c.hue, created_at: created });
    s.creator_profiles.push({
      id: `creator-${c.username}`,
      user_id: id,
      username: c.username,
      display_name: c.display_name,
      bio: c.bio,
      is_official: c.is_official,
      avatar: { scene: "portrait", palette: [`hsl(${c.hue} 45% 22%)`, `hsl(${c.hue} 50% 40%)`, `hsl(${c.hue} 70% 75%)`, "#ffffff"], seed: hashString(c.username) },
      created_at: created,
    });
    s.user_roles.push({ id: `role-${c.username}-creator`, user_id: id, role: "creator", created_at: created });
    s.subscription_entitlements.push({ id: `ent-${c.username}`, user_id: id, plan: "premium", status: "active", source: "mock", expires_at: null, created_at: created });
  }

  s.users.push(
    { id: DEMO_USERS.listener, username: "ada", display_name: "Ada Winslow", email: "ada@example.com", avatar_hue: 260, created_at: created },
    { id: DEMO_USERS.admin, username: "calm-editor", display_name: "Calm Editorial", email: "editor@example.com", avatar_hue: 230, created_at: created },
    { id: "user-sam", username: "sam", display_name: "Sam Rivers", email: "sam@example.com", avatar_hue: 30, created_at: created },
  );
  s.subscription_entitlements.push(
    { id: "ent-ada", user_id: DEMO_USERS.listener, plan: "premium", status: "active", source: "mock", expires_at: null, created_at: created },
    { id: "ent-calm-editor", user_id: DEMO_USERS.admin, plan: "premium", status: "active", source: "mock", expires_at: null, created_at: created },
    { id: "ent-sam", user_id: "user-sam", plan: "free", status: "active", source: "mock", expires_at: null, created_at: created },
  );
  s.user_roles.push(
    { id: "role-calm-editor-admin", user_id: DEMO_USERS.admin, role: "admin", created_at: created },
    { id: "role-calm-editor-editor", user_id: DEMO_USERS.admin, role: "editor", created_at: created },
  );

  /* ---------- voices & soundscapes ---------- */
  for (const v of SEED_VOICES) {
    s.voice_profiles.push({
      ...v,
      provider: "elevenlabs",
      approved: true,
      consent_record: "Licensed stock voice from the provider's library; no cloning. Licence ref documented in docs/RIGHTS.md.",
      created_at: created,
    });
  }
  for (const sc of SEED_SOUNDSCAPES) {
    s.soundscapes.push({
      id: `sound-${sc.slug}`,
      slug: sc.slug,
      name: sc.name,
      description: sc.description,
      layers: sc.layers.map((l) => ({ ...l })) as T.SoundLayer[],
      licence: "Procedurally synthesised in-house (no third-party recordings).",
      sample_url: `/api/audio/sample/${sc.slug}`,
      created_at: created,
    });
    s.audio_assets.push({
      id: `audio-sample-${sc.slug}`,
      owner_id: null,
      series_id: null,
      episode_id: null,
      kind: "sample",
      section_index: null,
      storage_key: `samples/${sc.slug}`,
      url: `/api/audio/sample/${sc.slug}`,
      mime_type: "audio/mpeg",
      duration_seconds: SAMPLE_SECONDS,
      provider: "procedural",
      simulated: true,
      qa: null,
      meta: { note: "Sample ambience standing in for produced narration." },
      created_at: created,
    });
  }

  /* ---------- series catalogue ---------- */
  for (const def of SEED_SERIES) {
    const rand = prng(hashString(def.slug));
    const seriesId = `series-${def.slug}`;
    const creatorId = creatorUserId.get(def.creator);
    if (!creatorId) throw new Error(`Unknown creator ${def.creator}`);
    const official = SEED_CREATORS.find((c) => c.key === def.creator)?.is_official ?? false;
    const publishedAt = t0 - def.age_days * DAY;
    const soundscapeId = `sound-${def.soundscape}`;

    s.series.push({
      id: seriesId,
      slug: def.slug,
      creator_id: creatorId,
      title: def.title,
      tagline: def.tagline,
      description: def.description,
      genre: def.genre,
      tags: def.tags,
      status: "published",
      is_official: official,
      artwork: { scene: def.scene, palette: def.palette, seed: hashString(def.slug) },
      narrator_voice_id: def.voice,
      soundscape_id: soundscapeId,
      content_rating: "all-ages",
      ai_disclosure: official ? null : "Written with AI assistance in Calm Storymaker and reviewed by the creator.",
      trending_score: def.trending,
      popularity: def.popularity,
      created_at: iso(publishedAt - 10 * DAY),
      updated_at: iso(publishedAt),
      published_at: iso(publishedAt),
    });

    const seasonId = `season-${def.slug}-1`;
    s.seasons.push({ id: seasonId, series_id: seriesId, number: 1, title: def.season.title, synopsis: def.season.synopsis, arc: def.season.arc, created_at: iso(publishedAt) });

    // Episodes release on a weekly-ish cadence from the series launch. The
    // newest one or two may still be scheduled in the future.
    const step = Math.max(1, Math.min(7, Math.floor(def.age_days / def.episodes.length)));
    def.episodes.forEach(([title, summary], i) => {
      const releaseMs = publishedAt + i * step * DAY;
      const isFuture = releaseMs > t0;
      const epId = `ep-${def.slug}-${i + 1}`;
      s.episodes.push({
        id: epId,
        series_id: seriesId,
        season_id: seasonId,
        number: i + 1,
        title,
        summary,
        duration_seconds: (20 + Math.floor(rand() * 5) * 5) * 60,
        status: isFuture ? "approved" : "published",
        release_at: iso(releaseMs),
        published_at: isFuture ? null : iso(releaseMs),
        audio_asset_id: `audio-sample-${def.soundscape}`,
        is_preview: i === 0,
        created_at: iso(releaseMs - 3 * DAY),
        updated_at: iso(releaseMs),
      });
      if (isFuture) {
        s.publishing_schedules.push({ id: `sched-${epId}`, episode_id: epId, series_id: seriesId, release_at: iso(releaseMs), status: "scheduled", created_by: DEMO_USERS.admin, created_at: iso(t0 - DAY), updated_at: iso(t0 - DAY) });
      }
      if (!isFuture) {
        s.narrative_events.push({ id: `ne-${epId}`, series_id: seriesId, episode_id: epId, kind: "event", summary: `${title}: ${summary}`, character_ids: [], created_at: iso(releaseMs) });
      }
    });

    s.story_bibles.push({
      id: `bible-${def.slug}`,
      series_id: seriesId,
      world_name: def.world.name,
      geography: def.world.geography,
      culture: def.world.culture,
      history: def.world.history,
      atmosphere: def.world.atmosphere,
      rules: def.world.rules,
      themes: def.world.themes,
      established_facts: def.locations.map((l) => `${l} is a recurring location.`),
      unresolved_threads: [def.season.arc],
      creator_preferences: ["Keep every episode gentle, with a restful ending.", "No peril, violence or cliffhangers."],
      updated_at: iso(publishedAt),
    });

    const charIds: string[] = [];
    def.characters.forEach((c, ci) => {
      const id = `char-${def.slug}-${slugify(c.name) || ci}`;
      charIds.push(id);
      s.characters.push({
        id,
        series_id: seriesId,
        name: c.name,
        age_range: c.age_range,
        personality: c.personality,
        backstory: c.backstory,
        motivations: c.motivations,
        narrative_role: c.role,
        voice_profile: c.voice,
        arc: c.arc,
        portrait: { scene: "portrait", palette: def.palette, seed: hashString(id) },
        created_at: iso(publishedAt),
        updated_at: iso(publishedAt),
      });
    });
    if (charIds.length >= 2) {
      s.character_relationships.push({
        id: `rel-${def.slug}-1`,
        series_id: seriesId,
        character_a_id: charIds[0] as string,
        character_b_id: charIds[1] as string,
        kind: def.genre === "Sleep Romantasy" || def.genre === "Coastal Romance" ? "Slow-burn romance" : "Companions",
        description: `${def.characters[0]?.name} and ${def.characters[1]?.name} grow closer over the season.`,
        created_at: iso(publishedAt),
      });
    }
    def.locations.forEach((name, li) => {
      s.locations.push({ id: `loc-${def.slug}-${li + 1}`, series_id: seriesId, name, description: `${name}, in ${def.world.name}.`, recurring: true, created_at: iso(publishedAt) });
    });
  }

  /* ---------- a private community draft (proves draft privacy) ---------- */
  const draftId = "series-the-lighthouse-bakery";
  s.series.push({
    id: draftId,
    slug: "the-lighthouse-bakery",
    creator_id: DEMO_USERS.creator,
    title: "The Lighthouse Bakery",
    tagline: "Bread at dawn, beneath a lighthouse that never sleeps.",
    description: "A baker opens a tiny bakery in the base of an old lighthouse. Each episode is one quiet night of baking for the fishing boats that leave at dawn.",
    genre: "Cosy Mystery",
    tags: ["bakery", "lighthouse", "draft"],
    status: "draft",
    is_official: false,
    artwork: { scene: "coast", palette: ["#0e1733", "#3b3a6b", "#ffcf9e", "#fff1d0"], seed: 4242 },
    narrator_voice_id: "voice-hollis",
    soundscape_id: "sound-ocean-waves",
    content_rating: "all-ages",
    ai_disclosure: "Written with AI assistance in Calm Storymaker.",
    trending_score: 0,
    popularity: 0,
    created_at: iso(t0 - 4 * DAY),
    updated_at: iso(t0 - DAY),
    published_at: null,
  });
  s.seasons.push({ id: "season-the-lighthouse-bakery-1", series_id: draftId, number: 1, title: "Season One", synopsis: "A season of night baking.", arc: "The bakery becomes the heart of the harbour.", created_at: iso(t0 - 4 * DAY) });
  s.episodes.push({
    id: "ep-the-lighthouse-bakery-1",
    series_id: draftId,
    season_id: "season-the-lighthouse-bakery-1",
    number: 1,
    title: "The First Loaf",
    summary: "The baker lights the oven for the very first time as the lighthouse beam sweeps the harbour.",
    duration_seconds: 25 * 60,
    status: "draft",
    release_at: null,
    published_at: null,
    audio_asset_id: null,
    is_preview: true,
    created_at: iso(t0 - 4 * DAY),
    updated_at: iso(t0 - DAY),
  });
  s.story_bibles.push({
    id: "bible-the-lighthouse-bakery",
    series_id: draftId,
    world_name: "Gullhaven",
    geography: "A tiny harbour village beneath a whitewashed lighthouse.",
    culture: "Fishing families, early risers.",
    history: "The lighthouse was automated years ago; its base sat empty until now.",
    atmosphere: "Warm ovens, sea air, the sweep of the beam.",
    rules: ["The bakery opens only before dawn."],
    themes: ["New beginnings"],
    established_facts: [],
    unresolved_threads: ["Who left the old recipe tin in the lighthouse?"],
    creator_preferences: ["Lots of sensory baking detail."],
    updated_at: iso(t0 - DAY),
  });
  s.scripts.push({ id: "script-ep-the-lighthouse-bakery-1", episode_id: "ep-the-lighthouse-bakery-1", series_id: draftId, current_version_id: "sv-lighthouse-1", settings: DEFAULT_SCRIPT_SETTINGS, created_at: iso(t0 - 3 * DAY), updated_at: iso(t0 - DAY) });
  const draftScript =
    "The harbour is quiet tonight. Only the lighthouse is awake, its long beam sweeping slowly across the water, again and again, like a hand smoothing a blanket.\n\nAt the foot of the tower, a small round door stands open, and warm light spills out onto the cobbles. Inside, the oven is just beginning to glow.\n\nThe baker ties her apron, takes a breath of the cool salt air, and reaches for the flour.";
  s.script_versions.push({ id: "sv-lighthouse-1", script_id: "script-ep-the-lighthouse-bakery-1", version: 1, content: draftScript, word_count: draftScript.split(/\s+/).length, source: "human", provider: null, model: null, simulated: false, note: "First draft", created_by: DEMO_USERS.creator, created_at: iso(t0 - DAY) });
  s.rights_declarations.push({ id: "rights-lighthouse", series_id: draftId, user_id: DEMO_USERS.creator, original_work: true, ai_assisted: true, third_party_material: "", voice_consent: true, accepted_terms_version: "2026-01", created_at: iso(t0 - 4 * DAY) });

  /* ---------- listener state for the demo listener ---------- */
  const progress: [string, number, number][] = [
    ["ep-the-moonlit-kingdom-3", 140, 600],
    ["ep-a-cabin-in-the-pines-2", 80, 600],
    ["ep-starlight-express-1", 300, 600],
  ];
  progress.forEach(([epId, pos, dur], i) => {
    const ep = s.episodes.find((e) => e.id === epId);
    if (!ep) return;
    s.listening_progress.push({ id: `${DEMO_USERS.listener}:${epId}`, user_id: DEMO_USERS.listener, episode_id: epId, series_id: ep.series_id, position_seconds: pos, duration_seconds: dur, completed: false, updated_at: iso(t0 - (i + 1) * 3600000) });
  });
  ["ep-the-moonlit-kingdom-1", "ep-the-moonlit-kingdom-2"].forEach((epId, i) => {
    s.listening_progress.push({ id: `${DEMO_USERS.listener}:${epId}`, user_id: DEMO_USERS.listener, episode_id: epId, series_id: "series-the-moonlit-kingdom", position_seconds: SAMPLE_SECONDS, duration_seconds: SAMPLE_SECONDS, completed: true, updated_at: iso(t0 - (5 + i) * DAY) });
  });
  for (const slug of ["the-moonlit-kingdom", "a-cabin-in-the-pines", "letters-from-lumen"]) {
    s.user_libraries.push({ id: `lib-ada-${slug}`, user_id: DEMO_USERS.listener, series_id: `series-${slug}`, collection: "Saved", created_at: iso(t0 - 10 * DAY) });
  }
  for (const slug of ["the-moonlit-kingdom", "starlight-express"]) {
    s.series_follows.push({ id: `sf-ada-${slug}`, user_id: DEMO_USERS.listener, series_id: `series-${slug}`, created_at: iso(t0 - 10 * DAY) });
  }
  s.creator_follows.push({ id: "cf-ada-juniper", user_id: DEMO_USERS.listener, creator_id: DEMO_USERS.creator, created_at: iso(t0 - 9 * DAY) });

  // Follower counts for creators (demo listeners).
  for (let i = 0; i < 40; i++) {
    const uid = `user-demo-${i}`;
    s.users.push({ id: uid, username: `listener${i}`, display_name: `Listener ${i}`, email: `listener${i}@example.com`, avatar_hue: (i * 37) % 360, created_at: created });
    const rand = prng(1000 + i);
    for (const c of SEED_CREATORS) {
      if (rand() < (c.is_official ? 0.9 : 0.35)) {
        s.creator_follows.push({ id: `cf-${uid}-${c.username}`, user_id: uid, creator_id: `user-${c.username}`, created_at: iso(t0 - Math.floor(rand() * 90) * DAY) });
      }
    }
    for (const def of SEED_SERIES) {
      if (rand() < def.popularity / 250) {
        s.series_follows.push({ id: `sf-${uid}-${def.slug}`, user_id: uid, series_id: `series-${def.slug}`, created_at: iso(t0 - Math.floor(rand() * 90) * DAY) });
      }
    }
  }

  for (const u of s.users) {
    s.user_settings.push({ id: u.id, autoplay_next: true, autoplay_limit: 3, default_speed: 1, default_sleep_timer_minutes: null, new_episode_updates: true, private_listening_history: false, updated_at: created });
  }

  /* ---------- production engine configuration ---------- */
  for (const a of DEFAULT_AGENT_CONFIGS) s.agent_configurations.push({ ...a, updated_at: created });
  s.ai_settings.push({ ...DEFAULT_AI_SETTINGS, updated_at: created });
  s.production_workflows.push({
    id: "wf-the-moonlit-kingdom",
    series_id: "series-the-moonlit-kingdom",
    episodes_per_week: 3,
    target_duration_minutes: 30,
    writing_provider: "auto",
    writing_model: "claude-opus-5-5",
    narrator_voice_id: "voice-aurelia",
    soundscape_id: "sound-forest-at-night",
    release_days: [1, 3, 5],
    release_hour_utc: 19,
    max_budget_cents: 2500,
    approval_required: true,
    status: "paused",
    created_at: created,
    updated_at: created,
  });

  s.notifications.push({ id: "notif-ada-1", user_id: DEMO_USERS.listener, kind: "new_episode", title: "New episode of The Moonlit Kingdom", body: "“Beneath the Full Moon” is now available.", link: "/series/the-moonlit-kingdom", read: false, created_at: iso(t0 - 2 * 3600000) });

  return s;
}

/** Length of the procedurally generated sample ambience, in seconds. */
export const SAMPLE_SECONDS = 600;

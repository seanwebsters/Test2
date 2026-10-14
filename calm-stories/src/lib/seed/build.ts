import type * as T from "@/lib/types";
import { emptySnapshot, type Snapshot } from "@/lib/db/local";
import { hashString, prng, slugify } from "@/lib/util";
import { SEED_ADMINS, SEED_CREATORS, SEED_LISTENERS, SEED_SERIES, SEED_SOUNDSCAPES, SEED_VOICES } from "./content";
import { SEED_BIBLES } from "./bibles";
import { DEFAULT_AGENTS, DEFAULT_AI_SETTINGS } from "./defaults";

const DAY = 86400000;

export const userId = (username: string) => `usr_${username}`;
export const seriesId = (slug: string) => `ser_${slug}`;

function portraitSpec(name: string, hue: number): T.ArtworkSpec {
  const h = hashString(name);
  return {
    scene: "portrait",
    palette: [`hsl(${hue} 45% 18%)`, `hsl(${(hue + 40) % 360} 40% 30%)`, `hsl(${hue} 70% 78%)`, `hsl(${(hue + 20) % 360} 80% 88%)`],
    seed: h,
  };
}

/**
 * Builds the complete prototype dataset. Deterministic for a given `now`
 * (except for the anchor date) so tests can rely on stable ids.
 */
export function buildSeedSnapshot(now: Date): Snapshot {
  const s = emptySnapshot();
  const iso = (ms: number) => new Date(ms).toISOString();
  const t0 = now.getTime();
  const created = iso(t0 - 200 * DAY);

  /* ---------------- Users, roles, entitlements ---------------- */
  const addUser = (username: string, display_name: string, email: string, hue: number) => {
    s.users.push({ id: userId(username), username, display_name, email, avatar_hue: hue, created_at: created });
    s.user_settings.push({
      id: userId(username),
      autoplay_next: true,
      autoplay_limit: 3,
      default_speed: 1,
      default_sleep_timer_minutes: null,
      new_episode_updates: true,
      private_listening_history: false,
      updated_at: created,
    });
  };
  const addEntitlement = (username: string, plan: T.Plan) =>
    s.subscription_entitlements.push({
      id: `ent_${username}`,
      user_id: userId(username),
      plan,
      status: "active",
      source: "mock",
      expires_at: plan === "premium" ? iso(t0 + 365 * DAY) : null,
      created_at: created,
    });
  const addRole = (username: string, role: T.Role) =>
    s.user_roles.push({ id: `role_${username}_${role}`, user_id: userId(username), role, created_at: created });

  for (const c of SEED_CREATORS) {
    addUser(c.username, c.display_name, c.email, c.hue);
    addRole(c.username, "creator");
    // Creator permissions are separate from subscriptions: Hana and Sol
    // create without holding Calm Premium.
    addEntitlement(c.username, c.key === "hana" || c.key === "sol" ? "free" : "premium");
    s.creator_profiles.push({
      id: `crp_${c.username}`,
      user_id: userId(c.username),
      username: c.username,
      display_name: c.display_name,
      bio: c.bio,
      is_official: c.is_official,
      avatar: portraitSpec(c.display_name, c.hue),
      created_at: created,
    });
  }
  for (const l of SEED_LISTENERS) {
    addUser(l.username, l.display_name, l.email, l.hue);
    addEntitlement(l.username, l.plan);
  }
  for (const a of SEED_ADMINS) {
    addUser(a.username, a.display_name, a.email, a.hue);
    addRole(a.username, "admin");
    addRole(a.username, "editor");
    addEntitlement(a.username, "premium");
  }

  /* ---------------- Voices & soundscapes ---------------- */
  for (const v of SEED_VOICES) {
    s.voice_profiles.push({
      id: `voice_${v.key}`,
      name: v.name,
      description: v.description,
      provider: "elevenlabs",
      provider_voice_id: v.provider_voice_id,
      accent: v.accent,
      tone: v.tone,
      approved: true,
      consent_record: "Placeholder – attach the voice actor's signed consent & licence before production use.",
      created_at: created,
    });
  }
  for (const sc of SEED_SOUNDSCAPES) {
    const id = `snd_${sc.slug}`;
    s.soundscapes.push({
      id,
      slug: sc.slug,
      name: sc.name,
      description: sc.description,
      layers: sc.layers,
      licence: "Synthesised in-house by the Calm Stories audio engine (no third-party recordings).",
      sample_url: `/audio/samples/${sc.slug}.mp3`,
      created_at: created,
    });
    s.audio_assets.push({
      id: `aud_sample_${sc.slug}`,
      owner_id: null,
      series_id: null,
      episode_id: null,
      kind: "sample",
      section_index: null,
      storage_key: `public/audio/samples/${sc.slug}.mp3`,
      url: `/audio/samples/${sc.slug}.mp3`,
      mime_type: "audio/mpeg",
      duration_seconds: 180,
      provider: "calm-synth",
      simulated: true,
      qa: null,
      meta: { note: "Ambience-only sample so playback is testable without generated narration." },
      created_at: created,
    });
  }

  /* ---------------- Series, seasons, episodes ---------------- */
  const creatorByKey = new Map(SEED_CREATORS.map((c) => [c.key, c]));
  for (const def of SEED_SERIES) {
    const creator = creatorByKey.get(def.creator);
    if (!creator) throw new Error(`Unknown creator ${def.creator}`);
    const sid = seriesId(def.slug);
    const rand = prng(hashString(def.slug));
    const launched = t0 - def.launched_days_ago * DAY;
    s.series.push({
      id: sid,
      slug: def.slug,
      creator_id: userId(creator.username),
      title: def.title,
      tagline: def.tagline,
      description: def.description,
      genre: def.genre,
      tags: def.tags,
      status: "published",
      is_official: creator.is_official,
      artwork: { scene: def.scene, palette: def.palette, seed: hashString(def.slug) },
      narrator_voice_id: `voice_${def.voice}`,
      soundscape_id: `snd_${def.soundscape}`,
      content_rating: "all-ages",
      ai_disclosure: creator.is_official ? null : "Written with Calm Storymaker assistance and reviewed by the creator.",
      trending_score: def.trending,
      popularity: def.popularity,
      created_at: iso(launched - 7 * DAY),
      updated_at: iso(launched),
      published_at: iso(launched),
    });

    const allEpisodes = def.seasons.flatMap((season, si) => season.episodes.map((e) => ({ si, e })));
    const total = allEpisodes.length;
    // Spread releases from launch to "now". Flagship series keep one or two
    // approved episodes scheduled in the future to populate the calendar.
    const futureCount = def.slug === "the-moonlit-kingdom" ? 2 : def.trending > 85 ? 1 : 0;
    const pastCount = total - futureCount;
    const gap = pastCount > 1 ? (def.launched_days_ago * DAY) / pastCount : DAY;

    let globalIndex = 0;
    def.seasons.forEach((season, si) => {
      const seasonId = `sea_${def.slug}_${si + 1}`;
      s.seasons.push({
        id: seasonId,
        series_id: sid,
        number: si + 1,
        title: season.title,
        synopsis: season.synopsis,
        arc: season.synopsis,
        created_at: iso(launched),
      });
      season.episodes.forEach(([title, summary], ei) => {
        const eid = `ep_${def.slug}_${si + 1}_${ei + 1}`;
        const isFuture = globalIndex >= pastCount;
        const releaseMs = isFuture
          ? t0 + (globalIndex - pastCount + 1) * 2 * DAY + 2 * 3600000
          : launched + globalIndex * gap;
        const durationMinutes = 22 + Math.floor(rand() * 18);
        s.episodes.push({
          id: eid,
          series_id: sid,
          season_id: seasonId,
          number: ei + 1,
          title,
          summary,
          duration_seconds: durationMinutes * 60,
          status: isFuture ? "approved" : "published",
          release_at: iso(releaseMs),
          published_at: isFuture ? null : iso(releaseMs),
          audio_asset_id: `aud_sample_${def.soundscape}`,
          is_preview: globalIndex === 0,
          created_at: iso(releaseMs - 5 * DAY),
          updated_at: iso(releaseMs),
        });
        if (isFuture) {
          s.publishing_schedules.push({
            id: `pub_${eid}`,
            episode_id: eid,
            series_id: sid,
            release_at: iso(releaseMs),
            status: "scheduled",
            created_by: userId("calm-editor"),
            created_at: iso(t0 - DAY),
            updated_at: iso(t0 - DAY),
          });
        }
        globalIndex++;
      });
    });

    /* Story bible (detailed for demo series, minimal elsewhere) */
    const bible = SEED_BIBLES[def.slug];
    s.story_bibles.push({
      id: `bib_${def.slug}`,
      series_id: sid,
      world_name: bible?.world_name ?? def.title.replace(/^The /, ""),
      geography: bible?.geography ?? "",
      culture: bible?.culture ?? "",
      history: bible?.history ?? "",
      atmosphere: bible?.atmosphere ?? "",
      rules: bible?.rules ?? [],
      themes: bible?.themes ?? [],
      established_facts: bible?.established_facts ?? [],
      unresolved_threads: bible?.unresolved_threads ?? [],
      creator_preferences: bible?.creator_preferences ?? [],
      updated_at: iso(launched),
    });
    if (bible) {
      const charIds = new Map<string, string>();
      bible.characters.forEach((c, i) => {
        const id = `chr_${def.slug}_${slugify(c.name)}`;
        charIds.set(c.name, id);
        s.characters.push({
          id,
          series_id: sid,
          ...c,
          portrait: portraitSpec(c.name, (creator.hue + i * 47) % 360),
          created_at: iso(launched),
          updated_at: iso(launched),
        });
      });
      bible.relationships.forEach((r, i) => {
        const a = charIds.get(r.a);
        const b = charIds.get(r.b);
        if (!a || !b) return;
        s.character_relationships.push({
          id: `rel_${def.slug}_${i}`,
          series_id: sid,
          character_a_id: a,
          character_b_id: b,
          kind: r.kind,
          description: r.description,
          created_at: iso(launched),
        });
      });
      bible.locations.forEach((l) =>
        s.locations.push({ id: `loc_${def.slug}_${slugify(l.name)}`, series_id: sid, ...l, created_at: iso(launched) }),
      );
      // Episode summaries become narrative memory.
      s.episodes
        .filter((e) => e.series_id === sid && e.status === "published")
        .forEach((e) =>
          s.narrative_events.push({
            id: `nev_${e.id}`,
            series_id: sid,
            episode_id: e.id,
            kind: "event",
            summary: e.summary,
            character_ids: [],
            created_at: e.release_at ?? created,
          }),
        );
    }

    s.rights_declarations.push({
      id: `rgt_${def.slug}`,
      series_id: sid,
      user_id: userId(creator.username),
      original_work: true,
      ai_assisted: !creator.is_official,
      third_party_material: "None",
      voice_consent: true,
      accepted_terms_version: "2026-01",
      created_at: iso(launched),
    });
  }

  /* ---------------- A draft in the creator's studio ---------------- */
  const draftSeries: T.Series = {
    id: seriesId("the-orchard-of-small-hours"),
    slug: "the-orchard-of-small-hours",
    creator_id: userId("iris-vale"),
    title: "The Orchard of Small Hours",
    tagline: "An orchard that only fruits between midnight and dawn.",
    description: "A work-in-progress series: a night orchard, a beekeeper, and a moth who carries messages.",
    genre: "Magical Worlds",
    tags: ["orchard", "night", "draft"],
    status: "draft",
    is_official: false,
    artwork: { scene: "garden", palette: ["#0d1630", "#2f3a62", "#ffc1d9", "#fff1c9"], seed: 4242 },
    narrator_voice_id: "voice_suna",
    soundscape_id: "snd_forest-night",
    content_rating: "all-ages",
    ai_disclosure: "Written with Calm Storymaker assistance.",
    trending_score: 0,
    popularity: 0,
    created_at: iso(t0 - 3 * DAY),
    updated_at: iso(t0 - DAY),
    published_at: null,
  };
  s.series.push(draftSeries);
  s.seasons.push({
    id: "sea_the-orchard-of-small-hours_1",
    series_id: draftSeries.id,
    number: 1,
    title: "Season One",
    synopsis: "The beekeeper discovers the night orchard.",
    arc: "",
    created_at: draftSeries.created_at,
  });
  s.story_bibles.push({
    id: "bib_the-orchard-of-small-hours",
    series_id: draftSeries.id,
    world_name: "Hollowmere Orchard",
    geography: "A hillside orchard of silver-barked apple trees above a sleeping village.",
    culture: "",
    history: "",
    atmosphere: "Moths, blossom, cool grass, beehives humming softly in the dark.",
    rules: ["The trees only fruit between midnight and dawn."],
    themes: ["Rest", "Small miracles"],
    established_facts: [],
    unresolved_threads: [],
    creator_preferences: ["Very slow pacing", "No dialogue in the first episode"],
    updated_at: draftSeries.updated_at,
  });
  s.episodes.push({
    id: "ep_the-orchard-of-small-hours_1_1",
    series_id: draftSeries.id,
    season_id: "sea_the-orchard-of-small-hours_1",
    number: 1,
    title: "The Beekeeper's Lantern",
    summary: "Odile walks up to the orchard at midnight to check on her bees.",
    duration_seconds: 25 * 60,
    status: "planned",
    release_at: null,
    published_at: null,
    audio_asset_id: null,
    is_preview: true,
    created_at: draftSeries.created_at,
    updated_at: draftSeries.updated_at,
  });

  /* ---------------- Listener state for demo accounts ---------------- */
  const maya = userId("maya");
  const published = s.episodes.filter((e) => e.status === "published");
  const firstEp = (slug: string, n = 1) => published.find((e) => e.series_id === seriesId(slug) && e.number === n);
  const progressFor = (ep: T.Episode | undefined, fraction: number, completed = false) => {
    if (!ep) return;
    s.listening_progress.push({
      id: `${maya}:${ep.id}`,
      user_id: maya,
      episode_id: ep.id,
      series_id: ep.series_id,
      position_seconds: completed ? 180 : Math.round(180 * fraction),
      duration_seconds: 180,
      completed,
      updated_at: iso(completed ? t0 - 5 * DAY : t0 - Math.round((1 - fraction) * 3 * DAY)),
    });
  };
  progressFor(firstEp("the-moonlit-kingdom", 1), 1, true);
  progressFor(firstEp("the-moonlit-kingdom", 2), 1, true);
  progressFor(firstEp("the-moonlit-kingdom", 3), 0.45);
  progressFor(firstEp("starlight-express", 1), 0.7);
  progressFor(firstEp("a-cabin-in-the-pines", 1), 0.2);
  for (const slug of ["the-moonlit-kingdom", "starlight-express", "the-floating-library"]) {
    s.user_libraries.push({ id: `lib_maya_${slug}`, user_id: maya, series_id: seriesId(slug), collection: "Saved", created_at: iso(t0 - 5 * DAY) });
  }
  s.user_libraries.push({ id: "lib_maya_rainy", user_id: maya, series_id: seriesId("the-teahouse-at-the-end-of-the-rain"), collection: "Rainy nights", created_at: iso(t0 - 2 * DAY) });
  for (const slug of ["the-moonlit-kingdom", "letters-from-lumen"]) {
    s.series_follows.push({ id: `sf_maya_${slug}`, user_id: maya, series_id: seriesId(slug), created_at: iso(t0 - 6 * DAY) });
  }
  s.creator_follows.push({ id: "cf_maya_iris", user_id: maya, creator_id: userId("iris-vale"), created_at: iso(t0 - 4 * DAY) });

  /* ---------------- Sample analytics (clearly flagged is_sample) ---------------- */
  const listeners = ["sample-a", "sample-b", "sample-c", "sample-d", "sample-e", "sample-f", "sample-g", "sample-h"];
  for (const series of s.series.filter((x) => x.status === "published")) {
    const rand = prng(hashString(`events:${series.slug}`));
    const eps = published.filter((e) => e.series_id === series.id);
    const n = Math.round(series.popularity / 6);
    for (let i = 0; i < n; i++) {
      const ep = eps[Math.floor(rand() * eps.length)];
      if (!ep) continue;
      const listened = Math.round(ep.duration_seconds * (0.4 + rand() * 0.6));
      const at = t0 - Math.floor(rand() * 28) * DAY - Math.floor(rand() * DAY);
      const anon = listeners[Math.floor(rand() * listeners.length)] ?? "sample-a";
      s.listening_events.push({
        id: `lev_${series.slug}_${i}`,
        user_id: null,
        anonymous_id: anon,
        episode_id: ep.id,
        series_id: series.id,
        kind: listened > ep.duration_seconds * 0.9 ? "complete" : "progress",
        position_seconds: listened,
        listened_seconds: listened,
        is_sample: true,
        created_at: iso(at),
      });
    }
    // Sample follower counts.
    const followers = Math.round(series.popularity / 12);
    for (let i = 0; i < followers; i++) {
      s.series_follows.push({
        id: `sf_sample_${series.slug}_${i}`,
        user_id: `usr_sample_${i}`,
        series_id: series.id,
        created_at: iso(t0 - Math.floor(rand() * 40) * DAY),
      });
    }
  }

  /* ---------------- Production engine configuration ---------------- */
  s.agent_configurations.push(...DEFAULT_AGENTS.map((a) => ({ ...a, updated_at: created })));
  s.ai_settings.push({ ...DEFAULT_AI_SETTINGS, updated_at: created });
  s.production_workflows.push({
    id: "wf_the-moonlit-kingdom",
    series_id: seriesId("the-moonlit-kingdom"),
    episodes_per_week: 3,
    target_duration_minutes: 30,
    writing_provider: "auto",
    writing_model: "claude-opus-5-5",
    narrator_voice_id: "voice_willow",
    soundscape_id: "snd_soft-wind",
    release_days: [1, 3, 5],
    release_hour_utc: 20,
    max_budget_cents: 2500,
    approval_required: true,
    status: "paused",
    created_at: created,
    updated_at: created,
  });

  s.notifications.push({
    id: "ntf_maya_welcome",
    user_id: maya,
    kind: "system",
    title: "Welcome to Calm Stories",
    body: "Your Calm Premium membership includes every series and episode.",
    link: "/",
    read: false,
    created_at: iso(t0 - DAY),
  });

  return s;
}

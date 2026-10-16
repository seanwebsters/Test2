import type * as T from "@/lib/types";
import { emptySnapshot, type Snapshot } from "@/lib/db/local";
import { hashString, prng } from "@/lib/util";
import { SEED_ADMINS, SEED_CREATORS, SEED_LISTENERS, SEED_SERIES, SEED_SOUNDSCAPES } from "./content";

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
    addEntitlement(c.username, "premium");
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

  /* ---------------- Soundscapes (ambience samples) ---------------- */
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
      storage_key: `public/audio/samples/${sc.slug}.mp3`,
      url: `/audio/samples/${sc.slug}.mp3`,
      mime_type: "audio/mpeg",
      duration_seconds: 180,
      provider: "calm-synth",
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
      soundscape_id: `snd_${def.soundscape}`,
      content_rating: "all-ages",
      ai_disclosure: null,
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
          artwork_url: null,
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

  }

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

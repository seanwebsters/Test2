# Architecture

```
src/
  app/                    Next.js App Router pages and API routes
    (listener)            /, /discover, /series/[slug], /listen/[id], /library, /profile, /settings
    admin/                Calm Stories Admin (overview, agents, series production, upload, review, calendar, moderation, settings)
    api/                  JSON routes – all wrapped by lib/api.route() for consistent errors
  components/             Reusable UI (player, catalog cards, admin widgets)
  lib/
    types.ts              Domain model (snake_case = Postgres columns)
    db/                   Database interface + LocalDatabase (JSON) + SupabaseDatabase
    auth/                 policy.ts (pure rules), providers.ts (identity & entitlements), session.ts
    agents/               production pipeline (8 agents), job runner, scheduler, offline stand-ins
    ai/                   Claude adapter (official SDK) behind a small provider interface
    providers/            ElevenLabs (speech + sound effects), Nano Banana (Gemini images)
    services/             catalog, library, recommendations, editorial, review checks, releases
    analytics/            event tracking (local + PostHog)
    audio/                WAV/DSP, ambience synth, mixer, audio QA, FFmpeg
    storage/              local / R2 / Supabase Storage + range-request serving
    seed/                 prototype catalogue (data only – UI never imports it)
supabase/                 migration (schema, indexes, RLS) and generated seed.sql
tests/                    Vitest suites
```

## Principles

* **Database-driven.** Pages read only from the data layer. The seed is loaded into the database, never imported by components.
* **Adapters at every boundary.** Database, identity, entitlements, storage, analytics and every AI provider sit behind an interface with a working local implementation.
* **Honest simulation.** When a provider key is missing, its agent's output is flagged `simulated` all the way to the run log and the review queue.
* **Policy in one place.** `lib/auth/policy.ts` holds pure functions (visibility, streaming) used by pages and API routes. Postgres RLS mirrors the same rules.

## Entitlements and roles

Subscription (`plan`) and staff role (`editor`, `admin`) are independent:

| | Browse | Full listening | Library / follows | Admin |
| --- | --- | --- | --- | --- |
| Visitor / Free | ✓ | preview episodes | – | – |
| Premium | ✓ | ✓ | ✓ | – |
| Editor / admin | ✓ (incl. unreleased) | ✓ | with Premium | ✓ |

An episode is public only when its series is published **and** it is `published`, or `approved` with `release_at <= now`. Audio is served only through `/api/episodes/[id]/audio`, which checks entitlement on every request; staff preview uploads through `/api/admin/audio/[assetId]`.

## Agent production

`lib/agents/pipeline.ts` defines one job per episode, run by `lib/agents/runner.ts`:

| # | Step | Agent | Provider | Output |
| --- | --- | --- | --- | --- |
| 1 | Plan the next episode | Showrunner | Claude, structured output | title, summary, beats, ambience prompt, art prompt; creates the draft episode |
| 2 | Write the script | Writer | Claude (streamed) | ~120 words per target minute, `---` section breaks, `[pause]` marks → `episode_scripts` |
| 3 | Sleep-suitability edit | Sleep Editor | rules + Claude | length / unsettling words / exclamations; softened by Claude or flagged for the editor |
| 4 | Narrate | Narrator | ElevenLabs TTS (`pcm_22050`) | one stored WAV per section, with previous/next text for continuity |
| 5 | Design the ambience | Sound Designer | ElevenLabs sound effects (looping) | 30 s seamless bed (falls back to the series soundscape synth) |
| 6 | Mix, master and QA | Mixer | in-house mixer + FFmpeg | ducked mix, fades, −24 LUFS MP3, QA report → `audio_assets` (kind `produced`) |
| 7 | Create artwork | Art Director | Nano Banana (Gemini `generateContent`, IMAGE modality) | 16:9 episode art and, if missing, a 3:4 series cover → `artwork_assets`, served by `/api/art/[id]` |
| 8 | Send to editorial review | Publisher | — | episode `in_review` + `editorial_reviews` (source `agents`) with script, audio QA and artwork checks; editors notified |

Context for the writing agents is the series description, the series' showrunner notes and the last eight episode titles and summaries, so each episode continues the story.

The runner persists step state, logs and scratch state after every step. Paid outputs (each narrated section, the ambience, each image) are stored and recorded in the job state, so a retry or restart never pays for them twice. It also provides retries with backoff, a per-episode **budget** checked before every paid call, **idempotency keys** (`prod:{series}:{slot}` for scheduled runs), a concurrency limit (and one job per series), pause / resume / cancel / retry, and recovery of jobs orphaned by a restart.

`lib/agents/scheduler.ts` turns each active `production_workflows` row (episodes per week, release days, UTC hour) into release slots at least 12 hours ahead and enqueues a job per slot with the slot as its requested release time.

## Publishing flow

```
Agents (or an upload) → status in_review + editorial_review (automatic checks)
  → approve (release time) → status approved + publishing_schedule
  → releaseDueEpisodes() at release time → status published, followers notified
```

* `services/editorial.ts` — `addUploadedEpisode` validates the file type and magic bytes (≤ 200 MB), stores it, creates the season if needed and numbers the episode; `decideReview`, `reschedule` and `resolveReport` back the admin pages.
* `services/review-checks.ts` — audio present and at least 2 minutes, title/summary present and no duplicate episode number, release time sensible, series state.
* `services/releases.ts` — publishes due approved episodes, marks schedules released, publishes the series on its first release and sends follower updates (respecting each listener's setting).

The heartbeat (`src/instrumentation-node.ts`, every 60 s), Vercel Cron (`/api/cron/tick`) and the admin's *Run scheduler now* button each schedule production, start queued jobs and release due episodes.

## Player

One `<audio>` element lives in the root layout (`PlayerProvider`), so playback continues across client-side navigation. Progress is saved to the server for signed-in listeners (and locally for visitors). The sleep timer fades out over 30 s and can stop at the end of an episode; autoplay stops after a configurable number of episodes.

## Wellbeing

There are no streaks or engagement nudges. Follower updates are opt-out, and the app makes no clinical claims.

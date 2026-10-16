# Architecture

```
src/
  app/                    Next.js App Router pages and API routes
    (listener)            /, /discover, /series/[slug], /listen/[id], /library, /profile, /settings
    admin/                Calm Stories Admin (overview, add episode, review, calendar, moderation)
    api/                  JSON routes – all wrapped by lib/api.route() for consistent errors
  components/             Reusable UI (player, catalog cards, admin widgets)
  lib/
    types.ts              Domain model (snake_case = Postgres columns)
    db/                   Database interface + LocalDatabase (JSON) + SupabaseDatabase
    auth/                 policy.ts (pure rules), providers.ts (identity & entitlements), session.ts
    services/             catalog, library, recommendations, editorial, review checks, releases
    analytics/            event tracking (local + PostHog)
    audio/                WAV helpers, ambience synth and FFmpeg (used to generate the sample audio)
    storage/              local / R2 / Supabase Storage + range-request serving
    seed/                 prototype catalogue (data only – UI never imports it)
supabase/                 migration (schema, indexes, RLS) and generated seed.sql
tests/                    Vitest suites
```

## Principles

* **Database-driven.** Pages read only from the data layer. The seed is loaded into the database, never imported by components.
* **Adapters at every boundary.** Database, identity, entitlements, storage and analytics each sit behind an interface with a working local implementation.
* **Policy in one place.** `lib/auth/policy.ts` holds pure functions (visibility, streaming) used by pages and API routes. Postgres RLS mirrors the same rules.

## Entitlements and roles

Subscription (`plan`) and staff role (`editor`, `admin`) are independent:

| | Browse | Full listening | Library / follows | Admin |
| --- | --- | --- | --- | --- |
| Visitor / Free | ✓ | preview episodes | – | – |
| Premium | ✓ | ✓ | ✓ | – |
| Editor / admin | ✓ (incl. unreleased) | ✓ | with Premium | ✓ |

An episode is public only when its series is published **and** it is `published`, or `approved` with `release_at <= now`. Audio is served only through `/api/episodes/[id]/audio`, which checks entitlement on every request; staff preview uploads through `/api/admin/audio/[assetId]`.

## Publishing flow

```
Add episode (upload) → status in_review + editorial_review (automatic checks)
  → approve (release time) → status approved + publishing_schedule
  → releaseDueEpisodes() at release time → status published, followers notified
```

* `services/editorial.ts` — `addUploadedEpisode` validates the file type and magic bytes (≤ 200 MB), stores it, creates the season if needed and numbers the episode; `decideReview`, `reschedule` and `resolveReport` back the admin pages.
* `services/review-checks.ts` — audio present and at least 2 minutes, title/summary present and no duplicate episode number, release time sensible, series state.
* `services/releases.ts` — publishes due approved episodes, marks schedules released, publishes the series on its first release and sends follower updates (respecting each listener's setting).

Releases run from the in-process heartbeat (`src/instrumentation-node.ts`, every 60 s), from Vercel Cron (`/api/cron/tick`) and from the *Run release check* button in the admin.

## Player

One `<audio>` element lives in the root layout (`PlayerProvider`), so playback continues across client-side navigation. Progress is saved to the server for signed-in listeners (and locally for visitors). The sleep timer fades out over 30 s and can stop at the end of an episode; autoplay stops after a configurable number of episodes.

## Wellbeing

There are no streaks or engagement nudges. Follower updates are opt-out, and the app makes no clinical claims.

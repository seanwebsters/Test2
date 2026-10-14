# Calm Stories

A subscription audio platform for serialized Sleep Stories: a streaming destination (**Calm Stories**), an AI creative partner for creators (**Calm Storymaker**) and an internal autonomous production system (**Calm Production Studio**) on one shared database, audio pipeline and publishing system.

All listening is included in Calm Premium. There are no coins or per-episode purchases.

## Run it

```bash
cd calm-stories
npm install
cp .env.example .env.local   # optional – everything works without keys
npm run dev                  # http://localhost:3000
```

The first request seeds a local database (`.data/db.json`) with 22 series, ~110 episodes, creators, demo listeners and production configuration. Sample audio is synthesised on first play and cached under `.data/blobs` (MP3 when `ffmpeg` is on `PATH`, WAV otherwise).

Sign in with the **account menu → Prototype sign-in**:

| Persona | Access |
| --- | --- |
| Visitor (signed out) | Browse everything, play each series' free preview episode |
| Free listener | Same as visitor, plus library and follows |
| Premium listener | Full catalogue, library, recommendations |
| Creator | Premium + Storymaker and Creator Studio |
| Calm administrator | Editorial review, agents, production engine |

```bash
npm test            # vitest: policies, journeys, Storymaker, audio, production, studio
npm run typecheck
npm run db:reset    # wipe the local database (re-seeds on next request)
npm run db:seed-sql # write supabase/seed.sql for a Postgres database
```

## What's real, what's simulated

| Area | Status |
| --- | --- |
| Catalogue, series pages, search, library, follows, settings | Real, database-driven |
| Persistent audio player (seek, speed, volume, sleep-timer fade, autoplay with limit, progress persistence, media keys) | Real |
| Entitlements (visitor / free / premium / creator / admin) | Real enforcement; **subscription source is mock** |
| Episode audio in the seeded catalogue | **Sample ambience**, procedurally synthesised (labelled in the player) |
| Trending / popular ranking | **Sample ranking** (labelled), replaced by analytics in production |
| Supabase PostgreSQL schema + RLS | Real (`supabase/migrations`), validated against Postgres 16 |
| Storymaker agent, tools, World Bible, characters, seasons, scripts, rewrites, continuity and sleep checks | Real; writing uses Anthropic or OpenAI when a key is set, otherwise a **simulated writer** (labelled) |
| Narration | ElevenLabs stock voices when a key is set, otherwise a **simulated narrator** (labelled placeholder audio). No voice cloning |
| Mixing, mastering, loudness and QA | Real, pure TypeScript (MP3 via ffmpeg when available) |
| Cover art | Procedurally illustrated in-app |
| Production engine (13-step jobs, workflows, retries, budgets, pause/resume/cancel) | Real; inline worker or Trigger.dev |
| Editorial review, publishing calendar, scheduled release, moderation | Real. Nothing is published without an editor's approval |
| AI cost tracking and audit trail | Real records; costs are **estimates** from token and character counts |
| Creator Studio analytics | Real calculations over listening events; the seeded history is **sample data** (labelled) |
| Notifications | Real, in-app (new episodes, review decisions, production) |

See `docs/INTEGRATIONS.md` for connecting Supabase, Anthropic/OpenAI, ElevenLabs, R2, PostHog and Trigger.dev.

## Scheduler and background jobs

`vercel.json` runs `GET /api/cron/tick` every 15 minutes (set `CRON_SECRET`). It fills production workflow release slots, releases approved episodes that are due and starts queued jobs. In development the admin overview and calendar run the release step when opened, and jobs run inline. Set `JOB_DRIVER=trigger` to hand jobs to Trigger.dev; see `docs/INTEGRATIONS.md`. Rights, voices and AI disclosure are covered in `docs/RIGHTS.md`.

## Layout

```
src/app            routes (App Router) and API route handlers
src/components     UI (player, cards, shelves, artwork, storymaker, admin, studio)
src/lib/db         Database interface, local JSON store, Supabase adapter
src/lib/auth       identity + entitlement providers, policy rules
src/lib/services   catalogue, listener, recommendations
src/lib/ai         provider-independent AI layer (Anthropic, OpenAI, simulated), prompts, schemas
src/lib/storymaker Storymaker agent, tool registry and story services
src/lib/audio      WAV codec, ambience synthesiser, narration, mixer, QA, ffmpeg helpers
src/lib/jobs       production pipeline, job engine and workflows
src/lib/publishing.ts, admin.ts, studio.ts, notifications.ts
src/lib/storage    blob storage (local, R2, Supabase Storage)
supabase/          migrations (schema + RLS)
tests/             vitest suites
```

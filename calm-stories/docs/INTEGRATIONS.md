# Connecting external services

All credentials are **server-side environment variables** (see `.env.example`). None are exposed to the browser or stored in the database. The admin page *AI Settings* shows which providers are connected without revealing any keys.

## Supabase (database, auth, storage)

1. Create a project and run `supabase/migrations/20261014000000_calm_stories_schema.sql`, using `supabase db push` or the SQL editor. The migration was validated against Postgres via PGlite.
2. Generate and load the prototype catalogue: `npm run db:seed-sql`, then run `supabase/seed.sql`.
3. Set `DATA_BACKEND=supabase`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_ANON_KEY`.
4. Auth: set `AUTH_PROVIDER=supabase`. The adapter reads the `sb-access-token` cookie and maps the auth user to `public.users` by email. Populate `users.auth_id` so the RLS helpers (`app_user_id()`, `is_editor()`, …) apply to direct client access.
5. Storage: `STORAGE_BACKEND=supabase` and `SUPABASE_STORAGE_BUCKET` (the migration creates a private `calm-stories` bucket).

The server uses the service-role key, and `lib/auth/policy.ts` is the primary gate. RLS policies mirror those rules for anon and authenticated clients: drafts, scripts, Story Bibles and production data are visible only to their owners and editors.

## Anthropic (writing, assistant)

Set `ANTHROPIC_API_KEY`. The adapter (`lib/ai/anthropic.ts`) uses the official `@anthropic-ai/sdk` and calls:

* `claude-opus-5-5` by default; change it per task in *AI Settings* or per agent or workflow;
* streaming with `finalMessage()`, so long scripts don't time out;
* adaptive thinking (the model default) with `output_config.effort`;
* structured outputs (`output_config.format` with JSON schemas generated from zod) for concepts, worlds, outlines and continuity;
* tool calling for the Storymaker assistant, with tool inputs re-validated by zod;
* the server-side refusal fallback beta (`fallbacks: "default"`). Refusals surface as a gentle message.

## OpenAI (writing, images)

Set `OPENAI_API_KEY`. It is used for writing when Anthropic isn't configured (or when selected), and for cover art via `gpt-image-1` (`lib/media/images.ts`). Generated images are stored under `art/…` in object storage.

## ElevenLabs (narration)

Set `ELEVENLABS_API_KEY`, then replace each `voice_profiles.provider_voice_id` placeholder with a licensed voice ID and record its consent or licence in `consent_record`. Only `approved` voices can be selected, and there is no voice cloning. Audio is requested as `pcm_22050` and mixed by the in-house pipeline.

## FFmpeg

Install FFmpeg or set `FFMPEG_PATH`. It enables `loudnorm` mastering and compressed MP3 storage for sections and mixes. Without it, the TypeScript pipeline produces WAV. Note that Vercel serverless functions don't include FFmpeg, so run audio jobs on Trigger.dev or another worker that has it.

## Cloudflare R2 (production audio)

Set `STORAGE_BACKEND=r2`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` and `R2_BUCKET`. Objects are signed with SigV4 (`aws4fetch`). Episode audio is always proxied through entitlement-checked routes, with HTTP Range support for seeking. Never make the bucket public.

## Background jobs (Trigger.dev)

1. `npm i @trigger.dev/sdk` and initialise Trigger.dev in this project.
2. Deploy `trigger/run-job.ts` (task id `calm-run-job`).
3. Set `JOB_DRIVER=trigger` and `TRIGGER_SECRET_KEY`. Enqueued jobs are dispatched to Trigger.dev with the job id as the idempotency key.
4. Schedule `/api/cron/tick`, or a Trigger.dev cron, for releases and automated production.

## PostHog (analytics)

Set `POSTHOG_KEY` (and `POSTHOG_HOST`). Product events (`episode_play`, `episode_complete`, `sleep_timer_set`, `series_saved`, `series_followed`, `creator_followed`, `storymaker_tool_executed`, `episode_approved`, `subscription_upsell_viewed`) are captured server-side. Listening events are always stored in `listening_events` for creator dashboards.

## Calm identity & subscriptions

* **Identity:** implement `AuthProvider.resolveUserId()` in `lib/auth/providers.ts` against Calm's session or JWT, and set `AUTH_PROVIDER`.
* **Entitlements:** set `CALM_ENTITLEMENTS_URL` and `CALM_ENTITLEMENTS_API_KEY`. The adapter calls `GET {url}/users/{id}/entitlements → { premium: boolean }`. Calm Stories never sells anything itself.

## LangGraph

The production workflow is an explicit step graph executed by `lib/jobs/runner.ts`, with persisted state, retries and budgets. If you need dynamic branching or agent-to-agent loops, port each `StepDef` to a LangGraph node and keep `JobContext` as the graph state. The job table, cost tracking and controls stay the same.

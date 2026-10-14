# Integrations

Every integration is optional. Without its keys, each one falls back to a local adapter that works offline and is clearly labelled as simulated in the UI. All keys are server-side environment variables. None is sent to the browser, and the admin AI settings page only shows whether each one is configured.

| Integration | Environment variables | Without it |
| --- | --- | --- |
| Supabase (Postgres, Auth, Storage) | `DATA_BACKEND=supabase`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `AUTH_PROVIDER=supabase` | Local JSON database in `DATA_DIR` and a demo persona switcher |
| Anthropic (writing, preferred) | `ANTHROPIC_API_KEY` | Falls back to OpenAI, then to the deterministic simulated writer |
| OpenAI (writing fallback) | `OPENAI_API_KEY` | Simulated writer |
| ElevenLabs (narration) | `ELEVENLABS_API_KEY` | Simulated narrator: a quiet murmur timed to the script, labelled as placeholder audio |
| Cloudflare R2 (audio storage) | `STORAGE_BACKEND=r2`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL` | Files under `DATA_DIR/blobs` |
| ffmpeg (MP3 encoding) | `FFMPEG_PATH` (defaults to `ffmpeg` on `PATH`) | Mixes are stored as WAV |
| PostHog (analytics) | `POSTHOG_KEY`, `POSTHOG_HOST` | Listening events are stored in the database only |
| Trigger.dev (background jobs) | `JOB_DRIVER=trigger`, `TRIGGER_SECRET_KEY`, `CRON_SECRET` | Jobs run inline on the web server |
| Vercel Cron (scheduler) | `CRON_SECRET` | Scheduler runs when an admin opens the dashboard or calendar |

Cover art is illustrated procedurally in the app. Image generation is not connected in this build.

## AI writing

The provider is chosen in **Admin → AI settings**. `Auto` uses Anthropic if its key is set, then OpenAI, then the simulated writer. Models can be overridden per task (concept, script, rewrite, continuity and so on). Prompt templates can be edited there too; clearing a template restores the default.

Every generation is recorded:

- `production_costs` holds provider, model, token or character counts, an estimated cost and whether it was simulated.
- `ai_tool_calls` holds the task and prompt key for each generation, every Storymaker tool call (including ones waiting for confirmation) and every admin change (`admin:*`).

Costs are estimates computed from token and character counts with list-price tiers in `src/lib/ai/index.ts`. Check provider invoices for exact figures. Generation stops with a clear error when the monthly AI budget is reached, and a production job stops when its per-job budget is spent.

## Narration (ElevenLabs)

Only approved stock voices from the provider's library are used (`voice_profiles`, each with `provider_voice_id` and a consent record). Voice cloning is not supported and there is no upload path for voice samples. Narration is requested as `pcm_22050`, generated in sections of about 170 words, retried on transient errors, and cached by a hash of text, voice and settings so unchanged sections are never paid for twice. Generating real narration from Storymaker asks the creator to confirm, with a cost estimate, first.

The mixer and QA are pure TypeScript and run the same whether or not narration is real: voice levelling, a looped ambience bed, ducking under speech, a soft limiter at −1 dBFS, fades, and ten QA checks.

## Background jobs

Production jobs (13 steps, from choosing the episode to submitting it for editorial review) run through `src/lib/jobs/engine.ts`.

- **Inline (default).** Jobs run in the web server process. Fine for development and short episodes.
- **Trigger.dev.** With `JOB_DRIVER=trigger`, enqueuing a job calls `POST {TRIGGER_API_URL}/api/v1/tasks/calm-production-job/trigger` with `{ payload: { jobId } }`, using the job id as the idempotency key. Create a Trigger.dev task with id `calm-production-job` that POSTs `{ jobId }` to `https://<your-app>/api/jobs/run` with the header `Authorization: Bearer <CRON_SECRET>`. That route runs the job to completion (`maxDuration` 800 s). If Trigger.dev is unreachable, the job runs inline instead.

Jobs are resumable: finished steps are skipped on retry. Steps retry with exponential backoff up to the agent's retry limit, and errors that need a person (budget, missing audio, failed QA) stop the job immediately. Jobs left running by a crashed worker are recovered on the next tick.

## Scheduler

`vercel.json` calls `GET /api/cron/tick` every 15 minutes with `Authorization: Bearer <CRON_SECRET>`. Each tick:

1. Fills release slots for the next 7 days for active production workflows (one job per slot, idempotent).
2. Releases approved episodes whose release time has passed, and notifies followers and the creator.
3. Starts queued jobs up to the concurrency limit.

Nothing is released unless an editor has approved it and it has mixed audio.

## Supabase

1. Apply `supabase/migrations/0001_schema.sql` and `0002_rls.sql`.
2. Optionally run `npm run db:seed-sql` and load `supabase/seed.sql` for the demo catalogue.
3. Set `DATA_BACKEND=supabase` and the Supabase keys. Services check authorisation before every read and write; row-level security is an extra layer of protection.

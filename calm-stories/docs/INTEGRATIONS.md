# Connecting external services

All credentials are **server-side environment variables** (see `.env.example`). None are exposed to the browser or stored in the database.

## Claude (Showrunner, Writer, Sleep Editor)

Set `ANTHROPIC_API_KEY`. `lib/ai/anthropic.ts` uses the official `@anthropic-ai/sdk`:

* model `claude-opus-5-5` by default (change it in *Admin → Settings*);
* streaming with `finalMessage()`, so long scripts never time out;
* adaptive thinking (the model default) with an explicit effort level per step;
* structured outputs (`output_config.format` with a JSON schema generated from zod) for episode plans and sleep edits;
* server-side refusal fallbacks (`fallbacks: "default"`); a refusal fails the step with a readable message.

## ElevenLabs (Narrator, Sound Designer)

Set `ELEVENLABS_API_KEY`, and put your licensed voice ID in *Admin → Settings* (default voice) or per series in its production settings.

* Narration: `POST /v1/text-to-speech/{voice_id}?output_format=pcm_22050` with `model_id` (default `eleven_multilingual_v2`), slow and stable voice settings, and `previous_text` / `next_text` so sections join naturally.
* Ambience: `POST /v1/sound-generation?output_format=pcm_22050` with `model_id` `eleven_text_to_sound_v2`, `loop: true` and 30 s duration; the mixer loops it under the voice.

Costs shown in the admin are estimates from list prices; check your ElevenLabs usage page for billing.

## Nano Banana – Gemini image generation (Art Director)

Set `GEMINI_API_KEY` (or `GOOGLE_API_KEY`). `lib/providers/nano-banana.ts` calls `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` with `generationConfig.responseModalities: ["IMAGE"]` and `imageConfig.aspectRatio` (16:9 for episodes, 3:4 for covers), and reads the base64 image from `inlineData`. The model id defaults to `gemini-2.5-flash-image`; switch to a newer Nano Banana model in *Admin → Settings* when Google releases one. Images are stored under `art/…` and served by `/api/art/[id]`, which only serves artwork for content the viewer can see.

## Supabase (database, auth, storage)

1. Create a project and run `supabase/migrations/20261014000000_calm_stories_schema.sql`, using `supabase db push` or the SQL editor. The migration was validated against Postgres via PGlite.
2. Generate and load the prototype catalogue: `npm run db:seed-sql`, then run `supabase/seed.sql`.
3. Set `DATA_BACKEND=supabase`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_ANON_KEY`.
4. Auth: set `AUTH_PROVIDER=supabase`. The adapter reads the `sb-access-token` cookie and maps the auth user to `public.users` by email. Populate `users.auth_id` so the RLS helpers (`app_user_id()`, `is_editor()`, …) apply to direct client access.
5. Storage: `STORAGE_BACKEND=supabase` and `SUPABASE_STORAGE_BUCKET` (the migration creates a private `calm-stories` bucket).

The server uses the service-role key, and `lib/auth/policy.ts` is the primary gate. RLS policies mirror those rules for anon and authenticated clients: unreleased episodes, uploads, reviews and schedules are visible only to editors.

## Cloudflare R2 (episode audio)

Set `STORAGE_BACKEND=r2`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` and `R2_BUCKET`. Objects are signed with SigV4 (`aws4fetch`). Episode audio is always proxied through entitlement-checked routes, with HTTP Range support for seeking. Never make the bucket public.

## PostHog (analytics)

Set `POSTHOG_KEY` (and `POSTHOG_HOST`). Product events (`episode_play`, `episode_complete`, `sleep_timer_set`, `series_saved`, `series_followed`, `creator_followed`, `episode_approved`, `episode_produced`, `episode_released`, `subscription_upsell_viewed`) are captured server-side. Listening events are always stored in `listening_events` for the admin dashboard.

## Calm identity & subscriptions

* **Identity:** implement `AuthProvider.resolveUserId()` in `lib/auth/providers.ts` against Calm's session or JWT, and set `AUTH_PROVIDER`.
* **Entitlements:** set `CALM_ENTITLEMENTS_URL` and `CALM_ENTITLEMENTS_API_KEY`. The adapter calls `GET {url}/users/{id}/entitlements → { premium: boolean }`. Calm Stories never sells anything itself.

## FFmpeg

Install FFmpeg or set `FFMPEG_PATH`. The Mixer uses it for `loudnorm` mastering and MP3 output; without it, episodes are stored as WAV (larger files). Vercel serverless functions don't include FFmpeg, so run production on a server or worker that has it (see DEPLOYMENT).

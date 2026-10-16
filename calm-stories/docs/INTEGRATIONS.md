# Connecting external services

All credentials are **server-side environment variables** (see `.env.example`). None are exposed to the browser or stored in the database. *Studio → Settings* shows what is connected without revealing keys.

If a key is missing or rejected, the agents that need it stop with a clear message ("Connect an ElevenLabs API key…"). The workflow is marked **blocked**, and you press **Resume** after fixing it. Nothing is simulated.

## Claude – writing, editorial, critique and image review

Set `ANTHROPIC_API_KEY`. `lib/studio/llm.ts` uses the official `@anthropic-ai/sdk`:

* **Model:** `claude-opus-5-5` by default. Change it globally or per agent in Settings.
* **Requests:** streamed with `finalMessage()`, with adaptive thinking (the model default) and a per-agent `output_config.effort`.
* **Structured outputs:** `output_config.format` with JSON Schemas generated from the zod handoff schemas, re-validated on receipt.
* **Prompt caching:** the series bible is a cached system block.
* **Web search:** the `web_search_20260209` server tool, used by the Program Director when web research is on in Settings. Paused turns are resumed.
* **Vision:** image review sends base64 JPEGs.
* **Refusals and errors:**
  * server-side refusal fallbacks are on (`fallbacks: "default"`), and a refusal fails the step with a readable message;
  * 401/403 block the step on `ANTHROPIC_API_KEY`;
  * 429 waits for `retry-after`;
  * 5xx and connection errors are retried.
* **Usage tracking:** every call records input, output and cache tokens, web searches and estimated cost.

## Nano Banana (Google Gemini) – artwork

Set `GEMINI_API_KEY` (or `GOOGLE_API_KEY`). `lib/providers/nano-banana.ts` calls:

```
POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
x-goog-api-key: …
{ contents: [{ parts: [ {text:"Reference – …"}, {inlineData:{mimeType,data}}, …, {text: prompt} ] }],
  generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio, imageSize? } } }
```

The model defaults to `gemini-2.5-flash-image`. Switch to a newer Nano Banana model (for example Nano Banana Pro or Nano Banana 2) in Settings. Set *Image size* (1K/2K/4K) only for models that support `imageSize`. Character portraits are sent as reference images for consistency. Prompts always forbid in-image text; titles are typeset separately. Error handling: 401/403 block the step, 429 waits for `retry-after`, 5xx retries.

### Or: Nano Banana through fal.ai

Set `FAL_KEY` instead of `GEMINI_API_KEY`; it is used when no Gemini key is set. Images go to `POST https://fal.run/fal-ai/nano-banana`. Calls with reference images (character consistency) go to `…/edit`, with the references sent as data URIs in `image_urls`. Change the endpoint (for example `fal-ai/nano-banana-pro`) in *Settings → fal.ai Nano Banana endpoint*.

## ElevenLabs – voices, narration, pronunciation, sound effects, music

Set `ELEVENLABS_API_KEY`. `lib/providers/elevenlabs.ts` uses:

| Use | Endpoint |
| --- | --- |
| Voice library for casting | `GET /v1/voices` (only voices in your account – add licensed/library voices there first) |
| Narration and auditions | `POST /v1/text-to-speech/{voice_id}?output_format=mp3_44100_128` with `model_id`, `voice_settings`, `previous_text`, `next_text`, `previous_request_ids`, `pronunciation_dictionary_locators` |
| Pronunciation dictionary | `POST /v1/pronunciation-dictionaries/add-from-rules` (alias rules) |
| Ambience | `POST /v1/sound-generation` with `loop: true`, 30 s, `model_id` `eleven_text_to_sound_v2` |
| Music cues | `POST /v1/music` with `prompt`, `music_length_ms`, `force_instrumental` |

Models are set in Settings (`eleven_multilingual_v2`, `eleven_text_to_sound_v2`, `music_v1` by default). Music generation and some voices need a plan that includes them. A 403 blocks the step with ElevenLabs' message. Costs shown in the studio are estimates from list prices; check ElevenLabs for billing.

## FFmpeg – mixing and mastering

Install FFmpeg on the machine that runs workflows, or set `FFMPEG_PATH`. It is used for:

* segment joins;
* scene mixes (looping beds, fades, side-chain ducking);
* crossfaded masters with `loudnorm` and `alimiter`;
* loudness measurement.

Without it, audio steps block with `needs = FFMPEG`.

## Supabase (database, auth, storage)

1. Run `supabase/migrations/20261014000000_calm_stories_schema.sql` (validated against Postgres via PGlite, including a full studio dataset).
2. `npm run db:seed-sql`, then run `supabase/seed.sql`.
3. Set `DATA_BACKEND=supabase`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_ANON_KEY`.
4. Auth: set `AUTH_PROVIDER=supabase`, and populate `users.auth_id` so the RLS helpers apply to direct client access.
5. Storage: `STORAGE_BACKEND=supabase`, or R2 below.

The server uses the service-role key and enforces policy in code. RLS mirrors it: all studio tables are staff-only, and selected artwork of published series is public.

## Cloudflare R2 (audio and artwork)

Set `STORAGE_BACKEND=r2`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` and `R2_BUCKET`. Audio is always streamed through entitlement-checked routes with Range support; artwork through `/api/art/[id]`. Keep the bucket private.

## PostHog, Calm identity and entitlements

* PostHog: `POSTHOG_KEY` (+ `POSTHOG_HOST`) for product events. Listening events are always stored for the studio's Analytics and the Program Director.
* Identity: implement `AuthProvider.resolveUserId()` in `lib/auth/providers.ts`.
* Entitlements: `CALM_ENTITLEMENTS_URL` + `CALM_ENTITLEMENTS_API_KEY`.

## Durable orchestration

The built-in engine is durable: state lives in the database, and steps are idempotent, resumable functions. To run it on Trigger.dev (or Inngest, or a queue worker), schedule a task every 30–60 s that calls `tick({ wait: true })` from `@/lib/studio`. Long steps (scene narration, mastering) then run on that worker rather than in a web request.

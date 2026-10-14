# Calm Stories

A working prototype of **Calm Stories** – a streaming home for serialized Sleep Stories, an AI creative partner for creators (**Calm Storymaker**) and an autonomous production system for Calm's editorial team (**Calm Production Studio**). All three run on one platform: one database, one audio pipeline, one publishing system.

Listening is included with Calm Premium. There are no coins, micro-transactions or per-episode purchases.

## Quick start

```bash
cd calm-stories
npm install
npm run dev            # http://localhost:3000
```

No accounts, keys or services are required: the app seeds a local database (`.data/db.json`) with 22 series and 120+ episodes on first run, and every AI/audio feature falls back to a clearly labelled simulator.

```bash
npm test               # 24 automated tests covering the critical journeys
npm run typecheck
npm run build
npm run db:reset       # wipe local data and re-seed on next start
```

FFmpeg on the PATH (or `FFMPEG_PATH`) enables loudness-normalised MP3 output. Without it, audio is stored as WAV.

## Demo accounts

Open **Sign in** and choose a persona (the identity provider is a replaceable demo adapter):

| Persona | Access | Use it for |
| --- | --- | --- |
| Maya Chen | Premium listener | Journey A: browse, play, save, resume |
| Sam Free | Free account | Previews and the Premium prompt |
| Iris Vale | Creator + Premium | Journeys B, C and E (Storymaker → submit) |
| Hana Okafor | Creator, no Premium | Shows that creator rights ≠ subscription |
| Calm Editorial | Administrator | Journeys D and E (production engine, review, calendar) |

## The five journeys

* **A – Listener:** Home → series page → play → save → leave and come back to "Continue Episode N". Playback continues during client-side navigation. Progress is saved to the server (and locally for visitors), and the sleep timer fades the audio out over 30 s.
* **B – Creator:** `/create` → describe an idea → editable concept card → *Create this series* → "Build the world" → "Develop the characters" → "Plan a 6-episode season" → "Write episode 1" → edit the script in the editor (select text → Rewrite / Expand / More relaxing …) → *Produce Audio* → the draft is saved.
* **C – Continuation:** open an existing series (e.g. *The Lantern Keeper's Daughter* as Iris) → review the World Bible → "Continue this story" → accept the proposal → write it → check continuity.
* **D – Internal production:** as Calm Editorial, go to `/admin` → *The Moonlit Kingdom* → *Configure* → *Start production now*. Watch the 13 steps in `/admin/agents`, review the episode in `/admin/review`, then approve it with a release time.
* **E – Publishing:** a creator declares rights and submits from *Publishing* → an editor approves in `/admin/review` → the episode goes public at its scheduled time (`/admin/calendar` supports drag-and-drop rescheduling).

## What is real and what is simulated

| Area | Without credentials (default) | With credentials |
| --- | --- | --- |
| Writing (concepts, worlds, characters, outlines, scripts, rewrites, continuity) | Deterministic template **simulator**. Every output is labelled "Simulated" in the UI and flagged `simulated: true` in the data. | Anthropic Claude (official SDK, `claude-opus-5-5` by default) or OpenAI, with structured outputs and real tool calling. |
| Narration | **Simulated placeholder voice**: a soft hum that follows the rhythm of the text, so pacing, mixing and QA are meaningful. Clearly labelled as a placeholder. A "Device voice" button previews real speech using the browser's speech engine. | ElevenLabs TTS, using only approved voices with recorded consent. |
| Ambience & music | Real: synthesised in-house (rain, ocean, fire, thunder, wind, forest, stream, village, space, pad), so no licences are needed. | Same, or a generative provider plugged in behind the same interface. |
| Mixing, mastering, QA | Real: TypeScript mixer (ducking, fades, normalisation, limiter) plus automated QA. FFmpeg adds `loudnorm` and MP3 output. | Same. |
| Cover art | Real procedural key art (13 cinematic scene types, one palette per series), plus image uploads. | OpenAI Images, stored to object storage. |
| Seeded catalogue audio | Every seeded episode plays a 3-minute **ambience sample** of its soundscape, labelled "Sample audio". | Replace with produced mixes. |
| Analytics in dashboards | Computed from real listening events, combined with seeded rows marked `is_sample`. Labelled "Sample". | PostHog receives product events as well. |
| Subscriptions | Mock entitlements per user. There is no billing. | Calm entitlement API adapter (`CALM_ENTITLEMENTS_URL`). |
| Auth | Signed demo-session cookie with a persona switcher. | Supabase Auth adapter, or Calm identity. |
| Database / storage | Local JSON store and filesystem. | Supabase Postgres (schema + RLS in `supabase/`), Cloudflare R2 or Supabase Storage. |
| Background jobs | In-process runner with a 60 s heartbeat. | Trigger.dev driver; Vercel Cron for `/api/cron/tick`. |

Nothing ever claims a real AI generation, voice or publication that didn't happen. Agents can't publish: every episode passes editorial approval and is released only at its scheduled time.

## Documentation

* [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): system design, data model, tool system, job engine and audio pipeline.
* [`docs/INTEGRATIONS.md`](docs/INTEGRATIONS.md): connecting Supabase, Anthropic, OpenAI, ElevenLabs, R2, PostHog, Trigger.dev, Calm identity and entitlements.
* [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md): Vercel, environments, cron and production checklist.

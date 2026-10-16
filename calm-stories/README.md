# Calm Stories

A working prototype of **Calm Stories**: a Pocket FM-style streaming home for serialized Sleep Stories. Listeners browse series, play episodes, save them to their library and pick up where they left off. Behind it, a crew of **production agents** makes the episodes: Claude plans and writes each one, **ElevenLabs** narrates it and creates the ambience, **Nano Banana** (Gemini) paints the artwork, and the finished episode lands in an editorial review queue. Calm staff approve and schedule releases.

Listening is included with Calm Premium. There are no coins, micro-transactions or per-episode purchases.

## Quick start

```bash
cd calm-stories
npm install
npm run dev            # http://localhost:3000
```

No accounts, keys or services are required: the app seeds a local database (`.data/db.json`) with 22 series and 119 episodes on first run. Without API keys each agent uses a clearly labelled offline stand-in, so the whole pipeline runs end to end. Add keys to `.env.local` to use the real providers:

```bash
ANTHROPIC_API_KEY=…    # Showrunner, Writer, Sleep Editor (Claude)
ELEVENLABS_API_KEY=…   # Narrator (text-to-speech) + Sound Designer (sound effects)
GEMINI_API_KEY=…       # Art Director (Nano Banana image generation)
```

```bash
npm test               # automated tests (access rules, agent pipeline, upload → review → release)
npm run typecheck
npm run build
npm run db:reset       # wipe local data and re-seed on next start
```

## Demo accounts

Open **Sign in** and choose a persona (the identity provider is a replaceable demo adapter):

| Persona | Access | Use it for |
| --- | --- | --- |
| Maya Chen | Premium listener | Browse, play, save, follow, resume |
| Sam Free | Free account | Previews and the Premium prompt |
| Calm Editorial | Administrator | The admin area: agents, review, calendar, moderation |

## What's in it

**Listening app**

* Home with Continue Listening, trending, new episodes, genres and recommendations.
* Series pages with seasons, episode lists, follow and save.
* A persistent player that keeps playing during navigation, with speed, sleep timer (gentle 30 s fade), and a limited autoplay.
* My Library: saved series, collections, followed creators, listening history and new-episode updates.
* Free preview episodes; everything else needs Calm Premium (mock entitlement).

**Production agents**

| Agent | Provider | Job |
| --- | --- | --- |
| Showrunner | Claude | Reads the story so far and the series direction, plans the next episode |
| Writer | Claude | Writes the full Sleep Story script |
| Sleep Editor | Rules + Claude | Checks length, unsettling words and pacing; softens anything jarring |
| Narrator | ElevenLabs text-to-speech | Voices the script section by section (per-series voice) |
| Sound Designer | ElevenLabs sound effects | Creates a seamless looping ambience bed |
| Mixer | In-house + FFmpeg | Ducks ambience under the voice, fades, masters to −24 LUFS, runs audio QA |
| Art Director | Nano Banana (Gemini) | Paints the episode artwork, and a series cover if there isn't one |
| Publisher | Calm Stories | Files the episode in the review queue with automated checks |

Each series can have a schedule (episodes per week, release days and hour, length, voice, art style, showrunner notes, budget). When it's on, the agents make each episode about a day before its release slot. Editors can also press *Produce next episode* at any time.

**Admin (`/admin`, Calm staff only)**

* **Overview:** catalogue stats, each series' agent schedule, and links to its production settings.
* **Agents:** provider status, the crew, and every production run with live steps, logs, costs and pause / resume / cancel / retry.
* **Series production:** the schedule and creative direction for one series.
* **Add episode:** upload finished audio instead (MP3, WAV, M4A or AAC).
* **Settings:** model ids (Claude, ElevenLabs, Nano Banana), default voice, budgets and concurrency.
* **Review queue:** listen to the episode, read the script, see the artwork and automatic checks, then approve with a release time, request changes or reject.
* **Calendar:** scheduled releases, with drag-and-drop rescheduling.
* **Moderation:** listener reports, with dismiss or take-down.

Agents never publish: an episode becomes public only after an editor approves it **and** its release time has passed. A 60 s in-process heartbeat (and Vercel Cron on `/api/cron/tick`) schedules production, runs queued jobs and releases due episodes; followers get a new-episode update.

## What is real and what is sample data

| Area | Default | In production |
| --- | --- | --- |
| Writing | Template stand-in, labelled "simulated" in the run log and review queue. | Claude (`claude-opus-5-5` by default), structured outputs for plans. |
| Narration & ambience | Placeholder hum that follows the rhythm of the text, plus the series' in-house synthesised soundscape. Labelled "placeholder voice". | ElevenLabs text-to-speech and sound effects. |
| Artwork | Procedural key art (one palette and scene per series). | Nano Banana episode art and series covers. |
| Seeded catalogue audio | Every seeded episode plays a 3-minute **ambience sample** of its soundscape, labelled "Sample audio". | Agent-produced or uploaded episodes. |
| Produced / uploaded audio | Real: stored in `.data/` and streamed with HTTP Range support. | Cloudflare R2 or Supabase Storage. |
| Admin listening stats | Computed from real listening events, combined with seeded rows marked `is_sample` and labelled "Sample". | PostHog receives product events as well. |
| Subscriptions | Mock entitlements per user. There is no billing. | Calm entitlement API adapter (`CALM_ENTITLEMENTS_URL`). |
| Auth | Signed demo-session cookie with a persona switcher. | Supabase Auth adapter, or Calm identity. |
| Database / storage | Local JSON store and filesystem. | Supabase Postgres (schema + RLS in `supabase/`), R2 or Supabase Storage. |

## Documentation

* [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): system design, the agent pipeline and job runner, access rules and the publishing flow.
* [`docs/INTEGRATIONS.md`](docs/INTEGRATIONS.md): connecting Claude, ElevenLabs, Nano Banana, Supabase, R2, PostHog, Calm identity and entitlements.
* [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md): Vercel, environments, cron and production checklist.

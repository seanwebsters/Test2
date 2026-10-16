# Calm Stories

A working prototype of **Calm Stories**: a Pocket FM-style streaming home for serialized Sleep Stories. Listeners browse series, play episodes, save them to their library and pick up where they left off. A small admin area lets the Calm editorial team add episodes, review them and schedule their release.

Listening is included with Calm Premium. There are no coins, micro-transactions or per-episode purchases.

## Quick start

```bash
cd calm-stories
npm install
npm run dev            # http://localhost:3000
```

No accounts, keys or services are required: the app seeds a local database (`.data/db.json`) with 22 series and 119 episodes on first run.

```bash
npm test               # automated tests (access rules, upload → review → release)
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
| Calm Editorial | Administrator | The admin area: add episodes, review, calendar, moderation |

## What's in it

**Listening app**

* Home with Continue Listening, trending, new episodes, genres and recommendations.
* Series pages with seasons, episode lists, follow and save.
* A persistent player that keeps playing during navigation, with speed, sleep timer (gentle 30 s fade), and a limited autoplay.
* My Library: saved series, collections, followed creators, listening history and new-episode updates.
* Free preview episodes; everything else needs Calm Premium (mock entitlement).

**Admin (`/admin`, Calm staff only)**

* **Overview:** catalogue stats, every series with an *Add episode* shortcut, and a manual release check.
* **Add episode:** upload finished audio (MP3, WAV, M4A or AAC), set title, description, season and the requested release time.
* **Review queue:** listen to the upload, see automatic checks (audio, metadata, release, series), then approve with a release time, request changes or reject.
* **Calendar:** scheduled releases, with drag-and-drop rescheduling.
* **Moderation:** listener reports, with dismiss or take-down.

Nothing is published automatically: an episode becomes public only after it's approved **and** its release time has passed. Releases run on a 60 s in-process heartbeat and on Vercel Cron (`/api/cron/tick`), and followers get a new-episode update.

## What is real and what is sample data

| Area | Default | In production |
| --- | --- | --- |
| Seeded catalogue audio | Every seeded episode plays a 3-minute **ambience sample** of its soundscape, labelled "Sample audio". | Uploaded episode audio. |
| Uploaded audio | Real: stored in `.data/` and streamed with HTTP Range support. | Cloudflare R2 or Supabase Storage. |
| Cover art | Procedural key art (one palette and scene per series). | Same, or artwork files. |
| Admin listening stats | Computed from real listening events, combined with seeded rows marked `is_sample` and labelled "Sample". | PostHog receives product events as well. |
| Subscriptions | Mock entitlements per user. There is no billing. | Calm entitlement API adapter (`CALM_ENTITLEMENTS_URL`). |
| Auth | Signed demo-session cookie with a persona switcher. | Supabase Auth adapter, or Calm identity. |
| Database / storage | Local JSON store and filesystem. | Supabase Postgres (schema + RLS in `supabase/`), R2 or Supabase Storage. |

## Documentation

* [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): system design, data model, access rules and the publishing flow.
* [`docs/INTEGRATIONS.md`](docs/INTEGRATIONS.md): connecting Supabase, R2, PostHog, Calm identity and entitlements.
* [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md): Vercel, environments, cron and production checklist.

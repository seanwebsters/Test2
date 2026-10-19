# Deployment

## Railway (recommended: saves everything, runs continuously)

The repo root has a `Dockerfile` and `railway.json`, so Railway builds it with no extra settings.

1. In Railway, choose **New Project → Deploy from GitHub repo** and pick this repository.
2. Right-click the service (or use **+ Create**), choose **Volume**, and attach it to the service. Any mount path works, for example `/data`. The app stores its database and all audio and artwork there (via `RAILWAY_VOLUME_MOUNT_PATH`), so redeploys and restarts keep everything.
3. Under the service's **Variables**, add your keys (`ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`, `FAL_KEY` or `GEMINI_API_KEY`) and a long random `SESSION_SECRET`.
4. Under **Settings → Networking**, click **Generate Domain** to get a public URL.

The built-in heartbeat advances workflows every 30 seconds and starts the next step as soon as one finishes, so no cron job is needed. Use one replica, because the local store is a single file on the volume.

## Vercel

1. Import the repository and set the **Root Directory** to `calm-stories`.
2. Create separate **Preview** and **Production** environments, each with its own variables from `.env.example`:
   * a unique, long `SESSION_SECRET` (required in production);
   * `APP_ENV=production` for production;
   * `DATA_BACKEND=supabase` and Supabase keys, because the local JSON store isn't suitable for serverless;
   * `STORAGE_BACKEND=r2` (or `supabase`);
   * `ANTHROPIC_API_KEY`, `GEMINI_API_KEY` and `ELEVENLABS_API_KEY` for the studio;
   * `CRON_SECRET`. `vercel.json` schedules `GET /api/cron/tick` every 5 minutes; it commissions scheduled episodes, advances studio workflows and releases due episodes. Each call keeps working stage after stage (starting each step the moment its inputs finish) for `CRON_WORK_SECONDS` (default 240; keep it below your plan's function time limit). Vercel sends `Authorization: Bearer $CRON_SECRET`.
3. Use separate Supabase projects (or branches) for development and production.

## Where the studio runs

Studio workflows are long: a series takes roughly 10–20 minutes, and an episode 15–40 minutes, mostly waiting on the providers. FFmpeg is bundled. Recommended setups:

* **Single server / VM / container (simplest):**
  * Run `npm run build && npm start`.
  * The in-process heartbeat (every 30 s) advances workflows continuously.
  * Point `DATA_BACKEND` at Supabase and storage at R2.
* **Vercel for the web plus a worker:**
  * Host the app on Vercel.
  * Run a small worker (Fly.io, Render, Railway, a VM, or Trigger.dev) from the same repo and env. It calls `runUntil(Date.now() + 60_000)` from `@/lib/studio` on a loop, or hits `/api/cron/tick`.
  * Set `DISABLE_HEARTBEAT=1` on Vercel so only the worker runs agents.

Steps are idempotent and their state lives in the database, so several workers can be added later. Concurrency is bounded by *Settings → Workflows at once / Parallel steps*.

## Production checklist

- [ ] `AUTH_PROVIDER` set to the real identity provider. Demo sign-in is disabled automatically when it isn't `demo`.
- [ ] Calm entitlement adapter configured, with mock entitlements removed from the database.
- [ ] RLS enabled (by the migration). Review the policies against your access patterns.
- [ ] Licensed voices added to your ElevenLabs library before casting (the Audio Director only casts from your account's voices).
- [ ] Budgets, revision limits and publishing roles set in *Studio → Settings*.
- [ ] House writing guidelines and benchmarks reviewed in *Studio → Settings*.
- [ ] Raise the platform request-body limit if you upload large episode files (or switch the upload form to direct-to-storage uploads).
- [ ] Rate limiting moved to a shared store (Redis or Upstash) if running multiple instances. The built-in limiter is per instance.
- [ ] Replace the prototype content and rights policy (`/policies`) with Calm's legal text.
- [ ] Remove seeded sample analytics (`listening_events.is_sample = true`, `series_follows.user_id LIKE 'usr_sample_%'`).

## Local single-server mode

`SESSION_SECRET=… npm run build && npm start` works on a single VM with the local store and the in-process heartbeat (`src/instrumentation-node.ts`, every 30 s) for studio workflows and releases. Data lives in `DATA_DIR` (default `.data`).

## Sharing the studio safely

The studio is always locked:

* **AI Team page** (`/studio/team`): the team's view-only window. Open to anyone with the link, unless `STUDIO_TEAM_PASSWORD` is set, in which case that code is needed. Nothing on it can be changed.
* **Everything else** (all other studio and admin pages and APIs): Sean access only, behind the owner passcode. The passcode is built in and stored only as a slow salted hash. Set `STUDIO_OWNER_PASSWORD` in Railway to replace it.
* The 3D office is edited at `/studio/office-editor` (Settings → Edit the 3D office), which is owner only.

Cookies are signed with `SESSION_SECRET`, or else a random key kept on the data volume. `STUDIO_LOCK=off` turns the lock off, for local development only.

People enter the password at `/studio-login`. Changing a password signs out everyone who used the old one. The cron endpoint then needs `CRON_SECRET`. The public site and `/api/approved-stories` stay open.

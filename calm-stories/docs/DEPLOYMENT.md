# Deployment

## Vercel

1. Import the repository and set the **Root Directory** to `calm-stories`.
2. Create separate **Preview** and **Production** environments, each with its own variables from `.env.example`:
   * a unique, long `SESSION_SECRET` (required in production);
   * `APP_ENV=production` for production;
   * `DATA_BACKEND=supabase` and Supabase keys, because the local JSON store isn't suitable for serverless;
   * `STORAGE_BACKEND=r2` (or `supabase`);
   * `ANTHROPIC_API_KEY`, `GEMINI_API_KEY` and `ELEVENLABS_API_KEY` for the studio;
   * `CRON_SECRET`. `vercel.json` schedules `GET /api/cron/tick` every 5 minutes; it commissions scheduled episodes, advances studio workflows and releases due episodes. Vercel sends `Authorization: Bearer $CRON_SECRET`.
3. Use separate Supabase projects (or branches) for development and production.

## Where the studio runs

Studio workflows are long: a series takes roughly 10–20 minutes, and an episode 15–40 minutes, mostly waiting on the providers. They also need FFmpeg. Recommended setups:

* **Single server / VM / container (simplest):**
  * Run `npm run build && npm start` with FFmpeg installed.
  * The in-process heartbeat (every 30 s) advances workflows continuously.
  * Point `DATA_BACKEND` at Supabase and storage at R2.
* **Vercel for the web plus a worker:**
  * Host the app on Vercel.
  * Run a small worker (Fly.io, Render, Railway, a VM, or Trigger.dev) from the same repo and env. It calls `tick({ wait: true })` from `@/lib/studio` on a loop, or hits `/api/cron/tick`.
  * Set `DISABLE_HEARTBEAT=1` on Vercel so only the worker runs agents.

Steps are idempotent and their state lives in the database, so several workers can be added later. Concurrency is bounded by *Settings → Workflows at once / Parallel steps*.

## Production checklist

- [ ] `AUTH_PROVIDER` set to the real identity provider. Demo sign-in is disabled automatically when it isn't `demo`.
- [ ] Calm entitlement adapter configured, with mock entitlements removed from the database.
- [ ] RLS enabled (by the migration). Review the policies against your access patterns.
- [ ] Licensed voices added to your ElevenLabs library before casting (the Audio Director only casts from your account's voices).
- [ ] Budgets, revision limits and publishing roles set in *Studio → Settings*.
- [ ] House writing guidelines and benchmarks reviewed in *Studio → Settings*.
- [ ] FFmpeg installed on whatever runs workflows.
- [ ] Raise the platform request-body limit if you upload large episode files (or switch the upload form to direct-to-storage uploads).
- [ ] Rate limiting moved to a shared store (Redis or Upstash) if running multiple instances. The built-in limiter is per instance.
- [ ] Replace the prototype content and rights policy (`/policies`) with Calm's legal text.
- [ ] Remove seeded sample analytics (`listening_events.is_sample = true`, `series_follows.user_id LIKE 'usr_sample_%'`).

## Local single-server mode

`SESSION_SECRET=… npm run build && npm start` works on a single VM with the local store and the in-process heartbeat (`src/instrumentation-node.ts`, every 30 s) for studio workflows and releases. Data lives in `DATA_DIR` (default `.data`).

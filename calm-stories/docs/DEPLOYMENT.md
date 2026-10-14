# Deployment

## Vercel

1. Import the repository and set the **Root Directory** to `calm-stories`.
2. Create separate **Preview** and **Production** environments, each with its own variables from `.env.example`:
   * a unique, long `SESSION_SECRET` (required in production);
   * `APP_ENV=production` for production;
   * `DATA_BACKEND=supabase` and Supabase keys, because the local JSON store isn't suitable for serverless;
   * `STORAGE_BACKEND=r2` (or `supabase`);
   * `JOB_DRIVER=trigger` and `TRIGGER_SECRET_KEY`;
   * `CRON_SECRET`. `vercel.json` schedules `GET /api/cron/tick` every 5 minutes, and Vercel sends `Authorization: Bearer $CRON_SECRET`.
3. Use separate Supabase projects (or branches) for development and production.

## Production checklist

- [ ] `AUTH_PROVIDER` set to the real identity provider. Demo sign-in is disabled automatically when it isn't `demo`.
- [ ] Calm entitlement adapter configured, with mock entitlements removed from the database.
- [ ] Licensed ElevenLabs voice IDs and consent records added to every approved voice.
- [ ] FFmpeg available to the job worker.
- [ ] RLS enabled (by the migration). Review the policies against your access patterns.
- [ ] Monthly and per-job cost limits set in *AI Settings*.
- [ ] Rate limiting moved to a shared store (Redis or Upstash) if running multiple instances. The built-in limiter is per instance.
- [ ] Replace the prototype content and rights policy (`/policies`) with Calm's legal text.
- [ ] Remove seeded sample analytics (`listening_events.is_sample = true`, `series_follows.user_id LIKE 'usr_sample_%'`).

## Local single-server mode

`SESSION_SECRET=… npm run build && npm start` works on a single VM with the local store, inline jobs and the in-process heartbeat (`src/instrumentation-node.ts`, every 60 s). Data lives in `DATA_DIR` (default `.data`).

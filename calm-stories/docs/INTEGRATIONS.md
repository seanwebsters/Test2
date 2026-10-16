# Connecting external services

All credentials are **server-side environment variables** (see `.env.example`). None are exposed to the browser or stored in the database.

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

Set `POSTHOG_KEY` (and `POSTHOG_HOST`). Product events (`episode_play`, `episode_complete`, `sleep_timer_set`, `series_saved`, `series_followed`, `creator_followed`, `episode_approved`, `episode_released`, `subscription_upsell_viewed`) are captured server-side. Listening events are always stored in `listening_events` for the admin dashboard.

## Calm identity & subscriptions

* **Identity:** implement `AuthProvider.resolveUserId()` in `lib/auth/providers.ts` against Calm's session or JWT, and set `AUTH_PROVIDER`.
* **Entitlements:** set `CALM_ENTITLEMENTS_URL` and `CALM_ENTITLEMENTS_API_KEY`. The adapter calls `GET {url}/users/{id}/entitlements → { premium: boolean }`. Calm Stories never sells anything itself.

## FFmpeg (optional)

Only `npm run audio:samples` uses FFmpeg, to regenerate the seeded ambience samples in `public/audio/samples/`. The app itself doesn't need it.

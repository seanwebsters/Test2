# DIRECTION

**Find your path. Build your future.**

DIRECTION is a mobile-first career discovery and development app. It works like Duolingo, but for careers. In about five minutes, a playful onboarding (a swipe game, this-or-that picks and a values points game) finds your top three directions and explains why. Each career then becomes a 10-level path of real missions. Daily missions, streaks, badges and an AI coach called **Pip** give you a reason to come back tomorrow.

## Quick start

```bash
cd direction
npm install
npm run dev            # http://localhost:3000
```

No configuration is needed. Out of the box the app uses:

| Concern | Default (no env vars) | Production option |
| --- | --- | --- |
| Accounts | Local email + password (scrypt hashes, signed HTTP-only cookie) | Supabase Auth |
| Data | JSON file in `.data/` (atomic writes) | Supabase Postgres with row-level security |
| AI coach | Offline coach: rule-based and labelled "Offline mode" | Claude via `ANTHROPIC_API_KEY` (server-side only) |
| Billing | Mock checkout, clearly labelled, no payment taken | Stripe Checkout + webhooks |
| Opportunities | Verified directories + clearly marked samples | Adds live Adzuna listings |

Click **Try the demo** to land in Maya's account. She has 10 days of history, a 6-day streak, level 3 of the Creative Director path, badges, saved opportunities and Passport entries. Each click creates a fresh, private demo user.

Copy `.env.example` to `.env.local` to turn on real services.

## What's inside

| Area | Route | Highlights |
| --- | --- | --- |
| Landing | `/` | "Not sure what you want to do?", floating career cards, demo entry |
| Onboarding | `/onboarding` | 12 steps (~5 min): swipe deck, this-or-that, interests, subjects, solo/team slider, dream lifestyle, 10-point values game, skills, careers considered, location and time. Results show the top 3 with reasons taken from your answers. You can commit to a path, start the 30-Day Discovery Challenge, or just save. Progress is kept in localStorage until you sign up. |
| Home | `/home` | Pip greeting by mood, streak/rank/week tiles, today's 3–5 missions, challenge card, path card, badges, Plus upsell |
| Discover | `/discover`, `/discover/[slug]` | 120 careers in 16 categories: search, filters, sort by match. Career pages cover day in the life, skills with your readiness, indicative pay, ways in, qualifications, progression, challenges, an AI "real picture", the 10-level pathway, try-it-today missions and related careers. |
| My Path | `/path` | A winding 10-level map. Levels unlock only when you finish the level's **quest** (with evidence) plus 3 other missions. You can **skip ahead** by passing a placement quest. Paths can be paused and switched with no progress lost. |
| Missions | `/missions`, `/missions/[id]` | Today / Up next / Completed. Each mission has an objective, time, steps checklist, "Ask Pip", evidence, reflection and a "how did it feel?" rating. |
| Coach | `/coach` | Streaming chat with modes: chat, interview practice (Plus), CV review, outreach, development plan, portfolio feedback (Plus), change direction. It knows your profile and progress. |
| Opportunities | `/opportunities` | Recommendations with "why it's relevant", type/online filters, a save/applied/interviewing/secured tracker with notes |
| Passport | `/profile` | Streak heatmap and freezes, skill tree, collectible badges, milestones, projects (from evidence), experience/education/certifications, timeline, public sharing, portfolio generator (`/profile/portfolio`, print to PDF) |
| Public passport | `/p/[handle]` | Opt-in; only the sections you allow |
| Plus | `/plus` | Plan comparison, mock or Stripe checkout |
| Challenge | `/challenge` | 30-day grid: your top directions rotate, plus a wildcard every 5th day, and you can catch up on missed days. Ends with a verdict. |
| Recap | `/recap` | Weekly missions, XP, active days, highlights, skills grown and next steps |
| Settings | `/profile/settings` | Profile, daily time, theme (light/dark/system), privacy toggles, plan, data export, delete account |

### Content

- **120 career profiles** (`src/lib/content/careers-data.ts`) across all 16 categories, with indicative UK pay bands, routes, qualifications, progression, related careers and trait vectors for matching.
- **3 hand-written paths:** Creative Director, Entrepreneur and Software Engineer. Each has 10 levels × 5 missions, and each level ends in an evidence-based quest.
- **Starter paths** for the other 117 careers, generated from the same 10-level arc using each career's own skills and progression. So **every career is playable**.
- 44 transferable skills, 21 achievements, 16 onboarding scenarios, 28 verified opportunity sources and 16 labelled samples.

### Product rules worth knowing

- **XP** rewards effort and evidence, with diminishing returns for long missions: quests ×1.5, +10 for evidence, +5 for a reflection, +5 for a daily mission. Ranks follow `50·n·(n−1)` XP.
- **Levels unlock on demonstrated progress**, never on XP alone.
- **Streaks are kind.** You earn a freeze every 7 days (max 2), and freezes cover missed days automatically. Your longest streak is never lost.
- **Daily missions** are generated once per day, so the plan stays stable. They follow your active paths, your time budget (3/3/4/5 missions for 5/15/30/60 min, with at most one "stretch" mission), your weakest skills and recently used activity types. They also include the challenge mission and one curiosity mission from a related career.
- **Skills transfer.** Points from any path count towards every career that uses that skill, and each career page shows your "readiness".
- **Ratings adapt recommendations.** "Loved it" / "not for me" re-ranks your matches.
- **No public leaderboards.** Achievements are personal.
- **Match percentages** are labelled everywhere as exploratory compatibility indicators, not aptitude scores.

### Safeguards

- AI keys stay on the server. The coach's system prompt forbids guaranteeing outcomes or inventing openings, salaries, statistics or qualification requirements, and it signposts urgent help for anyone in distress.
- AI career insights use structured outputs. The prompt bans figures and qualifications, and `scrubUnverified()` then strips any sentence with currency, percentages or grades. Failures fall back to editorial content.
- Opportunities never fabricate vacancies:
  - **Verified source** entries link to real organisations so you can search their live listings.
  - **Sample** entries are fictional, carry no link and are labelled "not a real listing".
  - **Live listing** entries come only from a configured API.
- Salaries are labelled "indicative UK", with a London note. Outside the UK the page says there's no verified data yet.

## Architecture

```
src/
  app/                    Next.js App Router pages + API routes
    (app)/                Signed-in shell (bottom nav on mobile, sidebar on desktop)
    api/                  JSON routes: auth, onboarding, paths, missions, today, challenge,
                          careers, coach (streaming), opportunities, bookmarks, passport,
                          profile, account, billing (checkout/cancel/webhook)
  components/             brand (Pip, Logo), app shell, celebration overlay, mission,
                          path map, career art, coach, passport, settings
  lib/
    content/              Careers, skills, categories, paths (full + starter generator),
                          onboarding content, achievements, opportunities — versioned in code
    engine/               Pure domain logic: matching, progression, xp, streak, daily plan,
                          challenge, achievements, skills, entitlements, derive (overview,
                          weekly recap), timeline
    server/               env, session, auth, context (store selection), services,
                          store/ (local JSON + Supabase), ai/ (provider, coach, offline,
                          insight), opportunities (source adapters), billing, demo seed
supabase/migrations/      Schema, RLS policies, public passport function
tests/                    Vitest unit + integration tests
e2e/                      Playwright journeys
```

**Content lives in code, user data lives in the database.** Career and mission ids are stable text keys, which keeps content reviewable, fast and identical across environments.

**The engine is pure.** Every rule (unlocks, streaks, XP, daily missions, matching) is a deterministic function with tests. API routes stay thin: they authenticate, validate with zod, then call `services.ts`.

**There are two storage backends behind one `Store` interface.** Every method takes the owner's user id. The Supabase store runs each query with the **user's own JWT**, so Postgres RLS enforces isolation as well as the app code. Subscriptions are readable by the owner but writable only with the service role, so users can't grant themselves Plus.

**AI provider abstraction.** `ChatProvider` has two implementations:

- `anthropicProvider`: streaming, prompt-cached stable system block, low effort for chat, server-side refusal fallbacks.
- the offline coach.

If the provider fails before any text has streamed, the reply falls back to the offline coach automatically.

**Opportunity sources** are adapters (`staticSource`, `adzunaSource`). To add a verified feed, implement `OpportunitySourceAdapter` and add it to `SOURCES`.

**Entitlements** live in one table (`src/lib/engine/entitlements.ts`). The server enforces them: active path limit, coach messages per day and Plus-only coach modes. The UI reads the same table.

### Security defaults

- HTTP-only, SameSite=Lax session cookies (Secure in production). HMAC-signed local tokens are compared in constant time, and passwords are hashed with scrypt.
- Same-origin checks on every state-changing route, zod validation on every body, and an in-memory rate limit on the coach and insights.
- Security headers: `nosniff`, `X-Frame-Options: DENY`, referrer and permissions policies.
- Service worker caches only static assets and an offline page. It never caches API responses or private HTML.
- Privacy: passports are private by default with per-section toggles, there's a data export and full account deletion, research use is opt-in, and data is never sold.

## Setting up Supabase

1. Create a project, then run `supabase/migrations/20261018000000_direction_init.sql` in the SQL editor (or `supabase db push`).
2. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`.
3. Turn off "Confirm email" for instant sign-up, or keep it on. If it's on, users are asked to confirm and then sign in.
4. For the demo button, enable **Anonymous sign-ins**.

Middleware refreshes Supabase access tokens before server components read them.

## Live billing (Stripe)

Set `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID` (a £6.99/month recurring price) and `STRIPE_WEBHOOK_SECRET`. Point a webhook at `/api/billing/webhook` for these events:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Signatures are verified with a 5-minute tolerance. Without these variables, checkout runs in mock mode, which is labelled throughout the UI.

## Testing

```bash
npm test               # Vitest: progression, streaks, mission completion, daily plans,
                       # challenge, entitlements, matching, content integrity, AI safeguards,
                       # permissions (auth, isolation, CSRF, public passport, billing, RLS)
npm run typecheck
PLAYWRIGHT_CHROMIUM_PATH=/path/to/chrome npm run test:e2e   # full journey + nav smoke test
```

The e2e suite drives the whole journey: sign up → onboarding → recommendation → choose path → complete missions → earn XP → unlock level 2 → chat with the coach → view progress. It also smoke-tests every screen with the demo account.

## Deployment

- **Vercel:** set the project Root Directory to `direction`. Use Supabase for persistence, because serverless file systems are ephemeral and local mode would lose data.
- **Docker / Railway / Fly:** `npm ci && npm run build && npm start`. Local mode works with a persistent volume mounted at `DATA_DIR`. Set `SESSION_SECRET`.
- **Mobile:** the app is an installable PWA (manifest, icons, offline page). To ship to the stores, wrap it with Capacitor, or use a TWA for Android.

## Roadmap ideas

- University and employer-sponsored pathways, partner-verified opportunity feeds and mentor matching.
- Push notifications for streak reminders, and a weekly recap email.
- More hand-crafted paths, plus AI-assisted authoring for the starter paths with editorial review.

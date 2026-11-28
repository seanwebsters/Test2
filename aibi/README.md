# AIBI — Learn AI. A little every day.

A mobile-first, installable web app (PWA) that teaches everyday people to use AI through playful five-minute lessons, daily challenges and a hands-on AI playground.

Built with **Next.js 15 (App Router) · TypeScript · Tailwind CSS · Framer Motion · Zustand**.

## Run it

```bash
cd aibi
npm install
npm run dev        # http://localhost:3000
```

Production: `npm run build && npm start`.

**Deploying on Vercel:** create a project with Root Directory `aibi`.

## AI keys (optional)

AIBI works fully without keys in a clearly labelled **demo mode**: lessons are scored by an offline rubric, and the Playground returns realistic local responses, procedural artwork and generated websites. Add keys on the server to go live:

| Variable | Enables |
|---|---|
| `ANTHROPIC_API_KEY` | Live Claude answers, prompt coaching and every Playground text mode |
| `AIBI_MODEL` | Optional model override (default `claude-opus-5-5`) |
| `OPENAI_API_KEY` | Real image generation (Playground + creative lessons) |
| `NEXT_PUBLIC_SITE_URL` | Absolute URL for social share images |

Keys are only read in `src/app/api/*` and `src/lib/server/*` (marked `server-only`); they never reach the browser. API routes have a basic per-IP rate limit, and the Playground has daily limits (10 free, 100 Plus).

## What's inside

- **Onboarding**: familiarity, interests, work, daily time, goal and name, then a personalised path summary.
- **Learning path**: 8 illustrated worlds × 10 lessons (80 total, 348 interactive steps). Each world has a checkpoint review and a world challenge. "Jump here" lets confident learners test out.
- **10 interactive step types**: teach, multiple choice, multi-select, drag-and-drop prompt builder, compare outputs, judge an AI response, spot the hallucination, sort (privacy / tool choice), write a prompt with live rubric + AI coaching, and generate an image.
- **Gamification**: XP, levels, streaks with freezes, hearts (refill one every 30 minutes), daily goal, daily quests, weekly leagues, 21 badges, 12 unlockable mascot accessories, level-up celebrations, shareable PNG cards and AI-literacy certificates.
- **Daily challenges**: 12 practical challenges, picked for each learner, and shareable.
- **Playground**: Chat, Image, Write, Analyse a document, Brainstorm and Build a website, with Aibi's live prompt tips.
- **Discover**: a curated guide to 24 AI tools by category and level, with personalised picks.
- **Monetisation**: Free vs Plus (£7.99/month, £59.99/year) with a demo checkout (no payment taken), plus an AIBI for Business early-access page.

## Architecture

```
src/content/        curriculum (worlds/w1–w8.ts), challenges, tools, onboarding options
src/lib/store.ts    all learner state (zustand + localStorage), selectors and rules
src/lib/repository.ts  persistence boundary for adding accounts + a database later
src/lib/billing.ts  plan pricing; swap the demo subscribe() for Stripe or app-store billing
src/lib/coach.ts    offline prompt rubric scoring
src/lib/server/     server-only AI client, demo engine, rate limiting
src/app/api/ai/*    chat (streaming), coach (structured JSON), image, status
```

**Adding lessons:** edit a world file in `src/content/worlds/`. Each world has 8 authored lessons plus a `boss` task; the checkpoint and challenge are assembled automatically in `src/content/curriculum.ts`. To add a world, write a new `WorldSpec` and append it to `SPECS`.

**Going native:** the UI is a single phone-width column with safe-area insets, so it can be wrapped with Capacitor, or ported to React Native with the content and store modules reused as-is.

Weekly league opponents are simulated per week until a leaderboard backend exists (`src/lib/league.ts` returns the same shape an API would).

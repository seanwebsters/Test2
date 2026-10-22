# KNOWHOW — Get interesting.

Pocket FM for learning: binge-able, episodic audio series that happen to make you smarter. A mobile-first Next.js app with a real audio player, a personal knowledge universe, collectible cards, an AI series generator and a freemium model.

```bash
cd knowhow
npm install
npm run dev          # http://localhost:3000 — works with zero configuration (demo mode)
npm test             # unit tests (entitlements, XP, streaks, cards, universe, mp3 parsing)
npm run build
```

## What's in the box

| Area | What works |
| --- | --- |
| **Onboarding** | 5 skippable screens: intro → interests → learning style → your universe → three personalised starters. |
| **Home** | Hero series, daily rabbit hole, and the rails: Pick up where you left off, Currently obsessed, Trending (top-10), 5-minute brain food, Made for your brain, Things everyone should know, The internet made me curious, Rabbit holes, Big ideas tiny episodes. |
| **Discover** | Full-screen vertical swipe feed of free hook previews with real audio, word-by-word captions synced to real timings, save/love/share, and *Continue listening* straight into the full episode. |
| **Series** | Cinematic hero, play from beginning / resume, follow, favourite, add to collection, share, episode list with free/Plus/coming-soon/completed states, queue options, offline download (Plus), ratings, host, the collectible card and topics it lights. |
| **Player** | HTML5 audio with server-checked streams and HTTP Range seeking, persistent mini-player, ±15s, speed, next, queue, sleep timer (incl. end of episode, with fade), synced captions/transcript (tap to seek), save insight, Media Session, post-episode recall challenge, auto-next, progress persistence across reloads. |
| **My Universe** | SVG/canvas constellation built from your *actual* completed episodes over a real topic graph (e.g. History → Ancient Rome → Roman Engineering → Architecture → Modern Cities, cross-linked to Finance → Inflation). Pan, pinch, wheel zoom, tap-to-focus, unlock bursts for new stars, and series suggestions that light each dim star. |
| **Gamification** | XP for episodes, series, recall challenges, new categories and streaks; levels Curious → Explorer → Thinker → Polymath → Know-it-all; daily streaks; knowledge cards with rarity tied to real milestones. |
| **AI series** | *Make me smarter about…*: interpret → difficulty → curriculum → episodes → scripts → titles → narration → cover → library → follow-ups, with live job progress. |
| **Social** | Brain Wrapped story + server-rendered PNG share card, public profiles with your universe, cards and collections; editorial + user collections you can follow. |
| **Money** | Free tier (previews, first episodes, 45 min/day), KNOWHOW+ £9.99/mo, credits wallet, unlocks, pricing and upgrade screens. |

## Content and audio

* **32 series** across 10 categories, each with original generative cover art, descriptions, hooks, creators and full episode lists (`src/content/series-data.ts`).
* **49 written episodes** (≈15k words): four flagship series with four episodes each, two *Why We Fall in Love* episodes, five daily *Rabbit Holes* and a pilot for every other series. Every script follows hook → story → facts → insight → natural ending and ships with saveable insights and a recall question.
* **Real narrated audio** for all of them (≈86 minutes, plus 15 short AI-demo episodes), rendered offline with the open-weights **Kokoro** TTS model. Each sentence is synthesised separately, so caption timings are exact. Hosts are named personas for AI voices, and the UI says so. Unreleased episodes are shown as *Coming soon*, never faked.
* Regenerate audio after editing scripts: `npm run content:export && KOKORO_MODEL=… KOKORO_VOICES=… npm run audio:render` (see `scripts/render_audio.py`).

## Demo mode vs. real integrations

Everything works with no keys. Each integration switches on with environment variables (see `.env.example`):

| Integration | Without keys | With keys |
| --- | --- | --- |
| Accounts & data | Signed guest session cookie + JSON store in `.data/` | Supabase email OTP sign-in, Postgres (`supabase/schema.sql`), Storage for AI audio. Guest progress migrates on first sign-in. |
| AI series | Five **pre-written sample series**, clearly labelled as not generated from your prompt; other prompts are refused honestly. | Claude (`claude-opus-5-5` by default) writes a structured, validated curriculum and scripts. |
| Narration for AI series | Browser speech synthesis, labelled as a development fallback | ElevenLabs or OpenAI TTS; durations parsed from the MP3 frames. |
| Payments | **Simulated** checkout: explicit confirmation, no card details, nothing charged, labelled everywhere. | Stripe Checkout (subscription + one-off credit packs) and a signature-verified webhook that grants access. |

## Security & server-side rules

* Full episode audio lives in `content-audio/`, outside `/public`, and is only streamed by `/api/episodes/[id]/audio` after an entitlement check (free episode, Plus, credit unlock, daily limit). Transcripts, insights and challenges follow the same check.
* Recall answers are checked on the server; the client never receives the answer index first.
* Listening time is bounded by wall-clock time between pings, completion requires reaching 90% of the real duration, XP is idempotent, credit purchases are idempotent by reference.
* Saved insights must come from the episode's own text.

## Layout

```
src/app            routes (pages + /api)
src/components     player, universe, cards, shell, catalog tiles, billing
src/content        categories & topic graph, series, scripts, collections, AI demo samples, audio manifest
src/lib            domain logic (XP, streaks, cards), entitlements, universe builder, store (JSON | Supabase), AI pipeline, billing
content-audio      narrated MP3s and hook previews
supabase           schema.sql (+ `npm run db:seed-sql` for the catalog)
```

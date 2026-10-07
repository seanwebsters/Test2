# Calm · Dream Worlds — prototype

> **Pick a world. Pick your characters. Pick the kind of dream. AI tells you the story.**
> Netflix for personalised dream worlds — powered by AI, built for sleep.

A clickable, investor-quality prototype of an AI-native bedtime entertainment platform. Mobile-first, with a streaming-style desktop/tablet discovery experience.

## Run it

```bash
cd dream-worlds
npm install
npm run dev        # http://localhost:3000
# or
npm run build && npm start
```

No API keys or backend are needed. Everything persists to `localStorage`. To start fresh, use **You → Reset demo**.

## It's a mobile app

The product is designed phone-first; desktop only adds a streaming-style discovery layout.

- **On a phone:** open the URL, then *Share → Add to Home Screen*. It launches full-screen with its own icon and a translucent status bar, respecting the notch and home indicator.
- **On a laptop:** open **`/device`** to present the live app inside an iPhone frame, with shortcuts to each key screen. Use this for founder reviews.
- **Native patterns:**
  - a glass bottom tab bar with a raised Create button
  - a "now dreaming" mini-player docked above the tab bar
  - large titles that collapse into a compact bar as you scroll
  - full-screen modal flows (Create, Preview, Player, Morning) that hide the tab bar
  - a player you can swipe down to dismiss
  - bottom sheets, haptic ticks on selection, 44px touch targets
  - 16px inputs, so iOS doesn't zoom when a field is focused
  - no rubber-band bounce or tap flashes

## Demo path (≈3 minutes)

1. **Home** — "What would you like to dream tonight?" Then: Continue Dreaming, New This Week, Featured Worlds, Characters You Love, Calm Originals, Popular Dreams, Because You Dreamed About…, Explore New Worlds.
2. **Create a Dream** — pick worlds, then characters (1–4, crossovers allowed where rights permit), then a dream type, then length, sleepiness, story role and prompt.
   - Try **The Endless Seas + Stadium Nights**: the league's crossover rules block it.
   - Try **Romantic** with Stadium Nights: the tone is restricted by the rights holder.
3. **Dream Preview** — Start / Remix / Save. Open **Behind the dream** to see the Dream Engine's input, the rights restrictions it applied, and its output.
4. **Dream Player** — press play. The **Demo 20×** badge time-lapses the night so you can watch it move from Awake to Drifting to Sleepy to Asleep. The art dims and blurs, dialogue thins out, the text slows, music fades and ambience rises. The `…` menu lets you jump between stages or **Skip to morning**. **Drift off** opens the "Drifting with you" screen.
5. **Morning** — "Good morning" recap. **Continue Tonight** generates Night 2, which remembers previous events, relationships, locations and choices.
6. **My Dreams** — Continue Dreaming, the Recent / Saved / Favourites tabs, *Your ongoing stories* (continuity memory), Your Worlds, Favourite Characters, Dream History and Saved Dreams.
7. **/pitch** — a hidden route with the product evolution (Dream It → Build Worlds → Dream Anything) and the platform architecture.

## Architecture

```
src/
  app/                    Next.js App Router screens
    page.tsx              Home (mobile hero + desktop streaming billboard)
    create/               4-step Create flow
    dream/[id]/           Dream Preview (+ Dream Engine inspector)
    play/[id]/            Dream Player (sleep-stage engine, audio, TTS, sleep timer)
    morning/[id]/         Morning recap
    my-dreams/            Persistent library
    explore/  world/[id]/ new/  you/  pitch/
  components/
    art/                  Procedural cinematic world art + backlit character portraits
    cards/ home/ player/ create/ nav/ ui/
  lib/
    types.ts              Domain + rights model
    data/                 Fictional partners, worlds, characters, voices, lore, catalog
    engine/
      systemPrompt.ts     Dream Engine system prompt
      dreamEngine.ts      DreamEngine interface, MockDreamEngine, LLMDreamEngine adapter
      mockGenerator.ts    Deterministic, rule-following story generator
    services/
      rights.ts           Crossover / tone / restriction enforcement
      storage.ts          DreamRepository (localStorage; swap for Supabase/Postgres)
      dreams.ts           Catalog materialisation, labels
    audio/ambient.ts      Generative WebAudio soundscape driven by the sleep curve
    store.tsx             React context: dreams, sessions, preferences, continuity
```

### Official IP → Dream Engine → Personalised Dream → Consumer

**Rights layer** (`lib/types.ts`): `Partner`, `IPWorld`, `Character`, `Voice`, `LoreDocument`, `UsageRules` and `CrossoverPermissions`. A rights holder can configure:

- which characters are available
- which characters may interact
- which worlds can crossover
- approved voices
- restricted themes
- visual guidelines
- story restrictions

`services/rights.ts` enforces these rules in the UI. Rules can only narrow from partner to world to character. The same rules are compiled into the engine payload.

**Dream Engine contract**

- **Input:** `user_id, worlds[], characters[], tone, length, sleepiness, story_role, user_prompt, story_history[], user_preferences`
- **Output:** `dream_title, summary, chapters[], narration, character_dialogue[], soundscape, visual_prompts[], sleep_curve, continuity_data`

`buildGroundedPayload()` expands ids into canon lore, character sheets, restrictions and the sleep plan.

**To plug in a real LLM**, replace the exported `dreamEngine` with `new LLMDreamEngine(complete)`. `complete` is any `({system, user}) => Promise<string>` adapter, ideally called from a server route so keys stay off the client. If the model returns malformed output, the engine falls back to the mock, so nobody is left without a story at bedtime.

**Continuity.** Every episode returns `continuity_data`. **Continue Tonight** passes the whole series as `story_history`, and the next episode builds on those events, relationships, locations, choices and open threads.

### Swapping in production pieces

| Prototype | Production |
| --- | --- |
| `LocalDreamRepository` | Supabase/Postgres implementation of `DreamRepository` |
| `MockDreamEngine` | `LLMDreamEngine` behind an API route |
| Procedural `WorldArt` / `CharacterPortrait` | Partner key art via `artUrl` / `portrait.assetUrl` |
| Browser `speechSynthesis` | Licensed TTS voices via `Voice.providerVoiceId` |
| `AmbientEngine` (WebAudio) | Partner-approved stems driven by `soundscape.cues` |

## Content note

All worlds, characters, partners and creators in this prototype are **fictional demo content**. No licensed or copyrighted assets are used. The "Calm" wordmark is set in type as a placeholder.

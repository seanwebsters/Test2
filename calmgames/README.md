# Calm AI Game Studio

An autonomous creative studio where six specialised AI agents invent, design, art-direct, build, play-test and review calming HTML5 minigames for adults. Type a brief, watch the agents work, play the result, ask for changes, and export a portable bundle.

## Quick start

```bash
cd calmgames
npm install
cp .env.example .env.local      # then add ANTHROPIC_API_KEY
npm run dev                     # http://localhost:3000
```

`npm run dev` first bundles the game runtime into `.runtime/`, then starts Next.js.

**The one credential you must supply is `ANTHROPIC_API_KEY`.** Without it, the studio still opens, the four playable studio originals work, QA, export and the library work, but **Generate**, **Refine**, **Creative Lab** and **Ask Insights** are disabled and say why. Nothing is ever simulated.

Optional:

| Variable | Purpose |
| --- | --- |
| `DATA_BACKEND=supabase`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Use Supabase instead of local JSON files. Apply `supabase/migrations/0001_init.sql` first. |
| `DATA_DIR` | Where the local store lives (default `.data/`). |
| `CALM_DEFAULT_MODEL` | Default model for every agent (default `claude-opus-5-5`; change per agent in Settings). |
| `JOB_COST_CAP_USD` | Hard stop per generation run (default `3`). |
| `RATE_LIMIT_PER_MINUTE` | Generation requests per client per minute (default `6`). |

Automated QA uses Playwright's Chromium. If it isn't installed on your machine, run `npx playwright install chromium`.

## What happens when you click Generate

1. A persistent **job** is created and a game record appears in the library as *Generating*.
2. The orchestrator (`src/lib/orchestrator.ts`) runs the agents in sequence. Each receives the validated output of the ones before it:
   - **Ideation** (Creative Director): concept, emotional goal, player objective, interaction model, archetype, variations.
   - **Game Design** (Senior Game Designer): core loop, rules, controls, progression, win condition, feedback, stress safeguards.
   - **Art Direction** (Art Director): palette (contrast-checked), environment, particles, motion tempo, sound mood, hand-written SVG motifs. No image model is called.
   - **Development** (Senior Game Developer): a configuration for one of the tested archetypes (or a freeform HTML document in experimental mode).
   - **QA** (QA Engineer): compiles the game and plays it in headless Chromium under its real CSP. It plays every level to completion with real pointer input, and checks console errors, network isolation, keyboard play, mobile layout, studio controls and accessibility. Failures go back to Development for repair, up to the limit in Settings (default 2).
   - **Insights** (Product Analyst): a quality review whose recommendations are labelled *observed* (backed by real play data) or *hypothesis*.
3. Every response is constrained with structured outputs and validated with Zod plus gameplay rules (paths must be connected, gardens must be winnable, constellation lines must not cross). An invalid response is sent back with the exact problems, up to three or four times.
4. The result is saved as a **version** with its specs, assets, QA report, review and a QA screenshot as its thumbnail.

The UI polls the job and shows each agent as Waiting, Working, Complete or Failed, with live activity, elapsed time and cost. Click an agent to inspect exactly what it produced. A failed or interrupted run (for example after a server restart) can be **resumed** from the agent that stopped.

**Refinement** ("Make the colours warmer") runs the same six agents with the previous version's outputs and your instruction, producing a new version. Earlier versions are kept. **Save version** pins one as the version the library plays and exports.

## The game engine

Generated code never runs in the Next.js server. The agents write *configurations* for a small, tested browser runtime (`src/runtime/`) with three archetypes:

| Archetype | Gameplay |
| --- | --- |
| **Tile path** | Rotate tiles so a flow (sunlight, water) travels from source to destination; decoy tiles, multiple levels, optional breathing pacer. |
| **Mindful garden** | Plant species, water by hand or dig channels from springs; plants grow over time, never wilt; companions blooming side by side create harmony. |
| **Constellation** | Drag or tap between stars to draw a figure; remaining-line pips and ghost guides; wrong lines fade without penalty; each figure reveals a story. |

Each has rules, mouse, touch and keyboard controls, visual and audio feedback (Web Audio, no samples), a completion state, restart, responsive layout, reduced-motion support and configurable themes. Pure game logic lives in `src/lib/engine/` and is unit-tested.

**Freeform mode** (experimental, chosen explicitly or by the Creative Director only when no archetype fits) lets the Development agent write a whole HTML document, optionally using Phaser 3. It's validated (no network APIs, no external scripts), wrapped with the studio bridge, and QA can only smoke-test it.

**Sandboxing.** Every game is one self-contained document served with `Content-Security-Policy: default-src 'none'; script-src 'unsafe-inline'; connect-src 'none'; … sandbox allow-scripts` and loaded in an `<iframe sandbox="allow-scripts">`. It runs in an opaque origin, with no cookies, storage, network or studio credentials. It talks to the studio only via `postMessage` (pause, restart, sound, and play events).

## Studio originals

| Game | Archetype | Status |
| --- | --- | --- |
| Apricus' Sunset Path | Tile path, 3 levels | Playable |
| The Tidal Garden | Garden, 2 levels | Playable |
| Breathe & Flow | Tile path with breathing pacer, 3 levels | Playable |
| Star Stories | Constellation, 3 levels | Playable |
| Colour the Island | — | Concept (not implemented) |
| Daily Rituals | — | Concept (not implemented) |

These are hand-authored, labelled that way in the UI, and start as *untested*. Press **Run QA now** on a game to test it for real.

## Pages

Overview · Create Game · My Games (open, play, duplicate, rename, refine, delete, export) · AI Agents (per-agent model choice, recent runs) · Creative Lab (five concepts compared side by side, then *Build this game*) · Style Library (the shared design system, with live particle and sound previews from the actual runtime) · Assets (Art Director motifs plus imported, approved assets) · Analytics (recorded token spend; observed play sessions and drop-off; Insights on demand) · Settings.

## Tests

```bash
npm test            # unit + integration (Vitest), including real-browser QA of all four seeds
npm run test:e2e    # Playwright against a production build of the app
npm run typecheck
npm run build
```

- Unit tests cover tile, garden and constellation mechanics, validators, the compiler/CSP, SVG sanitising, and that every agent schema is accepted by structured outputs.
- `compile-qa.test.ts` runs the real QA engine against each seed: all four play through every level in Chromium and pass every check.
- `pipeline.test.ts` drives a full generate → refine → export run through the real Anthropic SDK pointed at a **local stand-in HTTP server**. This is test-only: it proves orchestration, streaming, validation and self-correction, QA, versioning and export. It is not a substitute for a real model call.
- E2E covers the dashboard, the honest no-key refusal, sandboxed play, on-demand QA, library actions and every page.

## Costs

Settings shows an estimate before you run (about $0.50 per game on Claude Opus 5.5 at medium effort, more with repairs). Actual token usage from every response is recorded and shown per agent in Analytics. These are list-price estimates; check your Anthropic console for billing. Refusals are routed to a fallback model server-side (`server-side-fallback` beta, `fallbacks: "default"`).

## Extending

- **New providers:** `src/lib/providers.ts` defines image, sound, analytics-export and deployment interfaces. None are connected, and Settings says so.
- **Proprietary Calm assets:** import approved SVG/PNG files in Assets. Nothing is scraped.
- **Scheduled generation:** not configured. Point a real scheduler at `POST /api/jobs` with `{"kind":"lab","count":5}`.
- **New archetypes:** add a schema in `src/lib/engine/schemas.ts`, pure logic plus a validator in `src/lib/engine/`, a scene in `src/runtime/scenes/` that exposes `qaNext()`, and a line in the prompts.

## Layout

```
src/app/             pages and typed API routes (/api/*, /play/[id]/[n])
src/components/      shell, studio (player, timeline, refine), games, ui (shadcn-style)
src/lib/agents/      prompts, Zod hand-off schemas, agent calls
src/lib/ai/          server-only Anthropic client, models and pricing
src/lib/engine/      archetype schemas, game logic, validators, HTML compiler
src/lib/qa/          Playwright QA runner
src/lib/store/       Repo interface, local JSON store, Supabase store
src/runtime/         browser game runtime (bundled by scripts/build-runtime.mjs)
supabase/migrations/ database schema
tests/               unit, integration and e2e tests
```

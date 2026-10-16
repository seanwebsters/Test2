# Sleep Stories Studio – implementation plan

## What exists today (inspected before building)

The repository has no Lovable app. It contains the **Calm Stories** Next.js 15 / React 19 / Tailwind app in `calm-stories/`:

* A listener app (home, series, player, library) that reads only from the database.
* A data layer with a local JSON store and a Supabase adapter, plus a Postgres migration with RLS.
* Auth with roles (admin, editor) independent of subscription.
* Object storage (local, R2, Supabase) with Range streaming.
* An admin with a review queue, publishing calendar, moderation and scheduled releases.
* A first single-pass agent pipeline (plan → write → narrate → mix → art → review). It has offline stand-ins that fake output when keys are missing.

The studio is built inside this app, so approved episodes publish straight into the listener catalogue.

## Ground rules

* **No fake output.** Offline stand-ins are removed from production code. When a provider key is missing, the agent that needs it stops in an **"Asking for help"** state that names the key to connect. Tests use recorded/mock HTTP responses only.
* **Never publish without explicit human approval.** Both series greenlight and episode publish are human gates.
* **Typed handoffs.** Every agent output is validated by a zod schema. It is stored as a versioned **deliverable** with model, tokens, cost and a reasoning summary.
* **Structured critique.** Reviews carry issues with evidence (quoted text), severity and a concrete suggestion. No arbitrary quality percentages.
* **Persistent memory.** The series bible (world, characters, relationships, timeline, threads, facts, style guide) is versioned. The Continuity Editor updates it after every final script.

## Architecture

| Concern | Implementation |
| --- | --- |
| UI | Next.js App Router, `/studio` (staff only) |
| Data | `Database` interface: local JSON (dev) / Supabase Postgres (prod) |
| Writing & editorial agents | Claude via official SDK: structured outputs, prompt caching of the bible, streaming, optional web search for genre research |
| Images | Nano Banana: Gemini `generateContent` with IMAGE modality, reference images for character consistency. `sharp` for delivery sizes and typography overlay |
| Image review | Claude vision |
| Narration | ElevenLabs: voice library & auditions, per-character casting, pronunciation dictionaries, request stitching, per-scene generation |
| Sound & music | ElevenLabs Sound Effects (looping ambience layers) and ElevenLabs Music (score cues) |
| Assembly | FFmpeg: per-scene stems, side-chain ducking, fades, loudness normalisation (EBU R128), true-peak limiting; QA analysis |
| Orchestration | Durable DAG workflow engine in Postgres/JSON: dependencies, parallel steps, retries with backoff, 429 rate-limit backoff, revision loops with limits, human gates, pause / resume / cancel, version history and cost tracking. Runs in-process (heartbeat) and from cron. Swappable for Trigger.dev, since each step is a pure function of persisted inputs |

## Workflows

### A. Series development (brief → greenlight)

1. **Program Director:** genre research and audience analysis. Uses Claude web search when enabled; reads catalogue performance.
2. **Creative Director:** three original concepts.
3. **Story Critic:** critiques each concept with evidence and recommends one.
4. **Creative Director:** series identity, style guide and core bible.
5. **Worldbuilder** ‖ **Character Psychologist** (parallel), then **Romance Architect**.
6. **Series Architect:** season plan with episode arcs.
7. **Continuity Editor:** bible consistency check. Can send work back for revision.
8. **Art Director:** visual identity, character visual descriptions, then poster concepts and character portraits (Nano Banana). Claude reviews them and selects the strongest.
9. **Gate:** Network Executive greenlights or rejects. Greenlight schedules episode production.

### B. Episode production

1. **Series Architect:** episode outline.
2. **Lead Writer:** scene plan, with an intensity curve that descends toward sleep and no late revelations.
3. **Lead Writer:** first draft, written scene by scene.
4. Reviews in parallel: **Character Psychologist**, **Romance Architect**, **Dialogue Editor**, **Continuity Editor**, **Sleep Editor**, **Story Critic**.
5. **Creative Director:** synthesises the notes into a revision brief, or approves.
6. **Lead Writer:** targeted scene rewrites, then re-review. Up to *N* rounds.
7. **Continuity Editor:** writes the episode's facts, events and threads into the bible.
8. In parallel:
   * **Art Director:** episode cover concepts, a review, and the selected cover.
   * **Audio Director:** voice casting, performance segmentation, and a per-scene sound and music plan.
9. **Audio Producer:**
   * narration per scene;
   * ambience layers and music cues;
   * scene stems;
   * the mastered episode.
10. **Quality Controller:** approves, or requests specific revisions (for example, re-voice scene 3). Up to *N* rounds.
11. **Gate:** human approval, then publish.

## Phases

1. Data model (bible, characters, deliverables, reviews, usage, agent profiles, writing guidelines), agent framework, workflow engine, series development, and the writing workflow. End-to-end test with mocked Claude.
2. Visual identity, posters, portraits, episode covers with reference images, typography overlay, delivery sizes, image review.
3. Voice library and casting, pronunciation dictionaries, segment narration, scene sound plans, ambience and music, FFmpeg stems and master, QA, scene-level regeneration.
4. Studio dashboard:
   * AI Team bedrooms with live agent states (animations driven by real workflow state);
   * the Writers' Room, Art Studio, Audio Studio, Pipeline, Approvals, Analytics and Settings sections.
5. Concurrent series, scheduled production, audience-informed planning by the Program Director.

## What you need to connect

| Key | Used by |
| --- | --- |
| `ANTHROPIC_API_KEY` | all writing, editorial, critique and image-review agents |
| `GEMINI_API_KEY` | Nano Banana artwork |
| `ELEVENLABS_API_KEY` | voices, narration, pronunciation dictionaries, sound effects, music |
| FFmpeg on the worker | mixing and mastering |
| `DATA_BACKEND=supabase` (+ keys) and `STORAGE_BACKEND=r2`/`supabase` | production persistence |

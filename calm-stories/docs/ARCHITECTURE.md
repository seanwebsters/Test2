# Architecture

```
src/
  app/                    Next.js App Router pages and API routes
    (listener)            /, /discover, /series/[slug], /listen/[id], /library, /profile, /settings
    create/               Calm Storymaker (three-panel workspace)
    studio/               Creator dashboard, series management, script editor, audio production
    admin/                Calm Production Studio (overview, agents, review, calendar, moderation, AI settings)
    api/                  JSON routes – all wrapped by lib/api.route() for consistent errors
  components/             Reusable UI (player, catalog cards, storymaker panels, admin widgets)
  lib/
    types.ts              Domain model (snake_case = Postgres columns)
    db/                   Database interface + LocalDatabase (JSON) + SupabaseDatabase
    auth/                 policy.ts (pure rules), providers.ts (identity & entitlements), session.ts
    services/             catalog, library, recommendations, analytics, editorial, review checks
    ai/                   provider interface, Anthropic & OpenAI adapters, simulator, story engine
    story/                Story Bible context retrieval, continuity & sleep-suitability checks
    storymaker/           tool registry, tools, executor (validation/permissions/confirmation/audit), assistant
    audio/                synth, WAV, DSP, mixer, QA, TTS providers, FFmpeg
    production/           audio production service, multi-agent engine, scheduler
    jobs/                 background job runner (queue, retries, idempotency, budgets, controls)
    storage/              local / R2 / Supabase Storage + range-request serving
    seed/                 prototype catalogue (data only – UI never imports it)
supabase/                 migration (schema, indexes, RLS) and generated seed.sql
tests/                    Vitest suites for the critical journeys
```

## Principles

* **Database-driven.** Pages read only from the data layer. The seed is loaded into the database, never imported by components.
* **Adapters at every boundary.** Database, identity, entitlements, LLMs, TTS, images, storage, analytics and jobs each sit behind an interface with a working local implementation.
* **Honest simulation.** Simulated outputs carry `simulated: true` all the way to the UI and the review queue.
* **Policy in one place.** `lib/auth/policy.ts` holds pure functions (visibility, streaming, editing) used by pages, API routes, tools and agents. Postgres RLS mirrors the same rules.

## Entitlements and roles

Subscription (`plan`) and role (`creator`, `editor`, `admin`) are independent:

| | Browse | Full listening | Library / follows | Storymaker | Review / agents |
| --- | --- | --- | --- | --- | --- |
| Visitor | ✓ | previews (episode 1) | – | – | – |
| Premium | ✓ | ✓ | ✓ | – | – |
| Creator | ✓ | own drafts + previews | with Premium | ✓ (own series only) | – |
| Admin / editor | ✓ | ✓ | with Premium | ✓ (all series) | ✓ |

An episode is public only when its series is published **and** it is `published`, or `approved` with `release_at <= now`. Audio is served only through `/api/episodes/[id]/audio`, which checks entitlement on every request.

## Storymaker tool system

Every action, whether it comes from the chat or from a UI button, runs through `storymaker/execute.ts`:

1. Look up the tool in the registry (name, description, **zod input schema**, permission, series scope).
2. Validate the input, and reject unknown tools or invalid fields with readable errors.
3. Authorise: creator role, and ownership of the series unless the user is an admin.
4. **Confirmation gate**: the tool's `confirm()` returns a reason for destructive edits, paid generation (when a real provider is configured), overwriting the creator's own words, and publishing. The call is stored as `pending_confirmation` until the creator presses *Go ahead*.
5. Run the tool and record it in `ai_tool_calls` (input, output summary, model, simulated flag), along with token costs in `production_costs`.

The assistant uses tool calling with Claude or OpenAI when they're configured. Tool JSON schemas are generated from the zod schemas, and the loop runs for up to 6 iterations, preserving provider content blocks within a turn. Without a model, a deterministic intent router maps requests (for example "Make the narrator warmer and add gentle rain") to the same tools.

Tools: `generate_synopsis, create_series, update_series, create_world, update_world_bible, add/update/delete_location, create/update/delete_character, add/delete_relationship, generate_season_outline, create_episode, update_episode, reorder_episodes, delete_episode, continue_story, generate_episode_outline, write_episode, save_script, update_script_settings, restore_script_version, rewrite_script_section, check_story_continuity, approve_script, update_production_settings, preview_voice, generate_narration, generate_soundscape, mix_episode_audio, generate_cover_art, save_rights_declaration, schedule_episode, submit_for_review`.

## Story memory

`story/context.ts` loads the Story Bible (world, rules, facts, threads, preferences), characters, relationships, locations and episode history. It condenses them into a prompt with recent episodes in full and older ones as titles. Continuity has two layers:

* **Rule-based checks** (always on): "never / no one may" world rules versus script sentences, recurring names missing from the Bible, and contradicted departure facts.
* **Model review** (when configured): structured contradictions with evidence.

Neither layer rewrites lore. Approving a script adds its events to `narrative_events`.

## Production engine

`production/engine.ts` registers the `episode_production` workflow, which has 13 steps across 7 agents:

1. Read the Story Bible (Showrunner)
2. Decide the next episode (Showrunner)
3. Outline it (Showrunner)
4. Write the script (Writer)
5. Check continuity (Continuity)
6. Check and soften for sleep-suitability (Sleep Editor)
7. Direct the voice (Voice Director)
8. Narrate (Audio Producer)
9. Mix and master (Audio Producer)
10. Run audio QA (Audio Producer)
11. Add artwork and metadata (Publishing)
12. Submit for review (Publishing)
13. Notify editors (Publishing)

Each agent's provider, model and prompt template come from `agent_configurations`, and a workflow can pin its own model (`withWriterOverride`, AsyncLocalStorage).

`jobs/runner.ts` provides:

* persisted job and step state, logs and per-step cost;
* retries with exponential backoff, up to the configured limit;
* **idempotency keys**: the scheduler uses `prod:{series}:{slotISO}`, so ticks never double-produce;
* **budgets**, enforced before paid steps;
* **concurrency limits**: a global maximum and one job per series;
* **controls**: pause (between steps), resume, cancel, retry from the failed step, rerun all;
* recovery of jobs orphaned by a restart.

Drivers: `inline` (in-process, used for development and single servers) and `trigger` (hands `jobId` to a Trigger.dev task, see `trigger/run-job.ts`). The workflow graph is defined in code rather than LangGraph to keep a small dependency surface. Each step is a pure `(ctx) => Promise` node over shared state, so a workflow can be ported to a LangGraph `StateGraph` if branching or agent-to-agent loops become necessary.

`production/scheduler.ts` turns `production_workflows` (episodes per week, release days, UTC hour) into release slots and enqueues production. `releaseDueEpisodes()` publishes approved episodes when their release time arrives and sends follower updates, which respect each listener's notification setting.

## Audio pipeline

```
script → splitSections (--- or ~350 words) → TTS per section (stored, individually regenerable)
       → concat with pauses → mix with ambience (looped, side-chain ducked −8 dB under voice)
       → normalise (−24 dBFS RMS) → 4 s fade-in / ~20 s fade-out → soft limiter (−2 dBFS)
       → FFmpeg loudnorm I=−24 LUFS + MP3 (if available) → QA report → episode audio
```

QA checks clipping, true-peak, approximate loudness (ungated RMS, labelled as approximate), long silences, abrupt transitions in short-term loudness, sudden transients, missing sections, background level against the voice, pacing (words per minute) and pronunciation candidates. Results appear in the production workspace and the review queue.

## Wellbeing

There are no streaks or engagement nudges. Autoplay stops after a configurable number of episodes, the sleep timer fades out gently and can stop at the end of an episode, follower updates are opt-out, and the app makes no clinical claims.

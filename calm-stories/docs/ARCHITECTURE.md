# Architecture

```
src/
  app/
    studio/               Sleep Stories Studio dashboard (staff only)
    (listener)            /, /discover, /series/[slug], /listen/[id], /library, /profile, /settings
    admin/                Publishing operations: review queue, calendar, moderation, uploads
    api/studio/           Studio actions (briefs, gates, runs, deliverables, art, casting, settings)
    api/cron/tick         Heartbeat for serverless deployments
  components/studio/      AgentBedroom (illustrated agents), TeamRoom, PipelineStrip, drawers, viewers
  lib/
    studio/
      agents.ts           The 16-role team: instructions, effort, bedroom illustration parameters
      schemas.ts          zod schemas for every typed handoff (JSON Schema for structured outputs)
      llm.ts              Claude adapter: cached bible context, structured outputs, web search, vision, usage
      engine.ts           Durable DAG workflow engine
      bible.ts            Versioned series bible + context renderer + versioned deliverables
      art.ts              Nano Banana generation, renditions (sharp), vector typography (opentype.js)
      mixing.ts           FFmpeg scene mixes, masters, loudness measurement
      team.ts             Live agent state for the AI Team room (derived, never random)
      workflows/          series.ts · episode.ts · art-steps.ts · audio-steps.ts
      scheduler.ts        Release schedules → commissioned episodes
    providers/            elevenlabs.ts, nano-banana.ts (HTTP adapters)
    db/                   Database interface: LocalDatabase (JSON) and SupabaseDatabase
supabase/                 migration (schema, indexes, RLS) and generated seed.sql
tests/                    Vitest: policy, editorial flow, studio end-to-end
```

## Principles

* **No fake output.** Production code has no simulators. A missing credential raises `BlockedError(needs)`. The step parks as `blocked`, the agent raises its hand in the AI Team room, and the run resumes when you press Resume. Tests replace provider HTTP with schema-valid test doubles.
* **Typed handoffs.** Every structured agent output is validated against a zod schema. The same definition generates the JSON Schema sent as `output_config.format`. Output that doesn't match fails the step, and it retries.
* **Versioned memory.**
  * Every deliverable (concepts, outlines, drafts, reviews, briefs, QC reports…) is stored with a version, agent, model and reasoning summary.
  * The series bible is versioned on every change.
  * Human edits become new versions credited to the Network Executive.
* **Humans hold the gates.** Series greenlight and episode publish are approval steps. Agents cannot pass them, and the publish API checks the role permissions set in Settings.

## The team

| Agent | Main work |
| --- | --- |
| Network Executive (you) | Briefs, greenlights, approvals |
| Program Director | Genre research (web search), catalogue/audience analysis, commissioning |
| Creative Director | Concepts, identity and style rules, editorial synthesis, revision briefs |
| Romance Architect | Relationship design; romance review |
| Worldbuilder | World, cultures, magic, recurring locations |
| Character Psychologist | Cast design; character review |
| Series Architect | Season plans; episode outlines |
| Lead Writer | Scene plans, scene-by-scene drafts, targeted rewrites |
| Dialogue Editor | Dialogue review with replacement lines |
| Sleep Editor | Sleep-shape review |
| Continuity Editor | Bible consistency checks, script continuity review, canon updates |
| Story Critic | Independent concept and script critique |
| Art Director | Visual identity, portraits, posters, covers, environments, promo; image review (vision) |
| Audio Director | Casting, pronunciation dictionary, per-scene audio plans |
| Audio Producer | Narration, ambience, music, stems, master |
| Quality Controller | Final production review with actionable revisions |

Instructions, model and effort per agent are editable in Settings (`agent_profiles`). The house writing guidelines and benchmarks, plus optional per-series guidelines, are included in every writing agent's context.

## Context and caching

`bible.ts → seriesContext()` renders the series bible into one stable document:

* identity and style rules, world, characters, relationships and season plan;
* timeline, canon facts, open and resolved threads, and episodes so far;
* the house guidelines.

It is sent as a second system block with `cache_control: ephemeral`, so the many agent calls in a workflow reuse the cached prefix. Cache reads and writes are recorded in `usage_records`.

## Workflow engine

Runs (`workflow_runs`), steps (`workflow_steps`, one row each) and events (`workflow_events`) are persisted. Each tick:

* starts every pending step whose dependencies have succeeded (parallel, bounded per run and globally);
* recovers steps orphaned by a restart.

| Outcome | Step state |
| --- | --- |
| success | `succeeded`. Next agents get a **handoff** event, and the step may **add steps** (revision rounds, per-scene audio, gates) |
| transient failure | `waiting` with exponential backoff, max 3 attempts |
| provider 429 | `waiting` until `retry-after`; the attempt is not counted |
| missing key / budget | `blocked` with `needs` (e.g. `ELEVENLABS_API_KEY`, `budget`) |
| approval gate | `awaiting_approval`. A gate hook runs on your decision (greenlight → casting + episode one; changes requested → a revision chain) |
| hard failure | `failed`. Retry from the Pipeline page |

Runs also support pause, resume (optionally with a higher budget), cancel and idempotency keys (scheduled slots). The engine runs from the in-process heartbeat (30 s) and from `/api/cron/tick`. Each step is a pure function of persisted inputs, so the engine can be moved onto Trigger.dev or another durable runner by calling `tick()` from a scheduled task.

## Writing pipeline (per episode)

```
outline ─▶ scene plan (rule-checked sleep shape) ─▶ draft (one call per scene, with prior scenes)
   ─▶ reviews ×6 in parallel ─▶ Creative Director synthesis
         ├─ revise → targeted scene rewrites ─▶ re-review (critic + reviewers who asked) ─▶ synthesis (≤ N rounds)
         └─ approve → finalize (canon → bible) ─▶ covers ∥ audio direction ─▶ scenes ∥ ─▶ master ─▶ QC ─▶ approval
```

Scene plans are rejected when intensity rises after the midpoint, when the last scene isn't the calmest, or when word targets miss the episode length. Reviews carry `issues[]` with severity, scene, quoted evidence, problem and suggestion; there are no scores.

## Art pipeline

* **Nano Banana:** `generateContent` with `responseModalities: ["IMAGE"]` and `imageConfig.aspectRatio` (optional `imageSize`). Character portraits are sent as **reference images** for posters, covers and promo assets.
* **Storage and renditions:** originals are stored, and `sharp` produces 1600/800/400 px WebP renditions.
* **Typography:** generated images never contain text. Titles are rendered as vector paths from Cormorant Garamond (opentype.js) over a gradient and composited, giving the `titled` rendition.
* **Review:** Claude vision reviews each set of concepts and selects the strongest; reviews are stored on each asset.

## Audio pipeline

* **Casting:** voices come from `GET /v1/voices`, the voices your account holds rights to. Claude proposes candidates per role, audition samples are rendered, and you can recast in the Audio Studio.
* **Pronunciation:** Claude lists invented names, and an ElevenLabs dictionary is created from alias rules. It is applied to every narration request.
* **Performance:** quotes are split deterministically; the Audio Director attributes each numbered quote to a speaker, and narration and dialogue get their cast voices. Consecutive segments use `previous_text` / `next_text` and `previous_request_ids` for natural joins.
* **Sound:** each scene has two to four ElevenLabs looping sound-effect layers and an optional ElevenLabs music cue.
* **Scene stems (FFmpeg):** narration is delayed for an ambience lead-in. Beds loop with fades and sit lower in calmer scenes, and side-chain compression ducks them under the voice.
* **Master:** 2.5 s crossfades between scenes, `loudnorm I=-24:TP=-2`, `alimiter`, a 12 s fade-out, MP3 128k. Integrated loudness and true peak are measured and stored.
* **Revisions:** QC can request re-voicing or remixing of specific scenes, or new covers. The Audio Studio can re-voice or remix one scene and re-master without touching the rest.

## Live agent states

`team.ts` maps persisted state to poses:

| Persisted state | Pose |
| --- | --- |
| running step (by its `activity`) | thinking, typing or reading |
| `blocked` or `awaiting_approval` | asking for help |
| handoff event < 12 s ago | handing off |
| completion < 25 s ago | celebrating |
| `waiting` | thinking |
| otherwise | sleeping |

The AI Team room polls every 3 s, and animations respect `prefers-reduced-motion`.

## Access

Staff pages and APIs require the editor or admin role; agent instructions and studio settings need admin. Unreleased content, studio data and concept art are staff-only, both in the app and under Postgres RLS. Selected artwork of published series is public.

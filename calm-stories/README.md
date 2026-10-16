# Calm Stories + Sleep Stories Studio

Two products on one platform:

* **Sleep Stories Studio** (`/studio`) – an AI production company. A team of specialised agents develops original episodic sleep fiction from your brief and produces finished episodes:
  * a series bible;
  * multi-stage scripts;
  * cinematic artwork with Nano Banana;
  * narrated, scored and mastered audio with ElevenLabs and FFmpeg.

  Humans keep creative control: you greenlight every series and approve every episode before it publishes.
* **Calm Stories** (`/`) – the listener app where approved episodes are released: a Pocket FM-style streaming home with series pages, a persistent player, sleep timer, library and follows.

## Quick start

```bash
cd calm-stories
npm install
npm run dev            # http://localhost:3000
```

Sign in as **Calm Editorial** (administrator) and open **/studio**.

Then connect the providers as server environment variables, e.g. in `.env.local`:

```bash
ANTHROPIC_API_KEY=…    # all writing, editorial, critique and image-review agents
GEMINI_API_KEY=…       # Nano Banana artwork
ELEVENLABS_API_KEY=…   # voices, narration, pronunciation, sound effects, music
# FFmpeg must be installed (or FFMPEG_PATH set) for mixing and mastering
```

There are no simulated stand-ins. If a key is missing, the agent that needs it stops, shows a raised hand in the AI Team room, and names the key it needs. Press **Resume** once it's connected.

```bash
npm test               # unit + end-to-end tests (provider test doubles, real FFmpeg)
npm run typecheck
npm run build
npm run db:reset       # wipe local data and re-seed on next start
```

## How a series gets made

1. **Brief** (`/studio/series/new`): describe the series you want.
2. **Development:**
   * the Program Director researches the genre with web search and checks real catalogue performance;
   * the Creative Director writes three original concepts;
   * the Story Critic critiques them and recommends one;
   * the team builds the identity and style rules, world, characters and relationships, and season plan;
   * the Continuity Editor checks the bible and sends inconsistencies back for revision;
   * the Art Director creates the visual identity, character portraits and three poster concepts (using the portraits as references). Claude reviews them and picks the strongest, and the title is set as clean vector type.
3. **Greenlight** (`/studio/approvals`): you approve or pass.
4. **Casting:** the Audio Director auditions voices from your ElevenLabs library and builds a pronunciation dictionary. Episode one is commissioned.
5. **Each episode:**
   * outline, then a scene plan whose intensity falls toward sleep;
   * a scene-by-scene first draft;
   * **six parallel editorial reviews** (character, romance, dialogue, continuity, sleep, independent critic), with quoted evidence and fixes;
   * the Creative Director's synthesis, then targeted rewrites, looping up to the revision limit;
   * a final script, with new canon written into the bible;
   * cover concepts and review, plus an audio plan (who speaks each line, ambience layers, music cues) in parallel;
   * multi-voice narration per scene, ambience and music, and an FFmpeg scene stem;
   * a crossfaded master at −24 LUFS / −2 dBTP;
   * a Quality Controller review that can send scenes back for re-voicing or remixing;
   * **your approval**, then release at the scheduled time.
6. **Schedules:** set episodes per week and release days on a greenlit series. The studio commissions each slot at least 36 hours ahead.

## The studio dashboard

| Section | What it's for |
| --- | --- |
| Studio Overview | Active series, episodes in production, spend, approvals, provider status, live activity |
| AI Team | Every agent as a tiny person in their own bedroom. Animations come from real workflow state; click an agent for their task, reasoning, outputs, feedback, history and next handoff |
| Series | Studio originals with full bibles: identity, world, characters with portraits and voices, relationships, season plan, canon, bible history, release schedule, series guidelines |
| Writers' Room | Outlines, scene plans with the intensity curve, every script version with word-level diffs, every critique and revision brief, human editing |
| Art Studio | Posters, portraits, covers, environments and social/promo assets, with Art Director reviews; approve, reject or swap |
| Audio Studio | Casting with audition playback, the pronunciation dictionary, scene stems with QA, re-voice or remix a single scene |
| Production Pipeline | Each workflow's stages, step graph, handoffs, logs, costs and controls (pause, resume, cancel, retry) |
| Approvals | Series greenlights, episodes to publish, artwork sign-off, blocked workflows |
| Analytics | Real listening behaviour (sample data excluded), spend by provider and agent, editorial rounds |
| Settings | Provider connections, models, budgets, revision limits, publishing permissions, every agent's instructions, house writing guidelines and benchmarks |

## Demo accounts (listener app)

| Persona | Access |
| --- | --- |
| Maya Chen | Premium listener |
| Sam Free | Free account (previews only) |
| Calm Editorial | Administrator: studio, approvals, publishing |

The listener catalogue ships with 22 seeded series that play ambience samples labelled "Sample audio". Studio-made episodes play their real mastered audio.

## Documentation

* [`docs/STUDIO_PLAN.md`](docs/STUDIO_PLAN.md): the implementation plan and phases.
* [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): agents, workflow engine, data model, art and audio pipelines, access rules.
* [`docs/INTEGRATIONS.md`](docs/INTEGRATIONS.md): Claude, Nano Banana, ElevenLabs, FFmpeg, Supabase, R2, PostHog, Calm identity.
* [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md): where to run workers, environments, cron, production checklist.

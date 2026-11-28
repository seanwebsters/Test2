# DIRECTION — Find your thing. Build your future.

A mobile-first career discovery app for 16–25 year olds. Think Duolingo-style progression with Spotify-style discovery, plus Scout, a purple explorer mascot who acts as your career companion.

> You don’t have to know what you want to do with your life. You just have to be curious enough to start.

## Run it

```bash
cd direction1
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build
```

It's a static site with no backend and no paid services. **Vercel:** create a project from this repo, set **Root Directory** to `direction1` (Settings → Build and Deployment), and leave the other settings on default; `direction1/vercel.json` sets the Vite build and `dist` output. Progress is saved to `localStorage` under the key `direction-v1`. On Vercel/Netlify, set the root directory to `direction1` and the output directory to `dist`.

## What's inside

| Area | Where |
| --- | --- |
| **Onboarding**: welcome, 13 one-per-screen questions, analysing step, discovery profile | `src/screens/Onboarding.tsx`, `src/data/onboarding.ts` |
| **Journey**: personalised vertical path per world (lessons, simulation, chest, story, landmark), daily quests, weekly challenge, Curiosity Keys | `src/screens/Journey.tsx`, `src/lib/journey.ts` |
| **Explore**: 12 illustrated worlds, a searchable/filterable library of 75 careers, and "Day in the Life" stories | `src/screens/Explore.tsx`, `World.tsx`, `Career.tsx` |
| **Play**: 13 interactive simulations (8 featured) and auto-generated 90-second lessons | `src/sims/*`, `src/screens/SimRunner.tsx`, `src/lib/lessons.ts` |
| **Scout**: contextual chat, clearly labelled as a simulated assistant | `src/screens/ScoutChat.tsx`, `src/lib/scout.ts` |
| **You**: strengths profile, emerging interests, saved careers, goals, roadmap, skill tree, achievement cabinet, wardrobe | `src/screens/You.tsx`, `Roadmap.tsx`, `Achievements.tsx`, `Wardrobe.tsx` |
| **Direction Plus**: £6.99/month or £49.99/year paywall (prototype, no payment taken) that unlocks expert rounds and advanced roadmaps | `src/screens/Plus.tsx` |
| **Partners**: school/employer codes (try `DEMO-SCHOOL`) | `src/data/partners.ts` |

### Simulations
Creative Director (live poster preview), Entrepreneur (£1,000 launch with a demand model and weekly sales chart), Architect (floor-plan builder with budget and client checklist), Film Director (live scene monitor), Lawyer (spot inconsistencies in evidence), Software Developer (robot coding puzzle, MVP builder, debugging), Doctor (history-taking and differentials; educational and fictional), Marketing Director (ad choice and channel budget allocation). Plus Scientist, Ecologist, Sports Coach, Hotel Manager and Electrician.

After every activity you see XP, sparks, level progress, the outcome, skills you showed, feedback on each decision, an enjoyment rating, related careers and your next achievement.

### How personalisation works
`src/lib/recommend.ts` keeps a 12-trait vector plus a per-world affinity score. Onboarding sets the starting values. After that, **rating how much you enjoyed an activity moves recommendations much more than your score does**: "Loved it" pushes the world and the career's traits up, and "Not for me" pulls them down. Saving a career is a small extra signal. Journey order, match percentages, Scout's answers and the roadmap all read from the same state, so they shift together as you explore.

## Content and honesty notes
- **Salaries are illustrative prototype ranges** (`salaryVerified: null`) and are labelled that way in the UI. Set `salaryVerified: { source, date }` on a career once you have checked the figures.
- **Day in the Life episodes are original fictional composites.** They are not real interviews and the UI says so. They are read aloud with the browser's speech synthesis, or shown in read-along mode if speech isn't available.
- **Scout is a simulated assistant.** It uses hand-written guidance plus the user's profile and history, and avoids definitive claims about anyone's potential.

## Extending
All content is typed data: worlds (`data/worlds.ts`), careers (`data/careers*.ts`, using the compact `career()` helper), simulations (`sims/core.ts`, `sims/lite.ts`, whose step types are `choice`, `multi`, `allocate`, `slider`, `spot`, `ask`, `floorplan` and `code`), episodes, quests, achievements and outfits. Add a career and it automatically appears in the library, its world's journey path, lessons and Scout's answers.

All art is custom SVG with no emojis: Scout (`components/Scout.tsx`), a hat system, world guide characters, environment scenes, generated career avatars and a 70+ glyph illustrated icon set (`components/Glyph.tsx`).

# WAG — A little world for your best friend

A cosy, mobile-first game you play with your **real** dog. Every walk, trick and quiet moment together brings your dog's magical floating island to life — and powers **Treasure Trails**, a full Match-3 puzzle game starring your dog.

Built with **React 19 · TypeScript · Vite · Framer Motion**. All art is hand-built SVG (no stock images, no emoji UI).

## Run it

```bash
cd wag
npm install
npm run dev        # http://localhost:5173
```

Production build: `npm run build` (outputs static files to `dist/`). On Vercel/Netlify set the root directory to `wag`, build command `npm run build`, output `dist`.

## The core loop

1. **World** — greet your personalised dog on their island (tap them!).
2. **Adventure** — daily real-world quests chosen for your dog's age and energy, rest days that never break your streak, a walk tracker and Paw Academy.
3. Real life earns puzzle perks: **walks → treasure maps**, **play & rest → bonus moves**, **learning tricks → boosters**, **exploring → bonus trails**.
4. **Play** — Treasure Trails: 30 levels across five territories (Enchanted Meadows, Friendship Forest, Blossom Gardens, Adventure Bay, Snowy Peaks) plus treasure-map bonus trails.
5. Spend stars in **World → Build**: repair the bridge (2★), plant the blossom tree (3★), build the cottage (5★), restore the waterfall (8★), unlock Whispering Woods (15★) and more.
6. **Diary** — every evening your dog writes an illustrated diary entry from the day's activities; a friendship garden grows with milestones.
7. **Friends** — a neighbourhood of islands, gifts, shared adventures and a weekly community challenge.

Puzzles are always playable without any real-world activity, and WAG never rewards over-exercising or penalises rest.

## Treasure Trails (Match-3)

`src/match3/engine.ts` is a complete, pure-function engine: match detection (lines, L/T, 2×2 squares), cascades, gravity with board holes, refills, treasure chests that drop to the bottom, multi-layer "dirt" tiles, valid-move detection, hints and auto-shuffle.

| Match | Creates |
|---|---|
| 4 in a line | **Zoomies** — clears a row or column |
| L or T shape | **Golden Bone** — area blast |
| 5 in a line | **Super Sniffer** — clears every piece of a colour |
| 2×2 square | **Paw Power** — flies to an objective |
| Swap two specials | **Best Friends** combo (cross blasts, mega bombs, colour conversion, paw-carried specials…) |

Your dog sits above the board and reacts: excited on matches, performs learned tricks on combos, celebrates on victory, and is gently encouraging on a loss (unlimited free retries).

## What's real vs simulated

| Working | Simulated (clearly labelled in-app) |
|---|---|
| Profiles & all progress (localStorage) | Location-based discoveries on walks |
| Match-3 engine, 30 levels, stars, boosters | Friends, gifts, community totals |
| Quests, XP, Paw Coins, seeds, inventory | WAG Plus purchase (no payment taken) |
| Island building, decorating, seed garden | Diary text comes from an on-device template engine, not an AI service |
| Optional real GPS distance on walks | |
| On-device photo colour matching for the dog's coat | |
| Shareable diary card images (Web Share / download) | |

## Code map

```
src/
  game/      types, data (quests, items, creatures, projects), academy lessons,
             diary story engine, store (state + actions + persistence)
  match3/    engine.ts (pure Match-3 logic), levels.ts (30 levels + map trails)
  art/       Dog (personalised animated character), Island, Pieces, Decor, Creatures, Icons
  screens/   Onboarding, World, Play, Puzzle, Adventure, Academy, Diary, Friends
  ui/        shared components (tab bar, sheets, reward overlay)
```

# Veloria

*Somewhere between dreams and reality, he's waiting for you.*

A cozy romantasy merge adventure for portrait mobile, built with React,
TypeScript and React Three Fiber.

Each night, a woman falls asleep and wakes in Veloria, a fairytale city
frozen in time for ninety-seven years. Beneath the great clock tower she
meets Lucien Vale, the city's last keeper, who has been trapped there alone
for decades. When their hands touch, the clock begins to tick.

## Play

```bash
npm install
npm run dev
```

Open http://localhost:5174. On a phone, open the network URL Vite prints.

- **Explore**: tap or hold on the ground to walk (WASD or arrow keys on
  desktop). Walk through the small lights to gather them. Tap Lucien to talk.
  Pinch or scroll to zoom.
- **Merge**: tap a generator to make an item (costs one energy). Drag two
  matching items together to merge them. Frosted items are suspended in
  time: merge next to them to wake them. Deliver orders to restore the city.
- **Story**: the storybook, with chapters, page turns and collected letters.
- **Love**: your relationship with Lucien: tiers, what you have learned about
  him, and memories to relive.
- **Satchel**: storage for items, and keepsakes.

Progress saves automatically in the browser.

## What is in this build

- One district: clock tower, town square and fountain, Mrs Hollow's
  bookshop, his mother's garden, a canal and bridge, and the woodland with
  the blossom tree where she wakes.
- The whole of Chapter I, *The City That Never Woke*, and Chapter II, *You
  Came Back*, up to its cliffhanger.
- Five orders, each restoring something with a visible before and after:
  - the clock starts
  - the fountain flows
  - the garden blooms
  - the bookshop lights up
  - the great bell rings
- The city is frozen at first. Petals hang mid-air, a sparrow is stuck
  mid-flight, the water is glass and the clock hands are stopped at a
  quarter past eleven. Each restoration brings it back to life.
- A 7 × 9 merge board with six chains (blooms, clockwork, crystals, keys,
  letters & books, fragments of time) and four generators. Includes energy,
  dewdrops and frozen tiles.
- Branching dialogue that changes his affection for you, gifts, five
  relationship tiers, two unlockable memories and three collectible letters.
- Synthesised ambient music and sound effects (no audio files).

## Code

| Path | What it holds |
| --- | --- |
| `src/game/` | Game logic and data: items, board, quests, story script, layout, the Zustand store with saving, and audio |
| `src/world/` | The 3D scene: environment and sky, buildings, fountain, garden, nature, characters, actors and camera, ambient effects |
| `src/ui/` | The interface: merge screen, storybook, panels and dialogue, SVG item icons, illustrations |

The nature models are from Quaternius' Stylized Nature MegaKit (CC0); see
`public/models/*/LICENSE.txt`. Everything else is drawn or generated in code.

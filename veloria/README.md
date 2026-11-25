# Veloria

*Somewhere between dreams and reality, he's waiting for you.*

A cozy romantasy merge adventure for portrait mobile, built with React and
TypeScript. The town is a layered, hand-painted 2.5D scene.

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
| `src/explore/` | The painted town: walking, camera, characters, restoration blending and animated overlays |
| `src/ui/` | The interface: merge screen, storybook, panels and dialogue, SVG item icons, illustrations |

## Art

All art in `public/art/` (the town in its frozen and living versions,
character sprites and portraits, storybook illustrations, title art and item
icons) was generated with an image model to match the Veloria mockup.

The frozen and living towns are the same painting, and each restoration
blends the living version back in over that area. On top of the painting run
live animations: the clock hands, drifting or suspended petals, fountain
spray, birds, butterflies, lamp glow, bell rings and light orbs.

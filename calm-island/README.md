# Calmlings: Calm Island

A peaceful third-person sandbox. You are a small blue Calmling on a large,
seamless island: a garden, meadows, a forest, a bay, a river, two lakes, a
waterfall, highlands and a mountain. There are no goals and no clock.

Built with Three.js, TypeScript and Vite. Everything in the world is generated
in code at load time; the only binary asset is the music track.

## Play

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:5173 and press **Begin wandering**.

| Key | Action |
| --- | --- |
| Arrow keys (or `W` `A` `S` `D`) | Wander. Keep going and the Calmling breaks into a run |
| `Shift` + arrow keys | Turn and tilt the camera |
| Mouse | Look around (click the view to capture the mouse); wheel zooms |
| `Space` | Hop. Keep holding while falling to glide down under a leaf |
| `B` | Sit down and take three guided deep breaths. Move to stand up |
| `E` | Say hello to a Calmling. Once met, `E` invites them to walk with you (one at a time) or says goodbye |
| `Q` | Near a Calmling you have met: learn the small practice they teach |
| `E` at a garden plot | Plant a seed or water it. Plants grow in real time, even while the game is closed |
| `F` | Beside water: skim a stone and count the skips |
| `K` | Fly a kite |
| `J` | Journal: a gentle list of things to try, ticked off as you do them |
| `E` at a mossy log or a pebble stack | Rest at a viewpoint, or balance another pebble |
| `M` | Map. Mist covers what you have not explored; discovering places and breathing clears it |
| `P` | Photo mode: frame a shot and save it |
| `L` | Calmling log: who you have met, with a photo and what their name means |
| `Esc` | Menu: graphics, music volume, look speed, return to the garden |

On a phone or tablet the game shows on-screen controls instead: a thumb stick
to wander (push gently to walk, fully to run), drag anywhere to look around,
and buttons for Hop, Breathe and Menu.

Walk into deep water and the Calmling floats and swims. Your position, camera
and the places you have discovered are saved in the browser automatically.

If the frame rate stays low for a few seconds the game steps the graphics
preset down by itself. Choosing a preset in the menu turns that off.

## Status

Phase 1 of four is done: the island, the playable Calmling, the camera and
movement, plus saving, a settings menu and background music.

Not built yet (later phases): collectibles, benches, plants
to water, caves, ambient sound effects (wind, water, birds) and a day/night
cycle.

The Calmling is modelled in code to follow the character turnaround sheet. It
is a stand-in: `src/player/CalmlingModel.ts` exposes one `root` object, so an
imported GLB can replace it without touching movement or the camera.

## Development

```bash
npm run typecheck
```

```bash
npm test
```

```bash
npm run build
```

`npm test` runs unit tests on the island generator (spawn point is dry and
flat, the river runs downhill, lakes hold water, paths stay on land).

`npm run smoke` plays the built game in headless Chromium: it walks, runs,
hops, turns the camera, sits to breathe, bumps into a tree, tries to climb a
cliff, swims, and opens the menu,
and fails on any console error. It needs the preview server and Playwright:

```bash
npm i -D playwright && npx playwright install chromium
```

```bash
npm run build && npm run preview
```

```bash
npm run smoke
```

Useful URL parameters: `?quality=low|medium|high` forces a preset and `?test`
disables mouse capture and saving. In the browser console, `__calm.debugState()`
prints position, frame rate and triangle counts, and
`__calm.player.teleport(x, z)` moves the Calmling.

## Code map

```
src/
  main.ts              entry point
  core/
    Game.ts            loading, main loop, settings, saving, region discovery
    Input.ts           keyboard + mouse (pointer lock with a drag fallback)
    Music.ts           seamless looping music via Web Audio
    Breathing.ts       timing of the three-breath exercise
    TouchControls.ts   on-screen thumb stick and buttons for phones
    PostFX.ts          glow, tone mapping and colour grade
    Settings.ts        graphics presets and stored preferences
    Save.ts            local save data
  world/
    islandMap.ts       the island as data: heights, water, paths, biome masks (no Three.js)
    noise.ts           seeded simplex noise
    Terrain.ts         ground mesh and the baked ground-colour texture
    Water.ts           sea, lakes, river and waterfall
    Sky.ts             sky gradient, sun, clouds
    Grass.ts           GPU grass that follows the player and bends around it
    Vegetation.ts      placement of every tree, plant, flower and rock
    plantGeometry.ts   the procedural plant and rock meshes
    Colliders.ts       solid tree trunks and boulders
    Ambient.ts         pollen and birds
  npc/
    roster.ts          the 18 resident Calmlings: looks, homes, name meanings
    Npc.ts             wandering, greeting and following behaviour
  player/
    CalmlingModel.ts   the character mesh, fur and procedural animation
    Player.ts          movement, jumping, swimming, collisions
    CameraRig.ts       third-person camera
  ui/                  menus and HUD
tests/                 island generator unit tests
scripts/smoke.cjs      headless play-through
```

The world layout lives in `islandMap.ts`. Coordinates are metres: `x` east,
`z` south, `y` up, with the garden at the origin. The island is about 800 m
across.

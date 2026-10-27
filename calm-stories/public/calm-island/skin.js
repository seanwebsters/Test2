/* Calm Island – painted art skin.
   Each entry swaps one piece of code-drawn art for an image. Anything not listed keeps the code-drawn art.

   Keys
     "b:<building>"          home, board, plot, teahouse, beehive, florist, coop, bakery, workshop,
                             greenhouse, goatpen, meditation, bathhouse
     "b:lighthouse:<0-3>"    ruined, foundations, lantern room, lit
     "d:<decoration>"        flowerbed, lantern, bench, birdbath, arch, fairylights, mushrooms, umbrella, hammock,
                             bonsai, fountain, cherry, chimepost, crystals, koi, starlantern, cottage, boat
     "tree:<type>"           palm, round, meadow, magic, pine, cherry
     "node:<kind>"           wild, rock, shell, moss, crystal
     "crop:<crop>:<stage>"   stage 0 seed, 1 sprout, 2 growing, 3 ripe
     "sign"                  region signpost

   Fields
     src     image path, relative to this folder (transparent PNG or WebP, cropped tight to the artwork)
     scale   optional; share of the footprint's width the image fills (default 0.86), so art never spills
             onto neighbouring tiles
     lift    optional; how far up the footprint the image's bottom edge sits (default 0.12) */
const SKIN = {
  "b:home": { src: "skin/buildings/home.png" },
  "b:teahouse": { src: "skin/buildings/teahouse.png" },
  "b:bakery": { src: "skin/buildings/bakery.png" },
  "b:florist": { src: "skin/buildings/florist.png" },
  "b:workshop": { src: "skin/buildings/workshop.png" },
  "b:board": { src: "skin/buildings/board.png" },
  "b:coop": { src: "skin/buildings/coop.png" },
  "b:goatpen": { src: "skin/buildings/goatpen.png" },
  "b:greenhouse": { src: "skin/buildings/greenhouse.png" },
  "b:meditation": { src: "skin/buildings/meditation.png" },
  "b:bathhouse": { src: "skin/buildings/bathhouse.png" },
  "b:lighthouse:3": { src: "skin/buildings/lighthouse-3.png" },
  "b:lighthouse:0": { src: "skin/buildings/lighthouse-0.png" },
  "b:lighthouse:1": { src: "skin/buildings/lighthouse-1.png" },
  "b:lighthouse:2": { src: "skin/buildings/lighthouse-2.png" },
  "tree:palm": { src: "skin/trees/palm.png" },
  "tree:round": { src: "skin/trees/round.png" },
  "tree:magic": { src: "skin/trees/magic.png" },
  "tree:pine": { src: "skin/trees/pine.png" },
  "tree:cherry": { src: "skin/trees/cherry.png" },
  "d:cherry": { src: "skin/trees/cherry.png" },
  "tree:meadow": { src: "skin/trees/meadow.png" },
  "node:wild": { src: "skin/nature/wild.png" },
  "node:rock": { src: "skin/nature/rock.png", scale: 0.8 },
  "node:shell": { src: "skin/nature/shell.png", scale: 0.55 },
  "b:beehive": { src: "skin/buildings/beehive.png" },
  "node:moss": { src: "skin/nature/moss.png", scale: 0.8 },
  "node:crystal": { src: "skin/nature/crystal.png", scale: 0.7 },
  "d:crystals": { src: "skin/nature/crystal.png" },
  "sign": { src: "skin/nature/sign.png", scale: 0.7 },
  "d:flowerbed": { src: "skin/decor/flowerbed.png" },
  "d:lantern": { src: "skin/decor/lantern.png" },
  "d:bench": { src: "skin/decor/bench.png" },
  "d:birdbath": { src: "skin/decor/birdbath.png" },
  "d:arch": { src: "skin/decor/arch.png" },
  "d:fairylights": { src: "skin/decor/fairylights.png" },
  "d:mushrooms": { src: "skin/decor/mushrooms.png" },
  "d:umbrella": { src: "skin/decor/sunshade.png" },
  "d:hammock": { src: "skin/decor/hammock.png" },
  "d:cottage": { src: "skin/decor/cottage.png" },
  "d:fountain": { src: "skin/decor/fountain.png" },
  "d:chimepost": { src: "skin/decor/chimepost.png" },
  "d:koi": { src: "skin/decor/koi.png" },
  "d:starlantern": { src: "skin/decor/starlantern.png" },
  "d:boat": { src: "skin/decor/boat.png" },
  "d:bonsai": { src: "skin/decor/bonsai.png" },
};

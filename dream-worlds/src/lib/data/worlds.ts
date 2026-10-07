import type { IPWorld } from "../types";

export const worlds: IPWorld[] = [
  {
    id: "starlight-armada",
    partnerId: "nova-pictures",
    title: "Starlight Armada",
    tagline: "Drift between distant suns",
    genre: "Cinematic space",
    description:
      "A fleet of silent starships charting the quiet edge of the galaxy, where ancient lighthouses still blink for travellers who never arrived.",
    lore:
      "The Armada carries no weapons. Its crews are cartographers, gardeners and listeners. They follow the Lumen Gate's faint signal toward places no map has named, returning lost things to where they belong.",
    loreDocuments: ["lore-armada-canon", "lore-armada-voice"],
    allowedThemes: ["cozy", "adventure", "mystery", "epic", "nostalgic", "very-sleepy", "funny"],
    characterIds: ["star-admiral", "kestrel-vane", "archive", "tomas-ri"],
    locations: [
      { id: "bridge", name: "The Observation Bridge", description: "a long curved window where the stars move slowly past", calm: 0.6 },
      { id: "lumen-gate", name: "The Lumen Gate", description: "an ancient ring of pale light hanging in the dark", calm: 0.4 },
      { id: "orchard-deck", name: "The Orchard Deck", description: "a garden under glass where moon-pears ripen in starlight", calm: 0.9 },
      { id: "nebula-sea", name: "The Violet Nebula", description: "a slow tide of lilac dust that sounds like rain on a hull", calm: 0.85 },
    ],
    sounds: [
      { id: "hull-hum", name: "Hull hum", layers: ["low engine hum", "soft ventilation", "distant chimes"] },
      { id: "nebula-rain", name: "Nebula rain", layers: ["particle rain on glass", "deep space drone"] },
    ],
    visualStyle: { scene: "space", palette: ["#03050f", "#0d1438", "#2a2f7a", "#7fb2ff", "#c9a7ff"], mood: "vast, cool, reverent" },
    contentRestrictions: ["No space combat", "No alien threat", "No loss of crew"],
    popularity: 98,
  },
  {
    id: "moonlit-academy",
    partnerId: "oakhollow",
    title: "Moonlit Academy",
    tagline: "Where the library never sleeps",
    genre: "Magical university",
    description:
      "An old university of spells and secret corridors on a lake that reflects a second moon. Lamps light themselves when you whisper.",
    lore:
      "Magic at the Academy only works when it is used kindly. The Night Library rearranges itself after midnight, and the moon-reflection on the lake is said to be a door that opens once a year.",
    loreDocuments: ["lore-academy-canon"],
    allowedThemes: ["cozy", "mystery", "funny", "romantic", "nostalgic", "very-sleepy", "adventure"],
    characterIds: ["professor-quill", "wren-ashby", "the-librarian", "felix-marsh"],
    locations: [
      { id: "night-library", name: "The Night Library", description: "towering shelves that whisper and rearrange after midnight", calm: 0.75 },
      { id: "astronomy-tower", name: "The Astronomy Tower", description: "a round room of brass telescopes and cold sweet air", calm: 0.7 },
      { id: "common-room", name: "The Lantern Common Room", description: "deep armchairs, a crackling fire and a sleeping cat", calm: 0.95 },
      { id: "moon-lake", name: "The Mirror Lake", description: "still black water holding two moons", calm: 0.9 },
    ],
    sounds: [
      { id: "fire-pages", name: "Fire & pages", layers: ["crackling fire", "turning pages", "rain on leaded windows"] },
      { id: "tower-wind", name: "Tower wind", layers: ["soft wind", "distant bell", "owl calls"] },
    ],
    visualStyle: { scene: "academy", palette: ["#07061a", "#1b1440", "#3a2a6a", "#ecc98a", "#a99cf0"], mood: "candlelit, scholarly, intimate" },
    contentRestrictions: ["No dark magic", "No exam stress", "No one is ever expelled"],
    popularity: 95,
  },
  {
    id: "endless-seas",
    partnerId: "harbourlight",
    title: "The Endless Seas",
    tagline: "Sail by lantern light",
    genre: "Pirate voyage",
    description:
      "Tall ships, mysterious islands and soft storms that always pass. Sailors navigate by lanterns left glowing in island windows.",
    lore:
      "The Endless Seas have no edge. Beyond the Lantern Isles lies the Quiet Water, where the sea is so still it reflects tomorrow's stars. Every crew is a family, and treasure is usually something you didn't know you'd lost.",
    loreDocuments: ["lore-seas-canon"],
    allowedThemes: ["cozy", "adventure", "mystery", "funny", "romantic", "epic", "nostalgic", "very-sleepy"],
    characterIds: ["sea-captain", "ilo-navigator", "old-barnaby", "marisol-reyes"],
    locations: [
      { id: "lantern-isles", name: "The Lantern Isles", description: "a scatter of islands with a candle in every window", calm: 0.7 },
      { id: "the-deck", name: "The Midnight Deck", description: "wet timber, creaking rope and a sky full of stars", calm: 0.65 },
      { id: "quiet-water", name: "The Quiet Water", description: "a sea so still it holds the sky like a mirror", calm: 0.98 },
      { id: "captains-cabin", name: "The Captain's Cabin", description: "a swaying lamp, old charts and a warm wool blanket", calm: 0.9 },
    ],
    sounds: [
      { id: "night-sea", name: "Night sea", layers: ["slow waves on hull", "creaking timber", "rope and sail"] },
      { id: "soft-storm", name: "Soft storm", layers: ["distant thunder", "rain on canvas", "wind in rigging"] },
    ],
    visualStyle: { scene: "sea", palette: ["#040a14", "#0b2236", "#1f4a63", "#f2d49b", "#7fd0d8"], mood: "salt, lantern, wide horizons" },
    contentRestrictions: ["No one lost at sea", "No sword fights", "No plunder"],
    popularity: 97,
  },
  {
    id: "emerald-kingdom",
    partnerId: "oakhollow",
    title: "Emerald Kingdom",
    tagline: "A city spun from green glass",
    genre: "Enchanted kingdom",
    description:
      "A glittering kingdom of witches and glass towers, where friendship is a kind of magic and the roads hum softly underfoot.",
    lore:
      "The witches of the Emerald Kingdom keep the city lit with spells woven into its glass. Every spire glows a different shade of green, and at night the whole city breathes light in and out, slowly, like a sleeper.",
    loreDocuments: ["lore-emerald-canon"],
    allowedThemes: ["cozy", "adventure", "funny", "romantic", "epic", "nostalgic", "very-sleepy", "mystery"],
    characterIds: ["sorrel-greenwitch", "queen-alder", "tin-sentinel"],
    locations: [
      { id: "glass-city", name: "The Glass City", description: "spires of green glass breathing light", calm: 0.6 },
      { id: "poppy-fields", name: "The Poppy Meadows", description: "endless soft fields that make everyone yawn", calm: 0.97 },
      { id: "witch-garden", name: "The Witch's Garden", description: "a walled garden where teapots grow on vines", calm: 0.85 },
    ],
    sounds: [
      { id: "glass-chimes", name: "Glass chimes", layers: ["wind chimes", "soft hum of the city", "crickets"] },
    ],
    visualStyle: { scene: "kingdom", palette: ["#03100c", "#0a2a24", "#16483d", "#9be3b8", "#ecc98a"], mood: "luminous, emerald, enchanted" },
    contentRestrictions: ["No wicked witches", "No curses that harm"],
    popularity: 90,
  },
  {
    id: "blocklands",
    partnerId: "brickwork",
    title: "Blocklands",
    tagline: "Build something beautiful before bed",
    genre: "Building & exploration",
    description:
      "A gentle world made of blocks where everything you build stays built, and every lantern you place becomes a star.",
    lore:
      "In the Blocklands, the world remembers who placed each block. At night, the villagers light their windows one by one and the whole map becomes a constellation of tiny homes.",
    loreDocuments: ["lore-blocks-canon"],
    allowedThemes: ["cozy", "adventure", "funny", "mystery", "very-sleepy", "nostalgic"],
    characterIds: ["pip-builder", "bramble-golem", "nell-cartographer"],
    locations: [
      { id: "hill-village", name: "Lanternhill Village", description: "tiny houses with glowing square windows", calm: 0.85 },
      { id: "crystal-caves", name: "The Crystal Caves", description: "caverns of softly glowing blue blocks", calm: 0.7 },
      { id: "cloud-farm", name: "The Cloud Farm", description: "a farm floating above the world, growing sleepy wheat", calm: 0.95 },
    ],
    sounds: [
      { id: "village-night", name: "Village night", layers: ["crickets", "soft block placing", "distant water"] },
    ],
    visualStyle: { scene: "blocks", palette: ["#041312", "#0c2a2a", "#174a42", "#f5d27a", "#4fbf9f"], mood: "diorama, warm windows, tilt-shift" },
    contentRestrictions: ["No monsters", "Nothing is ever destroyed"],
    popularity: 88,
  },
  {
    id: "stadium-nights",
    partnerId: "pitchside",
    title: "Stadium Nights",
    tagline: "The floodlights, after the final whistle",
    genre: "Football",
    description:
      "Iconic stadiums, legendary matches and the hum of a crowd you can still hear long after everyone's gone home.",
    lore:
      "Ashford Rovers and the Harbour City Mariners have played 112 times. On quiet nights the old stadium replays its favourite moments in the mist over the pitch, and the groundskeeper swears the echoes still sing.",
    loreDocuments: ["lore-stadium-canon"],
    allowedThemes: ["cozy", "nostalgic", "epic", "very-sleepy", "funny"],
    characterIds: ["the-gaffer", "number-nine", "groundskeeper-ada", "booth-voice"],
    locations: [
      { id: "empty-stadium", name: "The Old Ground at Midnight", description: "floodlights humming over a misty, empty pitch", calm: 0.8 },
      { id: "dressing-room", name: "The Home Dressing Room", description: "pegs, folded shirts and the smell of liniment", calm: 0.75 },
      { id: "terrace", name: "The North Terrace", description: "thousands of empty seats, echoes of old songs", calm: 0.7 },
      { id: "trophy-room", name: "The Trophy Room", description: "glass cases holding a century of memories", calm: 0.9 },
    ],
    sounds: [
      { id: "distant-crowd", name: "Distant crowd", layers: ["far-off crowd hum", "floodlight buzz", "net rustle"] },
      { id: "rainy-ground", name: "Rain on the stands", layers: ["rain on roof", "sprinklers", "quiet wind"] },
    ],
    visualStyle: { scene: "stadium", palette: ["#03070f", "#0a1730", "#173156", "#e9e2c9", "#7fb2ff"], mood: "floodlit haze, nostalgic, communal" },
    contentRestrictions: ["No real clubs or players", "No injuries", "No hostility between fans"],
    usageRules: { allowedTones: ["cozy", "nostalgic", "epic", "very-sleepy", "funny"] },
    crossover: { crossoverAllowed: false },
    popularity: 86,
  },
  {
    id: "aurora-line",
    partnerId: "calm-studios",
    title: "The Aurora Line",
    tagline: "A sleeper train beneath the northern lights",
    genre: "Night journey",
    description:
      "A sleeper train that only runs at night, following ribbons of aurora across snowfields to stations lit by a single lamp.",
    lore:
      "The Aurora Line has no timetable you can read in daylight. Passengers are given a ticket with a station that doesn't exist yet, and arrive exactly when they're ready.",
    loreDocuments: ["lore-aurora-canon"],
    allowedThemes: ["cozy", "mystery", "romantic", "nostalgic", "very-sleepy", "adventure"],
    characterIds: ["conductor-ferro", "ines-snowfield"],
    locations: [
      { id: "sleeper-car", name: "The Sleeper Carriage", description: "pressed linen, a brass lamp and snow passing the window", calm: 0.97 },
      { id: "dining-car", name: "The Dining Car", description: "cocoa, quiet cutlery and aurora light on the tablecloths", calm: 0.8 },
      { id: "snow-station", name: "Fjellhavn Halt", description: "a tiny station with one lamp and falling snow", calm: 0.9 },
    ],
    sounds: [{ id: "rails", name: "Night rails", layers: ["rhythmic rails", "soft carriage sway", "wind over snow"] }],
    visualStyle: { scene: "train", palette: ["#02070d", "#07202a", "#0f3a45", "#9be3c7", "#c9a7ff"], mood: "snowfields, aurora, warm carriages" },
    contentRestrictions: ["No breakdowns or danger"],
    isNew: true,
    isOriginal: true,
    popularity: 80,
  },
  {
    id: "glasshouse-gardens",
    partnerId: "calm-studios",
    title: "The Glasshouse Gardens",
    tagline: "Flowers that only bloom after dark",
    genre: "Botanical calm",
    description:
      "Victorian conservatories glowing in the night, full of plants that open slowly and hum as they bloom.",
    lore:
      "The Gardens were planted by a botanist who could not sleep. She grew flowers that sing a little lullaby when they open, and now they bloom for anyone who visits after dark.",
    loreDocuments: ["lore-glasshouse-canon"],
    allowedThemes: ["cozy", "mystery", "romantic", "nostalgic", "very-sleepy", "funny"],
    characterIds: ["moss-gardener", "lumen-moth"],
    locations: [
      { id: "palm-house", name: "The Palm House", description: "a great glass dome, warm and humid and green", calm: 0.9 },
      { id: "moon-pond", name: "The Lily Pond", description: "wide pale lilies opening one by one", calm: 0.98 },
    ],
    sounds: [{ id: "greenhouse", name: "Greenhouse night", layers: ["dripping water", "soft humming blooms", "rain on glass"] }],
    visualStyle: { scene: "garden", palette: ["#030b08", "#0a1f19", "#163a2c", "#f0d9a0", "#b7a6ff"], mood: "humid, glowing, botanical" },
    contentRestrictions: ["No poisonous plants", "No getting lost"],
    isNew: true,
    isOriginal: true,
    popularity: 77,
  },
];

export const worldById = (id: string) => worlds.find((w) => w.id === id);

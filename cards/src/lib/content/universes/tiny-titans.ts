import type { UniverseSource } from "../types";

export const tinyTitans: UniverseSource = {
  slug: "tiny-titans",
  title: "Tiny Titans",
  tagline: "The humans left. The tiny ones stayed.",
  premise:
    "When the last humans moved out of Wexley Lane, they left behind a whole world: a house of canyon-sized staircases, carpet prairies and a refrigerator that still hums like a god. Now the creatures who live in the skirting boards are building a civilisation out of everything we forgot.",
  synopsis:
    "Thimble is a field-mouse cartographer with a bottle-cap shield and an ambition the size of the attic. When the Great Fridge stops humming for the first time in living memory, she leads a ragtag crew up the Staircase Wilds to find out why — and discovers that the house is not as empty as everyone believed.",
  genres: ["cosy", "adventure", "creatures"],
  audience: "8–35. Families, cosy-game players, and anyone who ever wondered what lives behind the fridge.",
  differentiation:
    "Tactile miniature world-building: every location is a real household object at heroic scale, so every card is a tiny diorama.",
  style: {
    artStyle: "macro",
    displayFont: "fredoka",
    palette: {
      bg: "#1e1a14",
      surface: "#2e271d",
      accent: "#f2b544",
      accent2: "#6cc3a0",
      ink: "#fff4dc",
      art: ["#e86a4a", "#f2b544", "#6cc3a0", "#4d7ea8"],
    },
    lighting: "Warm window-light from far above, dust motes, shallow depth of field like a macro lens.",
    characterRules:
      "Creatures wear and wield found objects (bottle caps, buttons, thimbles, paperclips). Big expressive eyes, felt and fur textures, no human-made clothing at their own scale.",
    frameStyle: "Stitched fabric borders with button rivets in the corners.",
    logoDirection: "Chunky rounded letters built from stacked household objects; the 'i's are dotted with buttons.",
    keyArtPrompt:
      "A field mouse with a bottle-cap shield standing on a staircase step like a cliff edge, a vast sunlit living room beyond, dust motes, macro photography, miniature diorama, warm and charming",
  },
  world: {
    history:
      "The humans left twelve winters ago in a great thundering of boxes. The creatures who stayed called it the Leaving and began the slow work of turning a house into a homeland.",
    geography:
      "Ground Floor: the Carpet Prairies, the Kitchen Badlands and the Great Fridge. Above: the Staircase Wilds, the Bathroom Lagoon and the forbidden Attic. Beneath everything: the Pipeworks.",
    rules: [
      "Nothing human-made may be broken — only repurposed.",
      "The Great Fridge's hum is sacred; it means the house is still alive.",
      "Never climb above the seventh stair after dark.",
    ],
    culture:
      "Barter economy of crumbs, buttons and string. Clans are named for what they collect. Stories are told by the light of a forgotten nightlight.",
    mythology:
      "The Fridge is the heart of the house. Some believe the humans will one day return; others pray they never do.",
    conflicts: [
      "The Button Clans and the Pipe Rats dispute the warm spot behind the boiler.",
      "Something in the Attic has started collecting creatures.",
    ],
    locations: [
      { id: "great-fridge", name: "The Great Fridge", description: "A humming monolith. Its light is the closest thing to a sun." },
      { id: "staircase-wilds", name: "The Staircase Wilds", description: "Fourteen cliffs of carpeted stone." },
      { id: "attic", name: "The Attic", description: "Forbidden. Dusty. Occupied." },
    ],
    secrets: ["The Fridge stopped humming because someone unplugged it — from the inside of the walls.", "One human never left."],
  },
  factions: [
    { id: "button-clans", name: "The Button Clans", motto: "Hold it together.", description: "Mice who trade and fasten; the house's diplomats.", color: "#f2b544" },
    { id: "pipe-rats", name: "The Pipe Rats", motto: "Down is where the warm is.", description: "Plumbing engineers of the Pipeworks.", color: "#6cc3a0" },
    { id: "dust-court", name: "The Dust Court", motto: "Everything settles.", description: "Mysterious beetles who keep the house's forgotten things.", color: "#b48ad8" },
  ],
  characters: [
    { id: "thimble", name: "Thimble", role: "lead", title: "Cartographer of the Lane", factionId: "button-clans", bio: "A field mouse who maps the house one room at a time.", personality: "Bold, bossy, quietly anxious, never without a pencil stub.", motivation: "To map the Attic and prove the house is bigger than anyone believes.", visual: "Thimble helmet, bottle-cap shield, a pencil-stub spear and a map scroll.", arc: "Learns that leading isn't about knowing the way.", relationships: [{ to: "gristle", type: "ally", note: "Her reluctant bodyguard." }, { to: "lady-lint", type: "rival", note: "Lint thinks maps are vulgar." }] },
    { id: "gristle", name: "Gristle", role: "lead", title: "Pipe-Rat Engineer", factionId: "pipe-rats", bio: "A grumpy rat who can fix anything with a paperclip.", personality: "Gruff, loyal, secretly a poet.", motivation: "To restart the Fridge before the Pipeworks freeze.", visual: "Tool-belt of paperclips, one cracked monocle lens, a scarf made from a sock.", arc: "From loner to guardian of the whole crew.", relationships: [{ to: "thimble", type: "ally", note: "Pretends not to like her." }] },
    { id: "lady-lint", name: "Lady Lint", role: "supporting", title: "Duchess of the Dryer", factionId: "button-clans", bio: "A pampered hamster who rules the laundry room.", personality: "Vain, dramatic, unexpectedly brave.", motivation: "Comfort. Then glory. Then more comfort.", visual: "A gown of fluffy lint, earring of a sequin, perpetually staticky fur.", arc: "Discovers that heroism is a fashion statement too.", relationships: [{ to: "thimble", type: "rival", note: "Will deny ever helping her." }] },
    { id: "spindle", name: "Spindle", role: "supporting", title: "Spider Archivist", factionId: "dust-court", bio: "A soft-spoken spider who records every event in silk.", personality: "Patient, precise, a terrible liar.", motivation: "To keep the house's history intact.", visual: "Eight tiny reading spectacles, silk scrolls draped on her back.", arc: "Must decide whether to reveal the Dust Court's secret.", relationships: [{ to: "the-collector", type: "mystery", note: "She knows what's in the Attic." }] },
    { id: "pip-and-pop", name: "Pip & Pop", role: "supporting", title: "Bubble Snails", factionId: "pipe-rats", bio: "Twin snails who live in the bathroom lagoon and talk in unison.", personality: "Cheerful, chaotic, unreasonably optimistic.", motivation: "Snacks. Adventure. In that order.", visual: "Shells made from old shampoo caps, rainbow slime trails.", arc: "Comic relief who save the day exactly once.", relationships: [] },
    { id: "the-collector", name: "The Collector", role: "antagonist", title: "Something in the Attic", factionId: "dust-court", bio: "A shape among the boxes that keeps whatever it finds.", personality: "Unknown.", motivation: "To complete its collection.", visual: "Only seen as two glinting button eyes in the dark.", arc: "Is revealed to be very, very lonely.", relationships: [] },
  ],
  seasons: [
    { number: 1, title: "The Fridge Falls Silent", synopsis: "The heart of the house stops. A tiny crew climbs.", releaseOffsetDays: -60, plannedEpisodes: 12 },
    { number: 2, title: "The Garden Beyond", synopsis: "The back door opens, and the world gets much, much bigger.", releaseOffsetDays: 20, plannedEpisodes: 10 },
  ],
  setName: "The Fridge Falls Silent",
  setCode: "TTN",
  cards: [
    ["Thimble", "character", "rare", "button-clans", "Cartographer of Wexley Lane.", "Her map of the ground floor took two winters and seventeen pencil stubs. She has redrawn the kitchen four times out of pride.", "thimble"],
    ["Gristle", "character", "uncommon", "pipe-rats", "He can fix anything with a paperclip.", "Gristle writes poetry on the inside of pipe insulation. Nobody has ever found it. He makes sure of that.", "gristle"],
    ["The Great Fridge", "location", "rare", "", "A humming monolith; the heart of the house.", "For twelve winters its hum has been the sound of safety. Tonight, for the first time, it is silent."],
    ["Bottle-Cap Shield", "object", "common", "button-clans", "Standard armour of the Button Clans.", "The best shields come from fizzy drinks; the ridges deflect a cat's claw — mostly."],
    ["The Carpet Prairies", "location", "common", "", "Endless rolling fibres. Easy to get lost in.", "Herds of dust-bunnies migrate across the prairies each spring, following the vacuum's old routes from memory."],
    ["Crumb Caravan", "event", "common", "button-clans", "The weekly trade run across the kitchen.", "A good caravan can carry half a biscuit. A legendary one once carried a whole cracker, and songs are still sung about it."],
    ["Lady Lint", "character", "uncommon", "button-clans", "Duchess of the Dryer.", "Lady Lint has never been seen without static in her fur. She considers it a crown.", "lady-lint"],
    ["Pip & Pop", "character", "common", "pipe-rats", "Bubble snails who speak in unison.", "They finish each other's sentences. Occasionally they start each other's, too.", "pip-and-pop"],
    ["The Bathroom Lagoon", "location", "uncommon", "pipe-rats", "A turquoise sea behind the bath panel.", "The lagoon tastes faintly of lavender. Its tides are controlled by a dripping tap nobody can reach."],
    ["Paperclip Grapple", "object", "common", "pipe-rats", "Gristle's favourite invention.", "Unbent, it is a hook. Bent back, it's a rope. Bent wrongly, it's a story about falling."],
    ["The Staircase Wilds", "location", "rare", "", "Fourteen carpeted cliffs.", "Each stair has a name. The seventh is called Never-After-Dark, and everyone obeys it."],
    ["Spindle", "character", "rare", "dust-court", "Archivist of the Dust Court.", "Her silk scrolls record everything that happens in the house — including things that haven't happened yet.", "spindle"],
    ["Dust-Bunny Herd", "creature", "common", "", "Fluffy, harmless, enormous.", "Dust-bunnies have no eyes but excellent manners. They part politely for travellers."],
    ["The Nightlight Moon", "location", "common", "", "A plug-in moon on the landing.", "It glows a gentle blue all night. Creatures gather beneath it to tell stories and pretend they're outside."],
    ["Button Council", "event", "uncommon", "button-clans", "Where clan disputes are settled.", "Votes are cast by placing a button on a spool. Two-holed buttons count once. Four-holed buttons count twice. Nobody remembers why."],
    ["The Fridge Goes Silent", "moment", "epic", "", "The night the hum stopped.", "Every creature in the house woke at once. The quiet was so loud that even the dust stopped settling."],
    ["Thimble's Map", "artifact", "epic", "button-clans", "The most complete map of the house ever drawn.", "The last corner, labelled ATTIC, is blank except for a small, careful drawing of two button eyes.", "thimble"],
    ["Attic Hatch", "location", "uncommon", "dust-court", "Forbidden. Closed. Breathing.", "The hatch is outlined in a thin line of light, as though someone up there has a lamp."],
    ["The Lost Toy Soldier", "character", "legendary", "", "A human toy that walks on its own.", "Green plastic, one foot glued to a base. He has been patrolling the landing for twelve years, waiting for orders that never came."],
    ["The Collector", "secret", "mythic", "dust-court", "Something in the Attic is collecting.", "Glinting button eyes. A box labelled MINE. Inside, every creature who ever climbed past the seventh stair — safe, sleeping and very well dusted.", "the-collector"],
    ["Pipe-Rat Workshop", "location", "common", "pipe-rats", "The warmest room in the walls.", "It smells of solder and toast. Gristle refuses to say where the toast comes from."],
    ["Sock Scarf", "object", "common", "", "Gristle's most treasured possession.", "It once belonged to a child. Gristle says it still smells like bedtime."],
    ["The Back Door", "location", "epic", "", "Something beyond the house.", "Light under the door. Wind under the door. And, once, a footprint the size of a city."],
    ["The Last Human", "secret", "legendary", "", "One of them never left.", "They are very old, and very quiet, and they have been leaving thimbles on the stairs for twelve years."],
  ],
  episodes: [
    { title: "Silence in the Kitchen", synopsis: "The Great Fridge stops humming. Thimble volunteers to find out why.", body: [
      "The hum had been there before Thimble was born, the way the floor had been there, or the dark. So when it stopped, she didn't notice at first. She noticed the creatures noticing — whiskers lifting all along the skirting board, a pause in the clatter of the Crumb Caravan, the dust-bunnies on the Carpet Prairies drifting to a halt.",
      "'The heart's stopped,' whispered Old Button, and the whole kitchen went cold.",
      "Gristle came up out of the Pipeworks with a paperclip in his teeth and frost on his whiskers. 'It's not broken,' he said. 'Somebody turned it off. And the wire runs up.'",
      "Up meant the Staircase Wilds. Up meant past the seventh stair. Thimble unrolled her map, looked at the blank space marked ATTIC, and heard herself say: 'I'll go.'",
    ], characterIds: ["thimble", "gristle"], cards: [1, 2, 3, 4, 5, 6], releaseOffsetDays: -60, cliffhanger: "The wire leads all the way to the Attic hatch — and the hatch is warm." },
    { title: "The Duchess of the Dryer", synopsis: "To climb, the crew needs rope. Only Lady Lint has any.", body: [
      "Lady Lint received them in the laundry room, reclining on a heap of warm fluff with the air of a queen receiving peasants. 'String,' she said. 'You want my string.'",
      "'We want to save the house,' said Thimble.",
      "'Everyone says that.' Lint examined a sequin. 'But fine. I'll lend you the string. On one condition: I'm coming. If anyone's going to be heroic in this house, it should be someone who looks good doing it.'",
      "Down in the bath panel, Pip & Pop had already packed. Nobody had invited them. Nobody ever did. 'We'll bring snacks,' they said together, and somehow that settled it.",
    ], characterIds: ["lady-lint", "pip-and-pop", "thimble"], cards: [7, 8, 9, 10], releaseOffsetDays: -52 },
    { title: "Never After Dark", synopsis: "The Staircase Wilds. The seventh stair. The dark.", access: { type: "collect", cards: 5 }, body: [
      "Climbing the stairs took all day. Each step was a cliff, and each cliff had its own weather: the fourth was always draughty, the fifth smelled of old perfume, the sixth had a single forgotten penny the size of a dance floor.",
      "They reached the seventh as the window-light faded. The Nightlight Moon flickered on. And there, on the edge of the step, stood a green plastic soldier with one foot glued to a base, saluting.",
      "'Identify yourselves,' he said. He hadn't spoken in twelve years, and his voice cracked like an old toy. 'Nobody passes the seventh after dark. Orders.'",
      "'Whose orders?' Thimble asked. The soldier opened his mouth, closed it, and for the first time in twelve years, didn't know.",
    ], characterIds: ["thimble", "gristle", "spindle"], cards: [11, 12, 13, 14, 15], releaseOffsetDays: -45 },
    { title: "Two Button Eyes", synopsis: "The crew reaches the Attic hatch. Something is waiting.", access: { type: "shards", cost: 40 }, body: [
      "Spindle met them on the landing, her silk scrolls trembling. 'I wrote this,' she said, showing Thimble a strand. It described the Fridge going silent — and it was dated three winters ago. 'The Dust Court has known for a long time. We were told not to say.'",
      "The hatch was outlined in warm light. As they watched, it lifted, just a crack, and two button eyes glinted out of the dark.",
      "'Oh,' said a voice, soft and delighted. 'More of you. You'll complete the set.'",
      "Thimble raised her bottle-cap shield. Behind her, Gristle tightened the paperclip grapple. And Lady Lint, to everyone's astonishment, stepped forward first.",
    ], characterIds: ["spindle", "the-collector", "lady-lint", "thimble"], cards: [16, 17, 18, 19, 20], releaseOffsetDays: -38, cliffhanger: "Inside the Attic: every creature who ever went missing — fast asleep." },
    { title: "The Box Marked MINE", synopsis: "Inside the Attic, a collection that should not exist.", body: [
      "The Attic was not frightening. That was the frightening part. It was tidy. Every box was labelled, every shelf dusted, and on the highest shelf sat a shoebox marked MINE in careful letters, warm with the glow of a tiny lamp.",
      "Inside, curled on cotton wool, slept every creature who had ever climbed past the seventh stair. They looked well-fed. They looked safe. They looked, Thimble realised, collected.",
      "'I only wanted company,' said the Collector, and the button eyes came closer.",
    ], characterIds: ["the-collector", "thimble"], cards: [21, 22], releaseOffsetDays: 3 },
    { title: "Footprints Under the Door", synopsis: "The Back Door opens a crack. The house is not the whole world.", access: { type: "collect", cards: 12 }, body: [
      "When the Fridge hummed back to life, the house sang. But Thimble was not listening. She was looking at the Back Door, where a line of green light leaked beneath the frame, and where, pressed into the dust, was a footprint the size of a city.",
      "Behind her, on the stairs, someone very old and very quiet left a thimble on the seventh step, and smiled.",
    ], characterIds: ["thimble", "gristle"], cards: [23, 24], releaseOffsetDays: 8, cliffhanger: "Season 2: The Garden Beyond." },
  ],
  extras: [
    { kind: "diary", title: "Gristle's Insulation Poems", body: ["The pipes are cold tonight. / The mouse with the map is braver than me. / Don't tell her. / Don't tell anyone. / Fix the pipes."], requirement: { type: "own-card", cardId: "tiny-titans-s1-002" } },
    { kind: "history", title: "The Leaving", body: ["The humans left in a single afternoon. Boxes thundered down the stairs like landslides. When the door closed, the creatures waited three days before anyone dared to come out. The first to step onto the open carpet was Thimble's grandmother. She lasted four seconds before running back, and it is still considered the bravest thing anyone has ever done."], requirement: { type: "own-count", count: 8 } },
    { kind: "secret-lore", title: "What the Dust Court Keeps", body: ["The Dust Court are not archivists. They are caretakers. They keep the house exactly as the humans left it, because they believe the humans will return — and the beetles intend to be found doing a very good job."], requirement: { type: "faction-complete", factionId: "dust-court" } },
  ],
  launchOffsetDays: -60,
  editorial: { staffPick: true },
  demoMetrics: { followers: 241800, collectors: 132500, packsOpened: 1980000, growth: 0.09, rating: 4.9 },
  upcoming: [
    { name: "The Garden Gate", kind: "location", rarity: "rare", description: "The first step outside.", releaseOffsetDays: 20 },
    { name: "Queen of the Compost", kind: "character", rarity: "legendary", description: "She rules everything that rots, beautifully.", releaseOffsetDays: 22 },
  ],
};

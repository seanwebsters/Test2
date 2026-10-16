/**
 * Prototype catalogue. Loaded into the database on first run (local store)
 * or exported to SQL via `npm run db:seed-sql`. UI components never import
 * this file – they read records from the database.
 */
import type { Genre, SceneKind, SoundLayer } from "@/lib/types";

export interface SeedCreator {
  key: string;
  username: string;
  display_name: string;
  email: string;
  bio: string;
  is_official: boolean;
  hue: number;
}

export const SEED_CREATORS: SeedCreator[] = [
  {
    key: "calm",
    username: "calm-originals",
    display_name: "Calm Originals",
    email: "originals@calm.example",
    bio: "Sleep Stories written, voiced and produced by the Calm editorial team.",
    is_official: true,
    hue: 250,
  },
  {
    key: "iris",
    username: "iris-vale",
    display_name: "Iris Vale",
    email: "iris@example.com",
    bio: "Romantasy for the last hour of the day. Former bookseller, permanent night owl.",
    is_official: false,
    hue: 290,
  },
  {
    key: "marcus",
    username: "marcus-lune",
    display_name: "Marcus Lune",
    email: "marcus@example.com",
    bio: "Slow science fiction. Long journeys, quiet stations, kind machines.",
    is_official: false,
    hue: 210,
  },
  {
    key: "hana",
    username: "hana-okafor",
    display_name: "Hana Okafor",
    email: "hana@example.com",
    bio: "Mysteries with no villains, only puzzles and pots of tea.",
    is_official: false,
    hue: 30,
  },
  {
    key: "elodie",
    username: "elodie-frost",
    display_name: "Élodie Frost",
    email: "elodie@example.com",
    bio: "Coastal towns, letters, lighthouses and second chances.",
    is_official: false,
    hue: 190,
  },
  {
    key: "sol",
    username: "sol-ramirez",
    display_name: "Sol Ramirez",
    email: "sol@example.com",
    bio: "New creator. Writing the deserts and night markets I grew up dreaming about.",
    is_official: false,
    hue: 40,
  },
  {
    key: "quiet",
    username: "the-quiet-company",
    display_name: "The Quiet Company",
    email: "hello@quiet.example",
    bio: "A small collective making nature journeys for tired minds.",
    is_official: false,
    hue: 140,
  },
];

export interface SeedSoundscape {
  slug: string;
  name: string;
  description: string;
  layers: SoundLayer[];
}

export const SEED_SOUNDSCAPES: SeedSoundscape[] = [
  { slug: "gentle-rain", name: "Gentle Rain", description: "Soft rain on leaves and rooftops.", layers: [{ kind: "rain", gain: 0.8 }, { kind: "pad", gain: 0.2 }] },
  { slug: "forest-night", name: "Forest at Night", description: "Crickets, a hush of leaves, a distant stream.", layers: [{ kind: "forest", gain: 0.7 }, { kind: "stream", gain: 0.3 }] },
  { slug: "ocean-waves", name: "Ocean Waves", description: "Slow waves rolling onto a sandy shore.", layers: [{ kind: "ocean", gain: 0.85 }] },
  { slug: "fireplace", name: "Fireplace", description: "A crackling hearth in a quiet room.", layers: [{ kind: "fire", gain: 0.75 }, { kind: "pad", gain: 0.15 }] },
  { slug: "distant-thunder", name: "Distant Thunder", description: "Rain with far-off, rolling thunder.", layers: [{ kind: "rain", gain: 0.6 }, { kind: "thunder", gain: 0.5 }] },
  { slug: "space-ambience", name: "Space Ambience", description: "A deep, slow drone among the stars.", layers: [{ kind: "space", gain: 0.8 }, { kind: "pad", gain: 0.3 }] },
  { slug: "soft-wind", name: "Soft Wind", description: "Breeze over open hills and through tall grass.", layers: [{ kind: "wind", gain: 0.8 }] },
  { slug: "night-village", name: "Nighttime Village", description: "Crickets, a far-off bell, the hush of a sleeping town.", layers: [{ kind: "village", gain: 0.7 }, { kind: "wind", gain: 0.2 }] },
];

export interface SeedSeries {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  genre: Genre;
  tags: string[];
  creator: string;
  scene: SceneKind;
  palette: [string, string, string, string];
  soundscape: string;
  trending: number;
  popularity: number;
  /** Days ago that the series launched. */
  launched_days_ago: number;
  seasons: { title: string; synopsis: string; episodes: [string, string][] }[];
}

export const SEED_SERIES: SeedSeries[] = [
  {
    slug: "the-moonlit-kingdom",
    title: "The Moonlit Kingdom",
    tagline: "Two rival courts. One enchanted night that never quite ends.",
    description:
      "In the kingdom of Aurelune, the moon never fully sets. When Princess Seraphine is sent to the silver court of her family's oldest rivals, she expects cold halls and colder hearts. Instead she finds Corin, a quiet cartographer mapping the paths of falling stars, and a palace where every corridor leads somewhere softer than the last.",
    genre: "Sleep Romantasy",
    tags: ["romance", "royalty", "enchanted", "slow-burn"],
    creator: "calm",
    scene: "kingdom",
    palette: ["#0b1640", "#2a2f6b", "#c9b8ff", "#f6e7b8"],
    soundscape: "soft-wind",
    trending: 98,
    popularity: 97,
    launched_days_ago: 60,
    seasons: [
      {
        title: "The Silver Court",
        synopsis: "Seraphine arrives at the silver court and discovers the moon has a memory.",
        episodes: [
          ["The Long Road to Aurelune", "A carriage ride through blue meadows brings Seraphine to the gates of the silver court."],
          ["The Cartographer's Tower", "Unable to sleep, Seraphine follows candlelight to a tower full of star maps."],
          ["Lanterns on the Lake", "The court releases paper lanterns, and Corin explains what each one carries."],
          ["The Moon Garden", "A hidden garden blooms only in moonlight, tended by an old gardener with a secret."],
          ["A Waltz Without Music", "At the midwinter ball the musicians fall silent, and the dancers keep time with the stars."],
          ["The Map of Falling Stars", "Corin shows Seraphine the map he has kept since childhood, and one star is missing."],
          ["Snow on the Silver Bridge", "The first snow arrives, and the two rival families share a quiet supper."],
          ["What the Moon Remembers", "Seraphine learns why the moon never sets over Aurelune."],
        ],
      },
      {
        title: "The Winter Accord",
        synopsis: "An old treaty, a frozen river, and two courts learning to trust one another.",
        episodes: [
          ["The Frozen River", "The river between the kingdoms freezes, and skaters cross it for the first time in a century."],
          ["Letters Under the Door", "Seraphine and Corin exchange letters through the long winter nights."],
          ["The Library of Treaties", "An archivist leads them to a treaty written in starlight ink."],
          ["The Night Market at the Border", "Both courts gather at a lantern-lit market on the frozen river."],
        ],
      },
    ],
  },
  {
    slug: "a-cabin-in-the-pines",
    title: "A Cabin in the Pines",
    tagline: "A remote mountain village. A gentle mystery. A kettle always on.",
    description:
      "Retired librarian Agnes Thorne moves into a cabin above the village of Larch Hollow, where small mysteries unfold as quietly as the snow. A missing music box, an unsigned letter, a light in the old observatory – each night brings one more gentle puzzle and one more cup of tea.",
    genre: "Cosy Mystery",
    tags: ["mystery", "village", "winter", "tea"],
    creator: "hana",
    scene: "cabin",
    palette: ["#0c1b33", "#2c3f5e", "#f2c58a", "#ffe8c2"],
    soundscape: "fireplace",
    trending: 91,
    popularity: 88,
    launched_days_ago: 42,
    seasons: [
      {
        title: "Larch Hollow",
        synopsis: "Agnes settles into village life, one small mystery at a time.",
        episodes: [
          ["The Key Under the Mat", "Agnes arrives at the cabin to find a key that fits no door."],
          ["The Music Box", "A music box goes missing from the village shop, and a melody drifts from the woods."],
          ["Footprints in Fresh Snow", "Prints lead from the bakery to the frozen pond and simply stop."],
          ["The Unsigned Letter", "A letter arrives addressed to the cabin's previous owner, forty years too late."],
          ["Light in the Observatory", "Someone has been visiting the abandoned observatory on clear nights."],
          ["The Quilt with a Pattern", "A quilt at the winter fair hides a map stitched in thread."],
        ],
      },
    ],
  },
  {
    slug: "starlight-express",
    title: "Starlight Express",
    tagline: "A sleeper train between peaceful planets.",
    description:
      "The Starlight Express leaves the station at Halcyon every evening and arrives somewhere new by morning. Conductor Juno Pell walks its quiet carriages, checking tickets, pouring cocoa and pointing out the sights: rings of ice, forests of glass, oceans the colour of lavender.",
    genre: "Sci-Fi & Space",
    tags: ["space", "train", "journey", "planets"],
    creator: "marcus",
    scene: "space",
    palette: ["#050b24", "#1d1f55", "#8bd3ff", "#ffd6f5"],
    soundscape: "space-ambience",
    trending: 89,
    popularity: 90,
    launched_days_ago: 75,
    seasons: [
      {
        title: "The Outer Line",
        synopsis: "The night train's longest route, from Halcyon to the ringed world of Vella.",
        episodes: [
          ["Departure from Halcyon", "Passengers board the Starlight Express as the station lights dim."],
          ["The Glass Forest of Ione", "The train passes through a forest that chimes when the wind blows."],
          ["Cocoa in the Observation Car", "Juno shares the story of the train's first conductor."],
          ["The Rings of Vella", "Ice rings catch the light of a distant sun."],
          ["The Lavender Sea", "The train crosses a bridge over a slow, glowing sea."],
          ["The Station at the Edge", "A tiny station where no one boards, but someone always waves."],
          ["Morning on Meridian", "The train arrives at a planet where morning lasts a week."],
        ],
      },
    ],
  },
  {
    slug: "the-secret-garden-nights",
    title: "The Secret Garden",
    tagline: "A walled garden with a new discovery every night.",
    description:
      "Behind an ivy-covered door in the grounds of an old manor lies a garden that changes every night. Clara, the new gardener's apprentice, keeps a journal of what she finds: a pond full of reflected stars, a rose that hums, a path that only appears after rain.",
    genre: "Magical Worlds",
    tags: ["garden", "magic", "discovery", "nature"],
    creator: "calm",
    scene: "garden",
    palette: ["#0d1f2b", "#244a46", "#f5b8c8", "#e6f7c9"],
    soundscape: "forest-night",
    trending: 86,
    popularity: 93,
    launched_days_ago: 120,
    seasons: [
      {
        title: "The Ivy Door",
        synopsis: "Clara discovers the garden and begins her night journal.",
        episodes: [
          ["The Ivy Door", "Clara finds a door hidden behind a curtain of ivy."],
          ["The Pond of Stars", "A still pond reflects stars that aren't in the sky."],
          ["The Humming Rose", "One rose hums a lullaby when the moon is full."],
          ["The Path After Rain", "A stone path appears only after a summer shower."],
          ["The Sundial at Midnight", "A sundial that tells time by moonlight."],
          ["The Gardener's Journal", "Clara finds the journal of the garden's first keeper."],
        ],
      },
    ],
  },
  {
    slug: "letters-from-lumen",
    title: "Letters from Lumen",
    tagline: "A gentle romance, told in letters, in a coastal town.",
    description:
      "When Nell inherits her grandmother's bookshop in the seaside town of Lumen, she finds a bundle of unsent letters tucked into the poetry shelf. Each one is addressed to the lighthouse keeper. And the lighthouse keeper, it turns out, is still there.",
    genre: "Coastal Romance",
    tags: ["romance", "letters", "seaside", "bookshop"],
    creator: "elodie",
    scene: "coast",
    palette: ["#0a1a33", "#27446b", "#ffcf9e", "#bfe3ff"],
    soundscape: "ocean-waves",
    trending: 84,
    popularity: 85,
    launched_days_ago: 35,
    seasons: [
      {
        title: "The Bookshop by the Harbour",
        synopsis: "Nell opens the shop, finds the letters, and meets the keeper of the light.",
        episodes: [
          ["The Bell Above the Door", "Nell opens the bookshop for the first time in a decade."],
          ["The Poetry Shelf", "Between two volumes of Keats, a bundle of letters tied with blue ribbon."],
          ["The Keeper of the Light", "Nell walks the cliff path to deliver the first letter."],
          ["Tea at Low Tide", "A picnic on the sand while the sea pulls back."],
          ["The Storm Letter", "A letter written on the night of the great storm."],
          ["Lamps Along the Harbour", "The town lights its harbour lamps for the summer festival."],
        ],
      },
    ],
  },
  {
    slug: "the-floating-library",
    title: "The Floating Library",
    tagline: "A library that drifts between worlds.",
    description:
      "The Floating Library sails between fantastical worlds, lending books to anyone who needs a story. Its librarian, the unflappable Mr. Quill, has catalogued every shelf but one. Each night the library docks somewhere new, and someone comes aboard with a question only a book can answer.",
    genre: "Magical Worlds",
    tags: ["library", "books", "worlds", "whimsy"],
    creator: "calm",
    scene: "library",
    palette: ["#120f2e", "#3a2b5e", "#f3c77a", "#ffe9b8"],
    soundscape: "fireplace",
    trending: 88,
    popularity: 91,
    launched_days_ago: 90,
    seasons: [
      {
        title: "Ports of Call",
        synopsis: "The library docks in six worlds and lends six very particular books.",
        episodes: [
          ["Boarding the Library", "A young traveller climbs a rope ladder into the clouds."],
          ["The Port of Paper Cranes", "A city where every message is folded into a bird."],
          ["The Uncatalogued Shelf", "Mr. Quill admits there is one shelf he has never read."],
          ["The Island of Clocks", "On an island where time runs slowly, a clockmaker borrows a book about patience."],
          ["The Reading Room in the Rain", "The library sails through a storm and everyone reads by lamplight."],
          ["The Book That Wrote Back", "A book begins answering the questions written in its margins."],
          ["Harbour of Lanterns", "The library docks for the night at a harbour of floating lanterns."],
        ],
      },
    ],
  },
  {
    slug: "the-lantern-keepers-daughter",
    title: "The Lantern Keeper's Daughter",
    tagline: "She lights the lanterns. He guards the forest border.",
    description:
      "Every dusk, Wren lights the lanterns that line the border of the Thornwood. Every dawn, a knight from the forest court extinguishes them. When a lantern refuses to go out, the two finally meet – and find the forest has been waiting for them.",
    genre: "Sleep Romantasy",
    tags: ["romance", "forest", "fae", "lanterns"],
    creator: "iris",
    scene: "forest",
    palette: ["#071a1f", "#1b3b3a", "#ffc46b", "#d6ffe7"],
    soundscape: "forest-night",
    trending: 82,
    popularity: 74,
    launched_days_ago: 21,
    seasons: [
      {
        title: "The Border Lanterns",
        synopsis: "Wren and Ash meet at the edge of the Thornwood.",
        episodes: [
          ["Dusk at the Thornwood", "Wren lights the hundred lanterns along the forest's edge."],
          ["The Lantern That Would Not Go Out", "One lantern burns through the dawn."],
          ["A Knight Made of Moss and Silver", "Ash of the forest court arrives to investigate."],
          ["Tea Beneath the Old Oak", "An uneasy truce over a pot of nettle tea."],
          ["The Fireflies' Debt", "The fireflies explain why they've been keeping the lantern lit."],
        ],
      },
    ],
  },
  {
    slug: "the-tidewater-inn",
    title: "The Tidewater Inn",
    tagline: "An inn at the end of a causeway, open only at low tide.",
    description:
      "The Tidewater Inn can only be reached when the tide is out. Its guests arrive with the evening mist and leave before the sea returns. Innkeeper Marguerite keeps the fires lit and the soup warm, and never asks where anyone is going.",
    genre: "Cosy Mystery",
    tags: ["inn", "sea", "mystery", "cosy"],
    creator: "elodie",
    scene: "ocean",
    palette: ["#081428", "#1f3a5c", "#ffd59a", "#a8d8ff"],
    soundscape: "ocean-waves",
    trending: 70,
    popularity: 72,
    launched_days_ago: 50,
    seasons: [
      {
        title: "Low Tide",
        synopsis: "Guests come and go, each leaving something behind.",
        episodes: [
          ["Across the Causeway", "A traveller arrives just before the tide turns."],
          ["The Guest in Room Seven", "A guest who signs the register with a drawing of a whale."],
          ["Soup for a Stormy Night", "Marguerite's recipe, and the story behind it."],
          ["The Forgotten Umbrella", "An umbrella left behind leads to a decades-old love story."],
          ["Lights on the Water", "Strange lights drift across the bay at midnight."],
          ["The Last Guest of Autumn", "The inn closes for winter, but one guest remains."],
        ],
      },
    ],
  },
  {
    slug: "orbit-of-quiet",
    title: "Orbit of Quiet",
    tagline: "Life aboard a gentle research station orbiting a sleeping gas giant.",
    description:
      "Dr. Ama Reyes is the night-shift botanist aboard Halcyon Station, a research ring orbiting the slow, banded giant Thessaly. While the crew sleeps, she tends the hydroponic gardens, talks with the station's soft-spoken AI, and watches storms drift across the planet below.",
    genre: "Sci-Fi & Space",
    tags: ["space station", "AI", "botany", "slow sci-fi"],
    creator: "marcus",
    scene: "space",
    palette: ["#060a1e", "#24224f", "#ffb38a", "#c7d8ff"],
    soundscape: "space-ambience",
    trending: 77,
    popularity: 79,
    launched_days_ago: 100,
    seasons: [
      {
        title: "Night Shift",
        synopsis: "Ama's quiet hours aboard the station.",
        episodes: [
          ["The Garden Ring", "Ama begins her shift among the sleeping tomato vines."],
          ["A Conversation with Wren", "The station AI asks Ama what dreaming feels like."],
          ["Storm on Thessaly", "A storm the size of a continent drifts by the observation window."],
          ["The Seed Vault", "Ama catalogues seeds from forty different worlds."],
          ["The Long Eclipse", "The station passes into the planet's shadow for six slow hours."],
          ["Letters Home", "Ama records a message for her sister on Earth."],
        ],
      },
    ],
  },
  {
    slug: "the-clockmakers-snow",
    title: "The Clockmaker's Snow",
    tagline: "A winter village where every clock tells a different story.",
    description:
      "In the alpine village of Uhrenfeld, the old clockmaker has repaired every clock but his own. As the first snow falls, his apprentice Lotte begins to discover that each clock in the village keeps a memory of the hour it was made.",
    genre: "Gentle Adventure",
    tags: ["winter", "village", "clocks", "craft"],
    creator: "calm",
    scene: "village",
    palette: ["#0a1631", "#2b3f66", "#ffd28a", "#eaf2ff"],
    soundscape: "night-village",
    trending: 74,
    popularity: 81,
    launched_days_ago: 140,
    seasons: [
      {
        title: "First Snow",
        synopsis: "Lotte learns the clockmaker's craft as the village is snowed in.",
        episodes: [
          ["The Workshop on Glockengasse", "Lotte begins her apprenticeship on the first snowy morning."],
          ["The Bakery Clock", "A clock that smells faintly of cinnamon."],
          ["The Clock in the Church Tower", "Lotte climbs the tower to repair the village's oldest clock."],
          ["A Pocket Watch for the Postman", "The postman's watch has been running backwards for years."],
          ["The Clockmaker's Own Clock", "At last, the clock that has never been repaired."],
        ],
      },
    ],
  },
  {
    slug: "dunes-of-the-silver-caravan",
    title: "Dunes of the Silver Caravan",
    tagline: "A night caravan crossing a desert of singing sand.",
    description:
      "Every year the Silver Caravan crosses the Sabra Desert by night, guided by the songs the dunes sing as they cool. Young navigator Tariq joins for the first time, learning to read the stars, the wind and the quiet stories of his fellow travellers.",
    genre: "Gentle Adventure",
    tags: ["desert", "caravan", "stars", "journey"],
    creator: "sol",
    scene: "desert",
    palette: ["#0c1033", "#3c2c5c", "#ffcf87", "#ffe9c4"],
    soundscape: "soft-wind",
    trending: 79,
    popularity: 58,
    launched_days_ago: 9,
    seasons: [
      {
        title: "The Crossing",
        synopsis: "Tariq's first crossing of the Sabra Desert.",
        episodes: [
          ["The Oasis of Departure", "The caravan gathers at the last oasis before the sands."],
          ["When the Dunes Sing", "As the sand cools, the dunes begin their low, humming song."],
          ["The Star Compass", "An old navigator teaches Tariq to steer by the stars."],
          ["The Night Market of Qamar", "A market that appears for one night in the middle of the desert."],
        ],
      },
    ],
  },
  {
    slug: "under-the-northern-lights",
    title: "Under the Northern Lights",
    tagline: "A snow-bound village beneath the aurora.",
    description:
      "In the far-north village of Kaldvik, winter means months of night and skies that ripple with green and violet light. Sisters Elin and Saga run the village's only guesthouse, welcoming travellers who have come to see the aurora and stay for the stillness.",
    genre: "Nature & Journeys",
    tags: ["aurora", "snow", "north", "village"],
    creator: "quiet",
    scene: "aurora",
    palette: ["#03101f", "#0e2f45", "#7dffc8", "#c7a6ff"],
    soundscape: "soft-wind",
    trending: 81,
    popularity: 77,
    launched_days_ago: 30,
    seasons: [
      {
        title: "Polar Night",
        synopsis: "The guesthouse's winter season under the aurora.",
        episodes: [
          ["The Last Sunset", "The sun sets for the final time until spring."],
          ["Reindeer at the Gate", "A herd passes through the village at midnight."],
          ["The Sauna by the Fjord", "Steam rises into the starlit cold."],
          ["Green Fire", "The brightest aurora in a decade."],
          ["The Ice Fishing Hut", "A long, patient night on the frozen fjord."],
        ],
      },
    ],
  },
  {
    slug: "the-glass-city-of-meridia",
    title: "The Glass City of Meridia",
    tagline: "A peaceful future city where the night is never dark, only soft.",
    description:
      "Meridia is a city of glass towers and hanging gardens, where trams glide silently and the streets glow a gentle blue after midnight. Night-tram driver Kenji Hal carries the city's late travellers home, one quiet stop at a time.",
    genre: "Sci-Fi & Space",
    tags: ["future city", "tram", "night", "gentle"],
    creator: "marcus",
    scene: "city",
    palette: ["#071230", "#1b2c5e", "#7fe0ff", "#ffc6e8"],
    soundscape: "gentle-rain",
    trending: 72,
    popularity: 70,
    launched_days_ago: 65,
    seasons: [
      {
        title: "The Night Line",
        synopsis: "Kenji's passengers and their quiet journeys home.",
        episodes: [
          ["Last Tram from the Garden District", "The final tram of the night leaves under hanging gardens."],
          ["The Passenger with the Cello", "A musician rides to the end of the line."],
          ["Rain on Glass", "The whole city hums softly in the rain."],
          ["The Sky Bridge", "The tram crosses the highest bridge in Meridia at 3 a.m."],
          ["The Depot at Dawn", "Kenji's shift ends as the towers catch first light."],
        ],
      },
    ],
  },
  {
    slug: "the-willow-lake-house",
    title: "The Willow Lake House",
    tagline: "A summer house on a still mountain lake.",
    description:
      "Every summer, the Ashby family returns to the old house on Willow Lake. This year, grown-up siblings June and Theo come back alone, rowing out at dusk, swimming at night, and remembering the summers that made them who they are.",
    genre: "Nature & Journeys",
    tags: ["lake", "summer", "family", "nostalgia"],
    creator: "quiet",
    scene: "lake",
    palette: ["#0b1a36", "#2d4870", "#ffb48a", "#d2f0ff"],
    soundscape: "forest-night",
    trending: 68,
    popularity: 73,
    launched_days_ago: 80,
    seasons: [
      {
        title: "Summer Again",
        synopsis: "June and Theo spend one last summer at the lake house.",
        episodes: [
          ["The Road Through the Pines", "The long drive up the mountain at dusk."],
          ["The Rowing Boat", "The old boat still floats, just about."],
          ["Night Swimming", "Stars above and stars reflected below."],
          ["The Attic Trunk", "A trunk of old photographs and summer letters."],
          ["Thunder Over the Water", "A summer storm rolls across the lake."],
          ["The Last Morning", "Mist rises from the water as they close up the house."],
        ],
      },
    ],
  },
  {
    slug: "the-hearthstone-bakery",
    title: "The Hearthstone Bakery",
    tagline: "A bakery that opens at midnight for those who can't sleep.",
    description:
      "In a crooked town of cobblestones and chimneys, the Hearthstone Bakery opens its doors at midnight. Baker Rosalind kneads dough and listens to the town's night-wanderers, each of whom leaves with a warm loaf and a lighter heart.",
    genre: "Cosy Mystery",
    tags: ["bakery", "night", "town", "comfort"],
    creator: "hana",
    scene: "village",
    palette: ["#140f2a", "#3b2d4f", "#ffbf73", "#fff0d1"],
    soundscape: "night-village",
    trending: 76,
    popularity: 69,
    launched_days_ago: 18,
    seasons: [
      {
        title: "Midnight Loaves",
        synopsis: "The bakery's night customers and the small mysteries they bring.",
        episodes: [
          ["The Midnight Bell", "Rosalind turns the sign to 'open' as the clock strikes twelve."],
          ["The Night Watchman's Order", "Always rye, always two, but he lives alone."],
          ["The Missing Recipe Card", "Rosalind's grandmother's recipe has vanished from its tin."],
          ["Flour in the Snow", "A trail of flour leads to an unexpected visitor."],
          ["Bread for the Lighthouse", "A delivery to the coast by lantern-light."],
        ],
      },
    ],
  },
  {
    slug: "the-cloud-shepherd",
    title: "The Cloud Shepherd",
    tagline: "High in the mountains, someone tends the clouds.",
    description:
      "Above the valley of Halde, young Pim inherits the strangest job in the world: shepherding clouds. With a crook, a whistle, and an old dog named Barley, Pim guides the clouds to where the rain is needed and tucks them into the mountain hollows each night.",
    genre: "Magical Worlds",
    tags: ["mountains", "clouds", "whimsy", "coming of age"],
    creator: "quiet",
    scene: "aurora",
    palette: ["#0c1838", "#3d4f84", "#ffd3e6", "#e8f1ff"],
    soundscape: "soft-wind",
    trending: 73,
    popularity: 66,
    launched_days_ago: 14,
    seasons: [
      {
        title: "The High Pastures",
        synopsis: "Pim learns to shepherd the mountain's clouds.",
        episodes: [
          ["The Crook and the Whistle", "Pim's grandmother hands over the shepherd's tools."],
          ["A Stubborn Cumulus", "One cloud refuses to leave the meadow."],
          ["Rain for the Orchard", "Pim leads the clouds to a thirsty valley."],
          ["Barley's Old Tricks", "The old dog knows more about clouds than anyone."],
        ],
      },
    ],
  },
  {
    slug: "the-salt-and-honey-hotel",
    title: "The Salt & Honey Hotel",
    tagline: "A faded seaside hotel, a summer of slow romance.",
    description:
      "Rosa takes a summer job at the Salt & Honey, a once-grand seaside hotel that has seen better days. Between polishing brass and serving afternoon tea, she meets Ellis, the quiet gardener restoring its overgrown terrace.",
    genre: "Coastal Romance",
    tags: ["romance", "hotel", "summer", "seaside"],
    creator: "elodie",
    scene: "coast",
    palette: ["#0c1734", "#3b4a7a", "#ffc79e", "#ffe6c9"],
    soundscape: "ocean-waves",
    trending: 71,
    popularity: 64,
    launched_days_ago: 12,
    seasons: [
      {
        title: "High Season",
        synopsis: "Rosa's summer at the Salt & Honey.",
        episodes: [
          ["The Brass Bell", "Rosa's first day at the faded hotel."],
          ["The Overgrown Terrace", "Ellis is restoring a garden no one has seen in years."],
          ["Afternoon Tea in the Rain", "A downpour drives all the guests into the conservatory."],
          ["The Ballroom by Candlelight", "The old ballroom is opened for one night only."],
        ],
      },
    ],
  },
  {
    slug: "the-fox-and-the-firefly-court",
    title: "The Fox and the Firefly Court",
    tagline: "A clever fox, a court of fireflies, and an enchanted meadow.",
    description:
      "In a meadow where fireflies hold court each summer night, a clever fox named Sorrel is appointed Royal Advisor. There are disputes to settle, festivals to plan and a very small queen who cannot bear to see anyone sad.",
    genre: "Magical Worlds",
    tags: ["animals", "meadow", "fable", "summer"],
    creator: "iris",
    scene: "forest",
    palette: ["#081a24", "#1e3d3f", "#fff08a", "#d9ffd2"],
    soundscape: "forest-night",
    trending: 65,
    popularity: 61,
    launched_days_ago: 28,
    seasons: [
      {
        title: "The Summer Court",
        synopsis: "Sorrel's first season as Royal Advisor.",
        episodes: [
          ["The Royal Appointment", "Sorrel is summoned to the court beneath the elder tree."],
          ["The Dispute of the Two Snails", "Two snails both claim the same mossy stone."],
          ["The Festival of Glow", "The fireflies plan their brightest night of the year."],
          ["The Queen's Lullaby", "Even the smallest queen needs help falling asleep."],
        ],
      },
    ],
  },
  {
    slug: "voyage-of-the-sleepwhale",
    title: "Voyage of the Sleepwhale",
    tagline: "Riding across a dreaming ocean on the back of a gentle giant.",
    description:
      "Once every hundred years the Sleepwhale surfaces and carries a single passenger across the Dreaming Sea. This time it is Ottilie, a lighthouse keeper's granddaughter, who climbs aboard with a satchel of maps and a jar of honey.",
    genre: "Gentle Adventure",
    tags: ["ocean", "whale", "voyage", "dreams"],
    creator: "calm",
    scene: "ocean",
    palette: ["#05122b", "#163a63", "#a9e4ff", "#ffe4f2"],
    soundscape: "ocean-waves",
    trending: 87,
    popularity: 84,
    launched_days_ago: 55,
    seasons: [
      {
        title: "The Dreaming Sea",
        synopsis: "Ottilie's voyage across the Dreaming Sea.",
        episodes: [
          ["The Whale Surfaces", "At dawn, a mountain rises out of the sea and opens one kind eye."],
          ["The Archipelago of Bells", "Islands that ring softly as the tide moves around them."],
          ["Phosphor Night", "The sea glows blue in the whale's wake."],
          ["The Floating Market", "Boats tied together into a market in the middle of the ocean."],
          ["The Whale's Song", "Ottilie learns what the Sleepwhale has been singing all along."],
          ["The Far Shore", "Land at last, and a gentle goodbye."],
        ],
      },
    ],
  },
  {
    slug: "the-observatory-on-wren-hill",
    title: "The Observatory on Wren Hill",
    tagline: "An astronomer, an old telescope and a sky full of stories.",
    description:
      "Retired astronomer Professor Halloway invites the village to his hilltop observatory every clear night. Each visit he points the brass telescope at a different corner of the sky and tells the story of what he sees there.",
    genre: "Nature & Journeys",
    tags: ["stars", "astronomy", "storytelling", "hills"],
    creator: "quiet",
    scene: "kingdom",
    palette: ["#060d26", "#1c2a57", "#e0d2ff", "#fff3d6"],
    soundscape: "night-village",
    trending: 62,
    popularity: 68,
    launched_days_ago: 110,
    seasons: [
      {
        title: "Clear Nights",
        synopsis: "A season of constellations and stories.",
        episodes: [
          ["The Brass Telescope", "The professor uncovers the old telescope for the season."],
          ["The Seven Sisters", "The story of the Pleiades, told under a frosty sky."],
          ["The Andromeda Light", "Light that left its home before the first humans walked the Earth."],
          ["A Comet Comes Home", "A comet returns after seventy-six years."],
        ],
      },
    ],
  },
  {
    slug: "the-teahouse-at-the-end-of-the-rain",
    title: "The Teahouse at the End of the Rain",
    tagline: "A mountain teahouse that only appears during the monsoon.",
    description:
      "High on a misty mountain path, a teahouse appears only when it rains. Its keeper, Mei, brews a different tea for every traveller who shelters there, and each cup brings back a memory they had almost forgotten.",
    genre: "Magical Worlds",
    tags: ["rain", "tea", "mountains", "memory"],
    creator: "sol",
    scene: "lake",
    palette: ["#0a1830", "#284660", "#c9f0d2", "#ffe6c4"],
    soundscape: "gentle-rain",
    trending: 78,
    popularity: 55,
    launched_days_ago: 6,
    seasons: [
      {
        title: "Monsoon",
        synopsis: "Travellers shelter at the teahouse through the rainy season.",
        episodes: [
          ["The Path in the Mist", "A traveller finds a teahouse where none was the day before."],
          ["The Jasmine Cup", "A tea that smells of a childhood garden."],
          ["The Postwoman's Rest", "The mountain postwoman stops for her usual cup."],
        ],
      },
    ],
  },
  {
    slug: "the-cartographers-apprentice",
    title: "The Cartographer's Apprentice",
    tagline: "Mapping a gentle, unexplored world one valley at a time.",
    description:
      "Ada joins the Royal Cartographic Expedition as its youngest member, tasked with mapping the uncharted Verdant Reach. With an ink-stained notebook and a patient mule named Clementine, she maps rivers, valleys and the quiet villages no one has ever written down.",
    genre: "Gentle Adventure",
    tags: ["maps", "expedition", "nature", "discovery"],
    creator: "iris",
    scene: "lake",
    palette: ["#0e1b2f", "#2f4a52", "#ffd9a0", "#e6ffe0"],
    soundscape: "forest-night",
    trending: 60,
    popularity: 52,
    launched_days_ago: 4,
    seasons: [
      {
        title: "The Verdant Reach",
        synopsis: "Ada's first expedition into the unmapped valleys.",
        episodes: [
          ["Ink and Compass", "The expedition sets off from the capital at dusk."],
          ["The River with No Name", "Ada names her first river."],
          ["The Village in the Valley", "A village that has never been on any map."],
        ],
      },
    ],
  },
];

/** Listener accounts used for demos. */
export const SEED_LISTENERS = [
  { username: "maya", display_name: "Maya Chen", email: "maya@example.com", hue: 330, plan: "premium" as const },
  { username: "visitor-free", display_name: "Sam Free", email: "sam@example.com", hue: 120, plan: "free" as const },
];

export const SEED_ADMINS = [{ username: "calm-editor", display_name: "Calm Editorial", email: "editorial@calm.example", hue: 260 }];

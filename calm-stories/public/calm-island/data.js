/* Calm Island – game data: items, crops, buildings, decorations, Calmlings, regions and the 12 levels. */
"use strict";

const ITEMS = {
  // crops
  strawberry: { name: "Strawberry", value: 3, kind: "crop" },
  carrot: { name: "Carrot", value: 4, kind: "crop" },
  tea: { name: "Tea Leaves", value: 5, kind: "crop" },
  lavender: { name: "Lavender", value: 6, kind: "crop" },
  sunflower: { name: "Sunflower", value: 7, kind: "crop" },
  chamomile: { name: "Chamomile", value: 8, kind: "crop" },
  mint: { name: "Mint", value: 9, kind: "crop" },
  rose: { name: "Rose", value: 12, kind: "crop" },
  pumpkin: { name: "Pumpkin", value: 14, kind: "crop" },
  starbloom: { name: "Starbloom", value: 25, kind: "crop" },
  // animal goods
  honey: { name: "Honey", value: 12, kind: "animal" },
  egg: { name: "Egg", value: 8, kind: "animal" },
  milk: { name: "Goat Milk", value: 14, kind: "animal" },
  // gathered
  wood: { name: "Wood", value: 2, kind: "gather" },
  stone: { name: "Stone", value: 3, kind: "gather" },
  fibre: { name: "Fibre", value: 2, kind: "gather" },
  coconut: { name: "Coconut", value: 6, kind: "gather" },
  shell: { name: "Seashell", value: 7, kind: "gather" },
  moss: { name: "Moonmoss", value: 6, kind: "gather" },
  crystal: { name: "Crystal", value: 15, kind: "gather" },
  // crafted
  herbaltea: { name: "Herbal Tea", value: 16, kind: "craft" },
  honeylavtea: { name: "Honey Lavender Tea", value: 40, kind: "craft" },
  chamomiletea: { name: "Chamomile Tea", value: 28, kind: "craft" },
  minttea: { name: "Mint Tea", value: 30, kind: "craft" },
  sunbouquet: { name: "Sunflower Bouquet", value: 28, kind: "craft" },
  lavbouquet: { name: "Lavender Bouquet", value: 30, kind: "craft" },
  rosebouquet: { name: "Rose Bouquet", value: 48, kind: "craft" },
  wreath: { name: "Starbloom Wreath", value: 90, kind: "craft" },
  tart: { name: "Strawberry Tart", value: 30, kind: "craft" },
  honeybun: { name: "Honey Bun", value: 35, kind: "craft" },
  carrotcake: { name: "Carrot Cake", value: 50, kind: "craft" },
  pumpkinpie: { name: "Pumpkin Pie", value: 65, kind: "craft" },
  basket: { name: "Woven Basket", value: 18, kind: "craft" },
  candle: { name: "Lavender Candle", value: 40, kind: "craft" },
  chime: { name: "Wind Chime", value: 30, kind: "craft" },
  herbbundle: { name: "Herb Bundle", value: 40, kind: "craft" },
  orchid: { name: "Potted Orchid", value: 36, kind: "craft" },
  bathsalts: { name: "Bath Salts", value: 45, kind: "craft" },
};

// time in seconds
const CROPS = {
  strawberry: { lvl: 1, time: 20, seed: 1, yield: 2 },
  carrot: { lvl: 1, time: 35, seed: 2, yield: 2 },
  tea: { lvl: 2, time: 45, seed: 2, yield: 2 },
  lavender: { lvl: 2, time: 60, seed: 3, yield: 2 },
  sunflower: { lvl: 3, time: 75, seed: 3, yield: 2 },
  chamomile: { lvl: 6, time: 90, seed: 4, yield: 2 },
  mint: { lvl: 7, time: 100, seed: 4, yield: 2 },
  rose: { lvl: 8, time: 140, seed: 6, yield: 2 },
  pumpkin: { lvl: 10, time: 180, seed: 7, yield: 2 },
  starbloom: { lvl: 11, time: 240, seed: 10, yield: 2 },
};

const r = (out, inp, time, lvl, n = 1) => ({ out, inp, time, lvl, n });

const BUILDINGS = {
  home: { name: "Cosy Cottage", w: 2, d: 2, lvl: 99, desc: "Your little home, wrapped in climbing roses.", fixed: true },
  board: { name: "Request Board", w: 1, d: 1, lvl: 99, desc: "Calmlings pin their gentle requests here.", fixed: true },
  lighthouse: { name: "Ancient Lighthouse", w: 2, d: 2, lvl: 99, desc: "It once guided every lost boat home.", fixed: true },
  plot: { name: "Garden Plot", w: 1, d: 1, lvl: 1, cost: { coins: 15 }, desc: "A patch of soft, tilled soil.", max: 36 },
  teahouse: {
    name: "Tea House", w: 2, d: 2, lvl: 2, cost: { coins: 80, wood: 6 }, desc: "Slow brews, warm cups, quiet company.",
    recipes: [r("herbaltea", { tea: 2 }, 30, 2), r("honeylavtea", { tea: 1, honey: 1, lavender: 1 }, 60, 3), r("chamomiletea", { tea: 1, chamomile: 2 }, 60, 6), r("minttea", { tea: 1, mint: 2 }, 60, 7)],
  },
  beehive: { name: "Bee Hive", w: 1, d: 1, lvl: 3, cost: { coins: 60, wood: 4 }, desc: "Happy bees turn lavender into golden honey.", animal: true, recipes: [r("honey", { lavender: 1 }, 50, 3)] },
  florist: {
    name: "Flower Atelier", w: 2, d: 2, lvl: 3, cost: { coins: 120, wood: 6, stone: 4 }, desc: "Arrange bouquets with a little bit of soul.",
    recipes: [r("sunbouquet", { sunflower: 3 }, 40, 3), r("lavbouquet", { lavender: 3, fibre: 1 }, 50, 5), r("rosebouquet", { rose: 3, fibre: 1 }, 70, 8), r("wreath", { starbloom: 2, moss: 2, fibre: 2 }, 120, 11)],
  },
  coop: { name: "Hen House", w: 2, d: 2, lvl: 4, cost: { coins: 100, wood: 8 }, desc: "Fluffy hens who adore crunchy carrots.", animal: true, recipes: [r("egg", { carrot: 1 }, 40, 4)] },
  bakery: {
    name: "Bakery", w: 2, d: 2, lvl: 4, cost: { coins: 180, wood: 8, stone: 6 }, desc: "The whole island smells of warm butter.",
    recipes: [r("tart", { strawberry: 3, egg: 1 }, 60, 4), r("honeybun", { honey: 1, egg: 2 }, 70, 4), r("carrotcake", { carrot: 3, egg: 1, milk: 1 }, 90, 7), r("pumpkinpie", { pumpkin: 2, egg: 1, milk: 1 }, 110, 10)],
  },
  workshop: {
    name: "Workshop", w: 2, d: 2, lvl: 5, cost: { coins: 160, wood: 6, stone: 8 }, desc: "Make lovely things slowly, by hand.",
    recipes: [r("basket", { fibre: 3, wood: 1 }, 45, 5), r("candle", { honey: 1, lavender: 2 }, 70, 5), r("chime", { wood: 2, shell: 2 }, 80, 6)],
  },
  greenhouse: {
    name: "Greenhouse", w: 2, d: 2, lvl: 7, cost: { coins: 260, wood: 10, stone: 10 }, desc: "Warm glass makes every crop grow 20% faster.",
    recipes: [r("herbbundle", { mint: 1, lavender: 1, chamomile: 1 }, 70, 7), r("orchid", { moss: 2, stone: 1 }, 90, 7)],
  },
  goatpen: { name: "Goat Meadow", w: 2, d: 2, lvl: 7, cost: { coins: 220, wood: 10 }, desc: "A gentle goat with a fondness for carrots.", animal: true, recipes: [r("milk", { carrot: 2 }, 60, 7)] },
  meditation: {
    name: "Meditation Garden", w: 2, d: 2, lvl: 9, cost: { coins: 300, stone: 12 }, desc: "Breathe in. Breathe out. Hearts gather here.",
    recipes: [r("hearts", {}, 120, 9, 3)],
  },
  bathhouse: {
    name: "Bathhouse", w: 2, d: 2, lvl: 10, cost: { coins: 400, wood: 14, stone: 14, crystal: 2 }, desc: "Warm mineral water from deep inside the mountain.",
    recipes: [r("bathsalts", { stone: 1, lavender: 1, crystal: 1 }, 90, 10), r("hearts", { chamomiletea: 1 }, 150, 10, 6)],
  },
};

const DECOR = {
  flowerbed: { name: "Flower Bed", lvl: 1, cost: { coins: 20 }, s: 2 },
  lantern: { name: "Stone Lantern", lvl: 2, cost: { coins: 35 }, s: 3 },
  bench: { name: "Garden Bench", lvl: 2, cost: { coins: 40 }, s: 3 },
  birdbath: { name: "Bird Bath", lvl: 3, cost: { coins: 50, stone: 2 }, s: 4 },
  arch: { name: "Rose Arch", lvl: 4, cost: { coins: 70, wood: 3 }, s: 5 },
  fairylights: { name: "Fairy Lights", lvl: 5, cost: { coins: 60 }, s: 4 },
  mushrooms: { name: "Mushroom Ring", lvl: 5, cost: { hearts: 3 }, s: 5 },
  umbrella: { name: "Sun Umbrella", lvl: 6, cost: { coins: 60 }, s: 4 },
  hammock: { name: "Hammock", lvl: 6, cost: { coins: 80, fibre: 4 }, s: 5 },
  bonsai: { name: "Bonsai", lvl: 7, cost: { coins: 90 }, s: 6 },
  fountain: { name: "Fountain", lvl: 8, cost: { coins: 150, stone: 6 }, s: 8 },
  cherry: { name: "Blossom Tree", lvl: 8, cost: { coins: 120 }, s: 7 },
  chimepost: { name: "Chime Post", lvl: 9, cost: { hearts: 5 }, s: 6 },
  crystals: { name: "Crystal Cluster", lvl: 9, cost: { hearts: 6, crystal: 1 }, s: 8 },
  koi: { name: "Koi Pond", lvl: 10, cost: { coins: 200, stone: 4 }, s: 10 },
  starlantern: { name: "Star Lantern", lvl: 11, cost: { hearts: 10 }, s: 12 },
};

const REGIONS = [
  { id: "garden", name: "Home Garden", cx: 17, cy: 17, r: 5.2, lvl: 1, cost: {}, grass: "#92cf6c", desc: "Where it all begins." },
  { id: "meadow", name: "Sunny Meadow", cx: 24.5, cy: 12.5, r: 4.6, lvl: 3, cost: { coins: 90 }, grass: "#b3d670", desc: "Golden grasses, wildflowers and the hum of bees." },
  { id: "forest", name: "Enchanted Forest", cx: 9, cy: 18, r: 4.8, lvl: 5, cost: { coins: 200, hearts: 5 }, grass: "#6db68f", desc: "Light falls in soft coins through the leaves. Moonmoss glows at dusk." },
  { id: "beach", name: "Hidden Beach", cx: 23.5, cy: 23, r: 4.6, lvl: 6, cost: { coins: 320, hearts: 8 }, grass: "#a5d47a", desc: "A crescent of pale sand, shells and hammock weather." },
  { id: "village", name: "Blossom Village", cx: 15, cy: 26, r: 4.6, lvl: 8, cost: { coins: 500, hearts: 10 }, grass: "#98d07c", desc: "Little cottages, cherry blossom and lantern-lit lanes." },
  { id: "mountain", name: "Mountain Retreat", cx: 9, cy: 9, r: 5.2, lvl: 9, cost: { coins: 700, hearts: 12 }, grass: "#8fc28a", desc: "Pine air, quiet ridges and crystals in the rock." },
  { id: "springs", name: "Hot Springs", cx: 16.5, cy: 8, r: 3.6, lvl: 10, cost: { coins: 900, hearts: 15 }, grass: "#9fcb8e", desc: "Milky turquoise pools, warm from the mountain's heart." },
  { id: "point", name: "Lighthouse Point", cx: 29, cy: 7, r: 3.3, lvl: 11, cost: { coins: 1200, hearts: 20 }, grass: "#a9d68a", desc: "A windswept headland, and an old lighthouse gone dark." },
];

const CALMLINGS = [
  {
    id: "apricus", name: "Apricus", lvl: 1, word: "Latin · warmed by the sun", body: "#ffc493", deep: "#f39d6e", tuft: "sun", fav: "strawberry",
    mood: "Warm, cheerful and always first to greet the morning.",
    lines: ["Feel that? The sun's found the garden again.", "I saved you the warmest spot on the bench.", "Strawberries taste like sunshine you can hold."],
    story: ["Apricus wakes before everyone to watch the light climb over the sea. They say the first ray of the day always lands on the cottage roof.", "Long ago, Apricus kept the island's lighthouse company on cold nights, telling it stories so it wouldn't feel alone.", "When the lighthouse went dark, Apricus started planting strawberries, so there'd be something bright to look at until it shone again."],
  },
  {
    id: "meraki", name: "Meraki", lvl: 2, word: "Greek · to do something with soul", body: "#f7a5a0", deep: "#e57f7b", tuft: "swirl", fav: "herbaltea",
    mood: "Pours a little of themself into everything they make.",
    lines: ["The tea knows when you're in a hurry. Go slowly.", "I painted the teacups. Each one has a tiny secret.", "Anything made with care is never ordinary."],
    story: ["Meraki arrived on a raft made of old paintbrushes. Nobody knows where the raft came from, least of all Meraki.", "Every cup in the Tea House is hand-glazed. If you look closely, each one holds a tiny picture of someone Meraki loves.", "Meraki's dream is to paint the lighthouse lens so its light falls in colours across the sea."],
  },
  {
    id: "komorebi", name: "Komorebi", lvl: 3, word: "Japanese · sunlight filtering through leaves", body: "#a9d8a6", deep: "#7fba86", tuft: "leaf", fav: "tea",
    mood: "Quiet and dreamy, happiest in dappled shade.",
    lines: ["Stand under the palm for a moment. See the light dance?", "Leaves whisper if you're patient enough.", "Tea leaves remember every sunrise they've seen."],
    story: ["Komorebi lives wherever the shade is softest, moving through the day with the sun.", "They can tell the time by the shape of the light on the ground, and they've never once been late.", "Komorebi believes the Enchanted Forest is listening, waiting for someone to visit again."],
  },
  {
    id: "mysa", name: "Mysa", lvl: 4, word: "Swedish · to be cosy and content", body: "#f3e2c7", deep: "#dcc39e", tuft: "bobble", fav: "honeybun",
    mood: "Collector of blankets, warm buns and slow afternoons.",
    lines: ["Is it a blanket day? It's always a blanket day.", "Warm bun, warm hands, warm heart.", "Let's do nothing together for a while."],
    story: ["Mysa owns forty-two blankets and knows the name of each one.", "On stormy nights, Mysa bakes enough honey buns for everyone and leaves them on doorsteps.", "Mysa says cosiness isn't a place. It's the moment you stop wishing you were somewhere else."],
  },
  {
    id: "harmonia", name: "Harmonia", lvl: 5, word: "Greek · harmony, concord", body: "#c9b6ef", deep: "#a58fd8", tuft: "lotus", fav: "lavbouquet",
    mood: "Gentle peacemaker who hums in perfect tune with the wind.",
    lines: ["Everything here fits, if you let it.", "Lavender, breeze, a quiet heart. That's a song.", "Listen. The island is humming back."],
    story: ["Harmonia can hum a note that makes flowers turn toward it.", "Before coming here, Harmonia travelled from island to island, mending small quarrels between the wind and the waves.", "Harmonia thinks the island has a song of its own, and that the lighthouse is its missing last note."],
  },
  {
    id: "eunoia", name: "Eunoia", lvl: 6, word: "Greek · beautiful thinking", body: "#aed4f2", deep: "#86b6e0", tuft: "cloud", fav: "chamomiletea",
    mood: "Thoughtful, kind and always thinking the best of everyone.",
    lines: ["Every shell is a little thank-you from the sea.", "I think kind thoughts at the waves. They seem to like it.", "Chamomile and a sea breeze. Perfect thinking weather."],
    story: ["Eunoia writes kind notes and tucks them into seashells for strangers to find.", "One shell came back years later with a reply. Eunoia keeps it under their pillow.", "Eunoia wonders who will find the next shell, and hopes they feel a little less alone."],
  },
  {
    id: "sobremesa", name: "Sobremesa", lvl: 7, word: "Spanish · lingering at the table after a meal", body: "#ffe19a", deep: "#f2c461", tuft: "steam", fav: "carrotcake",
    mood: "Never in a rush to leave a good conversation.",
    lines: ["Stay a little longer. There's always more cake.", "The best talks happen after the plates are empty.", "Pull up a chair, friend."],
    story: ["Sobremesa's table has room for everyone, and somehow always one more.", "They once kept a conversation going for three whole days. Nobody wanted it to end.", "Sobremesa is saving a chair for the visitor everyone says will come one day."],
  },
  {
    id: "ikigai", name: "Ikigai", lvl: 8, word: "Japanese · a reason for being", body: "#ffb8cf", deep: "#ef8fb0", tuft: "blossom", fav: "rosebouquet",
    mood: "Finds joy in small purposes: a swept step, a watered rose.",
    lines: ["Today my reason is roses. Tomorrow, who knows?", "A little purpose makes a big day.", "The village feels like home because we tend it together."],
    story: ["Ikigai sweeps the village lanes every morning, humming to the cherry trees.", "They keep a jar of tiny folded notes, each one a reason to get up in the morning.", "Ikigai's newest note says: \"Help the island remember its light.\""],
  },
  {
    id: "sisu", name: "Sisu", lvl: 9, word: "Finnish · quiet strength and resolve", body: "#b8c6d9", deep: "#91a3bd", tuft: "peak", fav: "crystal",
    mood: "Steady as stone, soft as moss, never gives up.",
    lines: ["One step, then the next one. That's how mountains are climbed.", "Crystals grow slowly. So do we.", "Rest is part of the climb."],
    story: ["Sisu has walked every path on the mountain, some of them twice in the dark.", "They carry one crystal from the peak in their pocket, warm from years of holding.", "Sisu says the lighthouse lens was carved from the mountain's heart crystal."],
  },
  {
    id: "petrichor", name: "Petrichor", lvl: 10, word: "Greek · the scent of rain on dry earth", body: "#9fe0d2", deep: "#6fc4b4", tuft: "drop", fav: "minttea",
    mood: "Fresh, playful and delighted by every drizzle.",
    lines: ["Smell that? Rain's coming. The best kind.", "Steam, rain, springs. I love all the waters.", "Mint tea after a warm soak. Bliss."],
    story: ["Petrichor arrived in the first rain of spring and simply stayed.", "They can sense a rain shower three islands away and always bring an umbrella for someone else.", "Petrichor thinks the hot springs are the island breathing out, slow and warm."],
  },
  {
    id: "serendipity", name: "Serendipity", lvl: 11, word: "English · a happy accident", body: "#f3c7f0", deep: "#d9a0e2", tuft: "star", fav: "starbloom",
    mood: "Wanders without a map and always finds something wonderful.",
    lines: ["I got lost and found you. Lucky me!", "Starbloom only opens when you're not looking.", "The best things happen sideways."],
    story: ["Serendipity followed a falling star and landed, quite by accident, on Lighthouse Point.", "They plant starbloom seeds wherever they stumble, which is everywhere.", "Serendipity has a feeling, a happy, wobbly feeling, that someone is sailing toward the island right now."],
  },
  {
    id: "hiraeth", name: "Hiraeth", lvl: 13, word: "Welsh · a longing for a home", body: "#8f94d6", deep: "#6a6fb8", tuft: "moon", fav: "honeylavtea", visitor: true,
    mood: "A mysterious traveller from beyond the horizon.",
    lines: ["I followed your light across the whole dark sea.", "This feels like a place I've always missed.", "There are other islands, still dark. Will you help them too?"],
    story: ["Hiraeth sailed for a very long time toward a light that wasn't there.", "When the lighthouse shone again, Hiraeth cried, then laughed, then rowed faster.", "Hiraeth carries a map of the Far Isles, every one of them waiting for their own light."],
  },
];

const FRIEND_LEVELS = [0, 3, 8, 15, 25];
const FRIEND_NAMES = ["New face", "Friend", "Good friend", "Close friend", "Kindred spirit"];

/* Each level: quests (event counters or live checks), its reward and what it unlocks. */
const LEVELS = [
  { name: "A Tiny Garden", intro: "Clear the overgrowth, plant your first berries and meet Apricus.", reward: { coins: 40, hearts: 2 },
    quests: [{ ev: "clear", n: 3, text: "Clear 3 overgrown patches" }, { ev: "harvest:strawberry", n: 4, text: "Harvest 4 strawberries" }, { ev: "deliver", n: 2, text: "Deliver 2 requests" }] },
  { name: "Tea & Sunshine", intro: "Build a Tea House and brew something warm.", reward: { coins: 60, hearts: 3 },
    quests: [{ build: "teahouse", text: "Build the Tea House" }, { ev: "harvest:tea", n: 4, text: "Harvest 4 tea leaves" }, { ev: "make:herbaltea", n: 2, text: "Brew 2 herbal teas" }] },
  { name: "The Humming Meadow", intro: "Open the Sunny Meadow and welcome the bees.", reward: { coins: 90, hearts: 3 },
    quests: [{ region: "meadow", text: "Unlock the Sunny Meadow" }, { build: "beehive", text: "Build a Bee Hive" }, { ev: "make:honey", n: 3, text: "Collect 3 honey" }, { ev: "make:sunbouquet", n: 1, text: "Arrange a sunflower bouquet" }] },
  { name: "Hearth & Home", intro: "Hens, ovens and the smell of warm tarts.", reward: { coins: 120, hearts: 4 },
    quests: [{ build: "coop", text: "Build a Hen House" }, { build: "bakery", text: "Build the Bakery" }, { ev: "make:tart", n: 2, text: "Bake 2 strawberry tarts" }, { ev: "deliver", n: 5, text: "Deliver 5 requests" }] },
  { name: "Whispering Woods", intro: "The forest has been waiting. Bring it back to life.", reward: { coins: 150, hearts: 5 },
    quests: [{ region: "forest", text: "Unlock the Enchanted Forest" }, { build: "workshop", text: "Build a Workshop" }, { ev: "gather:moss", n: 4, text: "Gather 4 moonmoss" }, { ev: "decor", n: 4, text: "Place 4 decorations" }] },
  { name: "The Hidden Shore", intro: "Find the secret beach and the shells it keeps.", reward: { coins: 180, hearts: 5 },
    quests: [{ region: "beach", text: "Unlock the Hidden Beach" }, { ev: "gather:shell", n: 4, text: "Collect 4 seashells" }, { ev: "make:chamomiletea", n: 2, text: "Brew 2 chamomile teas" }, { friend: 2, text: "Become good friends with a Calmling" }] },
  { name: "Glass & Green", intro: "Warm glass, fresh mint and a very polite goat.", reward: { coins: 220, hearts: 6 },
    quests: [{ build: "greenhouse", text: "Build the Greenhouse" }, { build: "goatpen", text: "Build a Goat Meadow" }, { ev: "make:carrotcake", n: 1, text: "Bake a carrot cake" }, { ev: "make:minttea", n: 2, text: "Brew 2 mint teas" }] },
  { name: "Blossom Village", intro: "Lanterns, lanes and cherry blossom. A village to call home.", reward: { coins: 260, hearts: 6 },
    quests: [{ region: "village", text: "Unlock Blossom Village" }, { ev: "harvest:rose", n: 6, text: "Harvest 6 roses" }, { ev: "make:rosebouquet", n: 2, text: "Arrange 2 rose bouquets" }, { serenity: 40, text: "Reach 40 serenity" }] },
  { name: "Mountain Retreat", intro: "Climb into the pines and learn to breathe slowly.", reward: { coins: 300, hearts: 8 },
    quests: [{ region: "mountain", text: "Unlock the Mountain Retreat" }, { ev: "gather:crystal", n: 3, text: "Gather 3 crystals" }, { build: "meditation", text: "Build a Meditation Garden" }, { ev: "make:hearts", n: 2, text: "Meditate twice" }] },
  { name: "Warm Waters", intro: "The springs are steaming. Time for a long soak.", reward: { coins: 360, hearts: 8 },
    quests: [{ region: "springs", text: "Unlock the Hot Springs" }, { build: "bathhouse", text: "Build the Bathhouse" }, { ev: "make:bathsalts", n: 2, text: "Make 2 jars of bath salts" }, { ev: "make:pumpkinpie", n: 1, text: "Bake a pumpkin pie" }] },
  { name: "The Starlit Path", intro: "Follow the falling stars out to the headland.", reward: { coins: 420, hearts: 10 },
    quests: [{ region: "point", text: "Unlock Lighthouse Point" }, { ev: "harvest:starbloom", n: 4, text: "Harvest 4 starbloom" }, { ev: "make:wreath", n: 1, text: "Weave a starbloom wreath" }, { ev: "deliver", n: 8, text: "Deliver 8 requests" }] },
  { name: "The Ancient Light", intro: "Restore the lighthouse and light the way home.", reward: { coins: 600, hearts: 20 },
    quests: [{ lighthouse: 3, text: "Restore the Ancient Lighthouse" }] },
];

const LIGHTHOUSE_STAGES = [
  { name: "Foundations", need: { wood: 30, stone: 30, basket: 3 }, text: "Shore up the old stones and mend the stair." },
  { name: "Lantern Room", need: { crystal: 6, candle: 4, chime: 2 }, text: "Rebuild the lantern room and polish the crystal lens." },
  { name: "The Light", need: { wreath: 2, honeylavtea: 4, rosebouquet: 2 }, text: "Gather everyone's love and light the flame." },
];

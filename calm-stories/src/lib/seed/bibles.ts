/** Story Bibles for the seeded series that demo the continuation journey. */

export interface SeedBible {
  world_name: string;
  geography: string;
  culture: string;
  history: string;
  atmosphere: string;
  rules: string[];
  themes: string[];
  established_facts: string[];
  unresolved_threads: string[];
  creator_preferences: string[];
  locations: { name: string; description: string; recurring: boolean }[];
  characters: {
    name: string;
    age_range: string;
    personality: string;
    backstory: string;
    motivations: string;
    narrative_role: string;
    voice_profile: string;
    arc: string;
  }[];
  relationships: { a: string; b: string; kind: string; description: string }[];
}

export const SEED_BIBLES: Record<string, SeedBible> = {
  "the-moonlit-kingdom": {
    world_name: "Aurelune",
    geography:
      "A kingdom of blue meadows and silver rivers beneath a moon that never fully sets. The silver court sits on a hill above Lake Vesper; the golden court of Seraphine's family lies three days east across the Frozen River.",
    culture:
      "Courtiers speak softly after dusk out of respect for the moon. Paper lanterns carry wishes; snow is considered a blessing. Cartography of the sky is an honoured profession.",
    history:
      "The two courts have been polite rivals for two hundred years, since the Winter Accord divided the river between them. No one remembers exactly why the accord was signed.",
    atmosphere: "Silver light, cold air, warm interiors, slow candlelit corridors, distant bells.",
    rules: [
      "The moon never fully sets over Aurelune.",
      "Lanterns released on the lake drift towards whoever needs them most.",
      "No one may raise their voice in the Moon Garden.",
      "Magic is quiet and gentle – it never harms or frightens.",
    ],
    themes: ["Trust between former rivals", "Finding home in unexpected places", "Patience and quiet attention"],
    established_facts: [
      "Seraphine is the second daughter of the golden court.",
      "Corin has mapped falling stars since he was seven.",
      "One star is missing from Corin's childhood map.",
      "The old gardener, Maud, tends the Moon Garden and knew Seraphine's grandmother.",
      "The first snow fell in episode 7, during the shared supper on the Silver Bridge.",
    ],
    unresolved_threads: [
      "Where the missing star from Corin's map went.",
      "Why the Winter Accord was originally signed.",
      "What Maud promised Seraphine's grandmother.",
    ],
    creator_preferences: [
      "Keep conflict low; tension resolves within each episode.",
      "End every episode somewhere warm and quiet.",
      "Romance stays tender – lingering glances, shared silences, no explicit content.",
    ],
    locations: [
      { name: "The Silver Court", description: "A pale stone palace with long, candlelit corridors.", recurring: true },
      { name: "The Cartographer's Tower", description: "Corin's round tower, walls covered in star charts.", recurring: true },
      { name: "The Moon Garden", description: "A walled garden whose flowers open only in moonlight.", recurring: true },
      { name: "Lake Vesper", description: "A still lake below the court where lanterns are released.", recurring: true },
      { name: "The Silver Bridge", description: "An arched bridge over the river, lined with lamps.", recurring: false },
    ],
    characters: [
      {
        name: "Seraphine",
        age_range: "Mid-twenties",
        personality: "Curious, thoughtful, a little guarded, quietly funny.",
        backstory: "Second daughter of the golden court, sent to the silver court as a gesture of goodwill.",
        motivations: "To prove she is more than a diplomatic gift; to find somewhere she belongs.",
        narrative_role: "Protagonist",
        voice_profile: "Soft, clear, measured; speaks in short sentences when moved.",
        arc: "From wary guest to someone who chooses to stay.",
      },
      {
        name: "Corin",
        age_range: "Late twenties",
        personality: "Gentle, absent-minded, patient, observant.",
        backstory: "The silver court's royal cartographer, who prefers stars to state dinners.",
        motivations: "To complete his map of falling stars; to find the missing star.",
        narrative_role: "Love interest",
        voice_profile: "Low and unhurried, often pauses mid-thought.",
        arc: "From solitary mapmaker to someone who shares his tower – and his map.",
      },
      {
        name: "Maud",
        age_range: "Seventies",
        personality: "Wry, warm, knowing.",
        backstory: "Keeper of the Moon Garden for fifty years; knew Seraphine's grandmother.",
        motivations: "To keep an old promise.",
        narrative_role: "Mentor",
        voice_profile: "Gravelly and kind, fond of proverbs.",
        arc: "Gradually reveals what she knows about the Winter Accord.",
      },
    ],
    relationships: [
      { a: "Seraphine", b: "Corin", kind: "slow-burn romance", description: "Rival courts, shared nights in the tower, growing trust." },
      { a: "Seraphine", b: "Maud", kind: "mentorship", description: "Maud sees Seraphine's grandmother in her." },
    ],
  },
  "the-lantern-keepers-daughter": {
    world_name: "The Thornwood Border",
    geography: "A village of thatched cottages on the edge of the Thornwood, an ancient forest ruled by a gentle fae court.",
    culture: "Villagers leave honey cakes at the forest edge. The forest court values courtesy above all else.",
    history: "Lanterns have marked the border since a truce between village and forest three hundred years ago.",
    atmosphere: "Warm lantern-light against deep green dark; moss, fireflies, the smell of rain on bark.",
    rules: [
      "Lanterns must be lit at dusk and extinguished at dawn.",
      "No mortal may enter the Thornwood uninvited.",
      "Fireflies keep their promises.",
    ],
    themes: ["Duty and longing", "Boundaries that soften", "Small acts of care"],
    established_facts: [
      "Wren has lit the lanterns since her mother retired.",
      "Ash is a knight of the forest court, made partly of moss and silver.",
      "The fireflies owe Wren's family an old debt.",
    ],
    unresolved_threads: ["What the fireflies' debt was for.", "Whether Wren will ever be invited into the forest."],
    creator_preferences: ["Lots of nature description.", "Dialogue between Wren and Ash should be gently teasing."],
    locations: [
      { name: "The Lantern Line", description: "A hundred lanterns along the forest border.", recurring: true },
      { name: "The Old Oak", description: "A vast oak at the boundary where Wren and Ash meet.", recurring: true },
    ],
    characters: [
      {
        name: "Wren",
        age_range: "Early twenties",
        personality: "Steady, dry humour, secretly romantic.",
        backstory: "The lantern keeper's daughter, now keeper herself.",
        motivations: "To keep her family's promise; to see what lies inside the forest.",
        narrative_role: "Protagonist",
        voice_profile: "Warm, wry, unhurried.",
        arc: "Learns that keeping a border can also mean building a bridge.",
      },
      {
        name: "Ash",
        age_range: "Ageless (appears late twenties)",
        personality: "Formal, earnest, unexpectedly shy.",
        backstory: "A knight of the forest court tasked with extinguishing the lanterns each dawn.",
        motivations: "Duty to the court; growing curiosity about the mortal world.",
        narrative_role: "Love interest",
        voice_profile: "Quiet and precise, archaic phrasing.",
        arc: "From rule-bound guardian to someone who bends the rules for kindness.",
      },
    ],
    relationships: [{ a: "Wren", b: "Ash", kind: "romance", description: "Opposite sides of the border, meeting at dawn and dusk." }],
  },
  "a-cabin-in-the-pines": {
    world_name: "Larch Hollow",
    geography: "A small mountain village of thirty houses, a bakery, a frozen pond, and an abandoned observatory on the ridge.",
    culture: "Everyone knows everyone; mysteries are solved over tea, never with accusations.",
    history: "Larch Hollow was a mining village until the silver ran out a century ago.",
    atmosphere: "Snow, woodsmoke, lamplight, ticking clocks, the hiss of a kettle.",
    rules: ["No one is ever truly a villain.", "Each mystery resolves gently by the end of the episode."],
    themes: ["Community", "Second acts", "Paying attention"],
    established_facts: ["Agnes Thorne is a retired librarian.", "The cabin's previous owner was a clockmaker named Tobias."],
    unresolved_threads: ["What the key under the mat opens."],
    creator_preferences: ["Cosy, low stakes, lots of tea."],
    locations: [{ name: "The Cabin", description: "Agnes's cabin above the village.", recurring: true }],
    characters: [
      {
        name: "Agnes Thorne",
        age_range: "Late sixties",
        personality: "Sharp, kind, endlessly curious.",
        backstory: "Forty years as a city librarian before retiring to the mountains.",
        motivations: "To belong somewhere new.",
        narrative_role: "Protagonist / amateur sleuth",
        voice_profile: "Crisp, warm, amused.",
        arc: "From newcomer to the village's trusted puzzle-solver.",
      },
    ],
    relationships: [],
  },
};

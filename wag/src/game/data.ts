import type {
  AgeGroup,
  CoatId,
  DogLook,
  Energy,
  Favourite,
  Friend,
  HatId,
  Personality,
  QuestCategory,
  QuestDef,
} from './types';

export const COATS: Record<CoatId, { name: string; base: string; shade: string; light: string; rgb: [number, number, number] }> = {
  golden: { name: 'Golden', base: '#e9b066', shade: '#c98a45', light: '#fbe3bb', rgb: [214, 160, 90] },
  honey: { name: 'Honey', base: '#f1c584', shade: '#d6a15e', light: '#fdeed3', rgb: [230, 190, 130] },
  cream: { name: 'Cream', base: '#f6e3c4', shade: '#dcc29b', light: '#fffaf0', rgb: [240, 225, 200] },
  ginger: { name: 'Ginger', base: '#df8a4e', shade: '#b8662f', light: '#f8d4b4', rgb: [200, 120, 65] },
  tan: { name: 'Fawn', base: '#c9a07a', shade: '#a27b58', light: '#efdcc6', rgb: [185, 150, 115] },
  chocolate: { name: 'Cocoa', base: '#8a5a3f', shade: '#663f2b', light: '#d7b39a', rgb: [120, 80, 55] },
  grey: { name: 'Silver', base: '#b9b6c3', shade: '#8f8b9e', light: '#ecebf2', rgb: [170, 168, 180] },
  black: { name: 'Midnight', base: '#4a4153', shade: '#332b3b', light: '#c9bfcf', rgb: [50, 45, 55] },
  white: { name: 'Snow', base: '#fbf7f2', shade: '#e1d9d0', light: '#ffffff', rgb: [248, 245, 240] },
};

export const BANDANAS = ['#9c7ad8', '#e87b8f', '#5fae7a', '#5a9fd8', '#f2b54a', '#e06b4f', '#3d3a6b'];

export interface BreedPreset {
  name: string;
  look: Partial<DogLook>;
}

export const BREEDS: BreedPreset[] = [
  { name: 'Golden Retriever', look: { coat: 'golden', ears: 'floppy', pattern: 'none' } },
  { name: 'Labrador', look: { coat: 'honey', ears: 'floppy', pattern: 'none' } },
  { name: 'Cockapoo', look: { coat: 'honey', ears: 'floppy', pattern: 'none' } },
  { name: 'Border Collie', look: { coat: 'black', ears: 'fold', pattern: 'blaze' } },
  { name: 'Cocker Spaniel', look: { coat: 'ginger', ears: 'floppy', pattern: 'none' } },
  { name: 'French Bulldog', look: { coat: 'tan', ears: 'pointy', pattern: 'mask' } },
  { name: 'Dachshund', look: { coat: 'chocolate', ears: 'floppy', pattern: 'none' } },
  { name: 'Corgi', look: { coat: 'ginger', ears: 'pointy', pattern: 'blaze' } },
  { name: 'Shiba Inu', look: { coat: 'ginger', ears: 'pointy', pattern: 'blaze' } },
  { name: 'Staffie', look: { coat: 'grey', ears: 'fold', pattern: 'blaze' } },
  { name: 'Whippet', look: { coat: 'tan', ears: 'fold', pattern: 'socks' } },
  { name: 'Jack Russell', look: { coat: 'white', ears: 'fold', pattern: 'patch' } },
  { name: 'Beagle', look: { coat: 'tan', ears: 'floppy', pattern: 'blaze' } },
  { name: 'Husky', look: { coat: 'grey', ears: 'pointy', pattern: 'mask' } },
  { name: 'Poodle', look: { coat: 'cream', ears: 'floppy', pattern: 'none' } },
  { name: 'German Shepherd', look: { coat: 'tan', ears: 'pointy', pattern: 'mask' } },
  { name: 'Greyhound', look: { coat: 'grey', ears: 'fold', pattern: 'socks' } },
  { name: 'Mixed breed', look: {} },
];

export const PERSONALITIES: { id: Personality; label: string; line: string }[] = [
  { id: 'playful', label: 'Playful', line: 'Every moment is a game' },
  { id: 'gentle', label: 'Gentle', line: 'Soft paws, soft heart' },
  { id: 'curious', label: 'Curious', line: 'Must sniff everything' },
  { id: 'brave', label: 'Brave', line: 'Fearless explorer' },
  { id: 'cuddly', label: 'Cuddly', line: 'Professional lap-warmer' },
  { id: 'cheeky', label: 'Cheeky', line: 'Lovable little rascal' },
  { id: 'sleepy', label: 'Sleepy', line: 'Champion napper' },
  { id: 'social', label: 'Social', line: 'Friends with everyone' },
];

export const FAVOURITES: { id: Favourite; label: string }[] = [
  { id: 'walks', label: 'Long walks' },
  { id: 'fetch', label: 'Fetch' },
  { id: 'sniffing', label: 'Sniffing adventures' },
  { id: 'cuddles', label: 'Sofa cuddles' },
  { id: 'tug', label: 'Tug of war' },
  { id: 'swimming', label: 'Splashing about' },
  { id: 'friends', label: 'Meeting friends' },
  { id: 'sunbathing', label: 'Sunny naps' },
  { id: 'tricks', label: 'Learning tricks' },
  { id: 'carrides', label: 'Car rides' },
];

export const ENERGY: { id: Energy; label: string; line: string }[] = [
  { id: 'bouncy', label: 'Full of beans', line: 'Happy to go all day' },
  { id: 'steady', label: 'Steady explorer', line: 'Loves a good amble' },
  { id: 'gentle', label: 'Takes it gently', line: 'Short outings, lots of rest' },
];

export function ageGroup(years: number): AgeGroup {
  if (years < 1) return 'puppy';
  if (years >= 9) return 'senior';
  return 'adult';
}

const ALL_E: Energy[] = ['gentle', 'steady', 'bouncy'];
const ACTIVE: Energy[] = ['steady', 'bouncy'];
const ALL_A: AgeGroup[] = ['puppy', 'adult', 'senior'];
const GROWN: AgeGroup[] = ['adult', 'senior'];

export const QUESTS: QuestDef[] = [
  { id: 'welcome', title: 'A welcome cuddle', blurb: 'Give {dog} a slow, gentle scratch in their favourite spot.', category: 'bond', minutes: 1, energy: ALL_E, ages: ALL_A, tip: 'Watch for a lean-in. If {dog} moves away, they are saying “that’s enough for now” — and that is perfect too.' },
  { id: 'beautiful', title: 'Find something beautiful', blurb: 'On your walk, stop and notice one beautiful thing together.', category: 'explore', minutes: 15, energy: ALL_E, ages: ALL_A, tip: 'A flower, a puddle reflecting the sky, a friendly cat on a wall. Take a photo if you like.' },
  { id: 'newplace', title: 'Discover somewhere new', blurb: 'Take a different turning and explore a path you’ve never walked.', category: 'explore', minutes: 25, energy: ACTIVE, ages: GROWN, favourite: 'walks', tip: 'New places are a feast for the nose. Let {dog} set the pace.' },
  { id: 'smells', title: 'Find three interesting smells', blurb: 'Let {dog} lead you to three spots that deserve a proper sniff.', category: 'senses', minutes: 10, energy: ALL_E, ages: ALL_A, favourite: 'sniffing', tip: 'Sniffing is tiring in the best way — ten minutes of nose work can equal a much longer walk.' },
  { id: 'quiet', title: 'Five quiet minutes', blurb: 'Sit together somewhere calm. No phone, no plans — just be.', category: 'calm', minutes: 5, energy: ALL_E, ages: ALL_A, tip: 'Put the phone face down. Slow strokes, soft voice. Notice {dog}’s breathing.' },
  { id: 'favgame', title: 'Play {dog}’s favourite game', blurb: 'Ten minutes of the game {dog} loves most.', category: 'play', minutes: 10, energy: ALL_E, ages: ALL_A, tip: 'End while {dog} still wants more — it keeps the game special.' },
  { id: 'sunset', title: 'Watch the sunset together', blurb: 'Find a spot with a view and watch the sky change colour.', category: 'calm', minutes: 15, energy: ALL_E, ages: ALL_A, tip: 'Bring a blanket for {dog} — evenings can get chilly.' },
  { id: 'newtrick', title: 'Teach a tiny new trick', blurb: 'Spend five minutes on something new. Tiny steps, big treats.', category: 'train', minutes: 5, energy: ALL_E, ages: ALL_A, favourite: 'tricks', tip: 'Keep sessions short and sweet. Three successes in a row? Finish on a high.' },
  { id: 'treasure', title: 'Treat treasure hunt', blurb: 'Hide five treats around a room and let {dog} find them.', category: 'senses', minutes: 10, energy: ALL_E, ages: ALL_A, favourite: 'sniffing', tip: 'Start with easy hides in plain sight, then make it trickier.' },
  { id: 'fetch', title: 'The great fetch-off', blurb: 'A proper game of fetch in a safe open space.', category: 'play', minutes: 15, energy: ACTIVE, ages: ['adult'], favourite: 'fetch', tip: 'Short throws, lots of praise, and water breaks.' },
  { id: 'friendwalk', title: 'Walk with a friend', blurb: 'Meet up with another dog (or human!) for a sociable stroll.', category: 'explore', minutes: 30, energy: ACTIVE, ages: GROWN, favourite: 'friends', tip: 'Parallel walking first — side by side with space — helps dogs feel relaxed.' },
  { id: 'brush', title: 'A pampering brush', blurb: 'A slow, gentle grooming session with lots of praise.', category: 'bond', minutes: 10, energy: ALL_E, ages: ALL_A, tip: 'Short strokes, little treats, and stop if {dog} seems unsure.' },
  { id: 'puddle', title: 'Splash time', blurb: 'Find a shallow stream, puddle or paddling pool to splash in.', category: 'play', minutes: 15, energy: ACTIVE, ages: ['adult'], favourite: 'swimming', tip: 'Shallow, slow water only. Towel and a cuddle afterwards.' },
  { id: 'sunnap', title: 'A sunny nap spot', blurb: 'Find a warm patch of sun and share a lazy moment.', category: 'calm', minutes: 10, energy: ALL_E, ages: ALL_A, favourite: 'sunbathing', tip: 'Make sure there’s shade and water nearby.' },
  { id: 'tug', title: 'Tug with rules', blurb: 'A happy tug game with a “drop” and a restart.', category: 'play', minutes: 8, energy: ALL_E, ages: ['puppy', 'adult'], favourite: 'tug', tip: 'Let {dog} win sometimes — confidence matters!' },
  { id: 'gentlestroll', title: 'A pottering stroll', blurb: 'A slow wander around the block, stopping wherever {dog} wants.', category: 'explore', minutes: 10, energy: ['gentle', 'steady'], ages: ['senior', 'puppy'], tip: 'Short and sniffy beats long and fast for older and younger paws.' },
  { id: 'newsounds', title: 'Brave new sounds', blurb: 'Sit somewhere and calmly watch the world go by, rewarding calm.', category: 'train', minutes: 8, energy: ALL_E, ages: ['puppy', 'adult'], tip: 'Distance is your friend. Reward calm looks, then move away if needed.' },
  { id: 'massage', title: 'A gentle massage', blurb: 'Soft circular strokes along the shoulders and back.', category: 'bond', minutes: 5, energy: ALL_E, ages: ALL_A, tip: 'Light pressure only. Lovely for older joints.' },
  { id: 'carride', title: 'An adventure by car', blurb: 'Drive somewhere new for a walk — the journey is part of it.', category: 'explore', minutes: 40, energy: ACTIVE, ages: GROWN, favourite: 'carrides', tip: 'Secure harness or crate, windows only slightly open.' },
  { id: 'eyecontact', title: 'Look at me', blurb: 'Reward {dog} every time they choose to look up at you.', category: 'train', minutes: 5, energy: ALL_E, ages: ALL_A, tip: 'No need to ask — just catch and reward the voluntary look.' },
];

export const CATEGORY_META: Record<QuestCategory, { label: string; color: string; soft: string }> = {
  explore: { label: 'Explore', color: '#4e8b57', soft: '#e1f0d9' },
  senses: { label: 'Senses', color: '#c4732f', soft: '#fbe8d4' },
  train: { label: 'Learn', color: '#5a6fc8', soft: '#e3e7fb' },
  bond: { label: 'Bond', color: '#d0587a', soft: '#fbe1e8' },
  play: { label: 'Play', color: '#d99a1c', soft: '#fdf0cf' },
  calm: { label: 'Calm', color: '#7b62c4', soft: '#ece5fb' },
};

export interface ItemDef {
  id: string;
  name: string;
  price: number;
  level: number;
  plus?: boolean;
  seasonal?: string;
  desc: string;
}

export const ITEMS: ItemDef[] = [
  { id: 'lantern', name: 'Honey Lantern', price: 40, level: 1, desc: 'Glows warmly when the sun goes down.' },
  { id: 'flowerpot', name: 'Petal Pot', price: 30, level: 1, desc: 'A terracotta pot of lavender blooms.' },
  { id: 'bench', name: 'Sunset Bench', price: 80, level: 1, desc: 'Perfect for five quiet minutes.' },
  { id: 'ball', name: 'Bouncy Ball', price: 20, level: 1, desc: 'The best thing in the whole world.' },
  { id: 'dogbed', name: 'Cloud Bed', price: 90, level: 1, desc: 'A plump bed for well-earned naps.' },
  { id: 'mushroom', name: 'Glowcap Lamp', price: 60, level: 2, desc: 'A mushroom that hums softly at night.' },
  { id: 'signpost', name: 'Wander Sign', price: 50, level: 2, desc: 'Points to all your favourite places.' },
  { id: 'mailbox', name: 'Friend Mailbox', price: 70, level: 2, desc: 'For gifts from neighbouring islands.' },
  { id: 'picnic', name: 'Picnic Blanket', price: 75, level: 2, desc: 'Gingham, crumbs and contentment.' },
  { id: 'birdhouse', name: 'Birdhouse', price: 65, level: 3, desc: 'Tiny neighbours with lovely songs.' },
  { id: 'windmill', name: 'Breeze Mill', price: 140, level: 3, desc: 'Turns lazily in the island breeze.' },
  { id: 'tent', name: 'Explorer Tent', price: 160, level: 4, desc: 'For dreaming of the next adventure.' },
  { id: 'arch', name: 'Fairy-light Arch', price: 180, level: 4, desc: 'A twinkling entrance to anywhere.' },
  { id: 'pumpkin', name: 'Harvest Pumpkin', price: 45, level: 1, seasonal: 'Autumn', desc: 'Autumn on the island. Smells of cinnamon.' },
  { id: 'snowdog', name: 'Snow Pup', price: 55, level: 1, seasonal: 'Winter', desc: 'A snowman, but make it a dog.' },
  { id: 'telescope', name: 'Star Telescope', price: 220, level: 1, plus: true, desc: 'See all the way to friends’ islands.' },
  { id: 'crystal', name: 'Moon Crystal', price: 200, level: 1, plus: true, desc: 'Hums with gentle moonlight.' },
];

export const ITEM_BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i])) as Record<string, ItemDef>;

export const HATS: { id: HatId; name: string; price: number; plus?: boolean }[] = [
  { id: 'none', name: 'Natural', price: 0 },
  { id: 'flowercrown', name: 'Flower Crown', price: 0 },
  { id: 'beanie', name: 'Cosy Beanie', price: 60 },
  { id: 'explorer', name: 'Explorer Hat', price: 80 },
  { id: 'bow', name: 'Ribbon Bow', price: 40 },
  { id: 'acorn', name: 'Acorn Cap', price: 50 },
  { id: 'wizard', name: 'Starry Wizard', price: 150, plus: true },
  { id: 'crown', name: 'Little Crown', price: 180, plus: true },
];

export interface CreatureDef {
  id: string;
  name: string;
  hue: string;
  where: string;
  desc: string;
}

export const CREATURES: CreatureDef[] = [
  { id: 'glowmoth', name: 'Glowmoth', hue: '#f8d77a', where: 'Evening walks', desc: 'Follows lanterns and kind hearts.' },
  { id: 'puffcap', name: 'Puffcap', hue: '#e9837a', where: 'Woodland paths', desc: 'A shy mushroom sprite who loves damp leaves.' },
  { id: 'mossbun', name: 'Moss Bunny', hue: '#8cc47a', where: 'Grassy parks', desc: 'Grows a tiny flower when happy.' },
  { id: 'dewdrop', name: 'Dewdrop', hue: '#8fd0ee', where: 'Near water', desc: 'Made of morning dew and giggles.' },
  { id: 'sunbeetle', name: 'Sunbeetle', hue: '#f2a93b', where: 'Sunny spots', desc: 'Stores sunshine for cloudy days.' },
  { id: 'cloudpup', name: 'Cloud Pup', hue: '#e6e1fb', where: 'Calm moments', desc: 'Appears when someone takes a deep breath.' },
  { id: 'starfox', name: 'Star Fox', hue: '#b49cf0', where: 'Night adventures', desc: 'Leaves a sprinkle of stardust behind.' },
  { id: 'pebbleturtle', name: 'Pebble Turtle', hue: '#a9b6a0', where: 'Slow strolls', desc: 'In no hurry. Wise beyond its years.' },
];
export const CREATURE_BY_ID = Object.fromEntries(CREATURES.map((c) => [c.id, c])) as Record<string, CreatureDef>;

export const LEVELS = [0, 100, 260, 480, 760, 1100, 1500, 2000, 2600, 3300, 4100, 5000];

export function levelFromXp(xp: number) {
  let lvl = 1;
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i]) lvl = i + 1;
  const cur = LEVELS[lvl - 1] ?? 0;
  const next = LEVELS[lvl] ?? cur + 1000;
  return { level: lvl, into: xp - cur, need: next - cur, pct: Math.min(1, (xp - cur) / (next - cur)) };
}

export const LEVEL_TITLES = ['New Friends', 'Good Companions', 'Walking Buddies', 'Trusted Pals', 'Adventure Partners', 'Kindred Spirits', 'Inseparable', 'Soul Mates', 'Legends of the Island', 'Forever Friends', 'Starlight Bond', 'Eternal Wag'];

export interface AreaDef {
  id: string;
  name: string;
  level: number;
  plus?: boolean;
  desc: string;
}

export const AREAS: AreaDef[] = [
  { id: 'meadow', name: 'Honey Meadow', level: 1, desc: 'Where every story begins.' },
  { id: 'woods', name: 'Whispering Woods', level: 2, desc: 'Mossy trees, secret smells and shy creatures.' },
  { id: 'grotto', name: 'Waterfall Grotto', level: 3, desc: 'A hidden nook behind the falling water.' },
  { id: 'islet', name: 'Starlight Islet', level: 4, desc: 'Across the moonlit bridge — a little observatory.' },
  { id: 'cove', name: 'Crystal Cove', level: 1, plus: true, desc: 'A WAG Plus territory of glowing crystals.' },
];

export const DISCOVERIES = [
  { id: 'stick', name: 'A Particularly Excellent Stick', rarity: 'common' },
  { id: 'feather', name: 'A Soft Grey Feather', rarity: 'common' },
  { id: 'acorn', name: 'A Perfect Acorn', rarity: 'common' },
  { id: 'leaf', name: 'A Crunchy Golden Leaf', rarity: 'common' },
  { id: 'pinecone', name: 'A Mighty Pinecone', rarity: 'common' },
  { id: 'smell', name: 'A Mysterious Smell (Fox?)', rarity: 'common' },
  { id: 'puddle', name: 'A Puddle Full of Sky', rarity: 'uncommon' },
  { id: 'friend', name: 'A New Dog Friend', rarity: 'uncommon' },
  { id: 'bench', name: 'A Bench With a View', rarity: 'uncommon' },
  { id: 'clover', name: 'A Four-Leaf Clover', rarity: 'rare' },
  { id: 'seedpod', name: 'A Glowing Seed Pod', rarity: 'rare' },
];

export const WALK_CHALLENGES = [
  { id: 'sniff3', title: 'Three sniff stops', target: 3, unit: 'sniffs' },
  { id: 'hello', title: 'Say hello to someone', target: 1, unit: 'hellos' },
  { id: 'checkin', title: 'Five voluntary check-ins', target: 5, unit: 'check-ins' },
  { id: 'pause', title: 'Pause to look at the sky', target: 1, unit: 'pauses' },
];

export function makeFriends(now: number): Friend[] {
  const f = (
    id: string,
    ownerName: string,
    name: string,
    breed: string,
    look: DogLook,
    islandName: string,
    level: number,
    decorations: string[],
    status: string,
    online: boolean,
    personality: Personality[],
  ): Friend => ({
    id,
    ownerName,
    islandName,
    level,
    decorations,
    status,
    online,
    addedAt: now,
    dog: { name, breed, ageYears: 3, personality, favourites: ['walks'], energy: 'steady', look },
  });
  return [
    f('biscuit', 'Priya', 'Biscuit', 'Corgi', { coat: 'ginger', ears: 'pointy', pattern: 'blaze', bandana: '#5fae7a', hat: 'none' }, 'Crumble Hill', 6, ['picnic', 'lantern', 'windmill', 'flowerpot', 'ball'], 'Just found a four-leaf clover!', true, ['cheeky', 'playful']),
    f('luna', 'Tom', 'Luna', 'Whippet', { coat: 'grey', ears: 'fold', pattern: 'socks', bandana: '#3d3a6b', hat: 'wizard' }, 'Moonwhistle', 8, ['telescope', 'lantern', 'mushroom', 'arch', 'bench'], 'Zoomies at the beach this morning', true, ['gentle', 'brave']),
    f('mochi', 'Aiko', 'Mochi', 'Shiba Inu', { coat: 'ginger', ears: 'pointy', pattern: 'blaze', bandana: '#e87b8f', hat: 'flowercrown' }, 'Blossom Nook', 4, ['flowerpot', 'flowerpot', 'birdhouse', 'dogbed'], 'Refused to walk in the rain. Again.', false, ['cheeky', 'sleepy']),
    f('pepper', 'Gareth', 'Pepper', 'Cocker Spaniel', { coat: 'black', ears: 'floppy', pattern: 'none', bandana: '#f2b54a', hat: 'explorer' }, 'Puddle Point', 5, ['tent', 'signpost', 'mailbox', 'ball'], 'Swam in every puddle in Bristol', false, ['playful', 'social']),
    f('bramble', 'Ellie', 'Bramble', 'Border Collie', { coat: 'black', ears: 'fold', pattern: 'blaze', bandana: '#9c7ad8', hat: 'beanie' }, 'Thistledown', 7, ['windmill', 'bench', 'lantern', 'pumpkin', 'arch'], 'Learned “spin” in two days!', true, ['curious', 'brave']),
  ];
}

export const GIFTS = [
  { id: 'wave', name: 'A friendly wave', cost: 0, desc: 'Free, once a day' },
  { id: 'treats', name: 'Treat basket', cost: 25, desc: '25 Paw Coins' },
  { id: 'flower', name: 'Moonbloom', cost: 0, seeds: 1, desc: '1 Magic Seed' },
];

export const SHARED = [
  { id: 'biscuit-walk', friend: 'biscuit', title: 'Crumble Hill Ramble', goal: 120, unit: 'minutes walked together', reward: 'Picnic Blanket' },
  { id: 'luna-sunset', friend: 'luna', title: 'Seven Sunsets', goal: 7, unit: 'calm moments', reward: 'Star Telescope fragment' },
];

export const COMMUNITY = {
  title: 'The Great Autumn Sniff',
  blurb: 'Every sniff stop, smelly quest and nose game in the neighbourhood counts toward the Acorn Lantern.',
  goal: 25000,
  base: 17840,
  tiers: [
    { at: 5, reward: '50 Paw Coins', coins: 50 },
    { at: 15, reward: 'Acorn Cap', hat: 'acorn' as HatId },
    { at: 30, reward: 'Harvest Pumpkin', item: 'pumpkin' },
  ],
};

/** Island restoration projects, paid for with stars earned in Treasure Trails puzzles. */
export interface ProjectDef {
  id: string;
  name: string;
  stars: number;
  story: string;
  reward?: string; // decoration item granted
  area?: string; // territory this opens
  requires?: string;
}

export const PROJECTS: ProjectDef[] = [
  { id: 'bridge', name: 'Repair the little wooden bridge', stars: 2, story: 'Old Barnaby the badger has been waiting to cross the stream for years.', reward: 'signpost' },
  { id: 'blossom', name: 'Plant the cherry blossom tree', stars: 3, story: 'A Wishing Tree sapling, ready to bloom for {dog}.', reward: 'lantern', requires: 'bridge' },
  { id: 'cottage', name: 'Build {dog}’s cottage', stars: 5, story: 'A cosy home with a round door and a fire for rainy days.', reward: 'dogbed', requires: 'blossom' },
  { id: 'waterfall', name: 'Restore the magical waterfall', stars: 8, story: 'The spring went quiet long ago. Pip the otter says it only needs a little love.', reward: 'bench', requires: 'cottage' },
  { id: 'woods', name: 'Unlock Whispering Woods', stars: 15, story: 'A new territory. Meet Hazel the owl, who keeps the forest’s stories.', reward: 'mushroom', area: 'woods', requires: 'waterfall' },
  { id: 'grotto', name: 'Open the Waterfall Grotto', stars: 12, story: 'Something glitters behind the falling water…', reward: 'arch', area: 'grotto', requires: 'woods' },
  { id: 'islet', name: 'Raise the moonlit bridge to Starlight Islet', stars: 20, story: 'Luna the star fox lives in a tiny observatory across the sky.', reward: 'windmill', area: 'islet', requires: 'grotto' },
];

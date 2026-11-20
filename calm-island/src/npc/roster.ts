import type { CalmlingLook } from '../player/CalmlingModel';

export interface Resident {
  id: string;
  name: string;
  /** what the name means: shown in the log once you have met */
  meaning: string;
  /** a line of greeting */
  hello: string;
  /** something they tell you once you are good friends */
  story: string;
  /** where they like to be, in island metres */
  home: [number, number];
  look: CalmlingLook;
}

/**
 * The Calmlings who live on the island. Looks follow the collection sheet;
 * the meanings are the real-world senses of each name.
 */
export const RESIDENTS: Resident[] = [
  {
    id: 'apricus', name: 'Apricus', home: [34, 282],
    meaning: 'Latin: warmed by the sun',
    hello: 'Stand here a moment. Feel that? Lovely.',
    story: "I find the warmest patch of sand each morning and just… stay. That's the whole plan.",
    look: { fur: 0xf47a1c, belly: 0xf8dfa6, tip: 0xffa23a, limbs: 0xf58a24, iris: 0x2f7fe6, style: 'spiky', extras: ['stripes'] },
  },
  {
    id: 'dadirri', name: 'Dadirri', home: [26, -22],
    meaning: "Ngan'gikurunggurr: deep, quiet listening",
    hello: 'Shh… listen. The pond is telling a story.',
    story: "When I'm very quiet I can hear the lilies open. It took me years to notice.",
    look: { fur: 0xf49ad2, belly: 0xfdeff6, limbs: 0xf7a6d8, iris: 0xa8309a, style: 'fluffy', extras: ['catEars', 'blush'] },
  },
  {
    id: 'shu', name: 'Shu', home: [2, 112],
    meaning: "Chinese: putting yourself in another's place",
    hello: 'I packed a little extra, in case you needed some.',
    story: "I used to guess what others needed. Now I ask. It works much better.",
    look: { fur: 0xf5c2a4, belly: 0xfbe6d4, tip: 0xfad8c0, limbs: 0xf3b89a, iris: 0xa85068, style: 'shaggy', extras: ['pouch'] },
  },
  {
    id: 'kupuna', name: 'Kupuna', home: [-148, 2],
    meaning: 'Hawaiian: an elder, a keeper of wisdom',
    hello: 'These trees were saplings when I first sat here.',
    story: "I planted the great tree in the garden. It was shorter than you then.",
    look: { fur: 0x55555c, furLow: 0x7c7c84, belly: 0xbdbdc4, limbs: 0x56565e, iris: 0xdc8a1e, style: 'shaggy', extras: ['stick'] },
  },
  {
    id: 'gokotta', name: 'Gökotta', home: [150, 62],
    meaning: 'Swedish: rising early to hear the first birdsong',
    hello: 'You should hear this meadow at dawn!',
    story: "The first bird of the day sings alone for a whole minute. I never miss it.",
    look: { fur: 0xf58fb2, alt: 0x86bdea, belly: 0xfbd3e0, limbs: 0xf7a0bc, iris: 0x3a8ae6, style: 'spiky' },
  },
  {
    id: 'morgenfrisk', name: 'Morgenfrisk', home: [330, 116],
    meaning: "Danish: fresh and rested after a good night's sleep",
    hello: 'What a morning! Shall we go somewhere?',
    story: "I sleep on the east shore so the sun reaches me first.",
    look: { fur: 0xf7b43a, furLow: 0xf0606c, lowAt: -0.15, limbs: 0xf2686e, iris: 0x2f7fe6, style: 'spiky', extras: ['openSmile', 'blush'] },
  },
  {
    id: 'komorebi', name: 'Komorebi', home: [-108, 42],
    meaning: 'Japanese: sunlight filtering through leaves',
    hello: 'Look up. See how the light falls through?',
    story: "I've counted the shapes the light makes on the forest floor. There's always one more.",
    look: { fur: 0xf8e22c, furLow: 0x5c3f2c, lowAt: -0.3, lowSoft: 0.12, limbs: 0x5c3f2c, iris: 0x2f8ae6, style: 'spiky', extras: ['blush'] },
  },
  {
    id: 'extrawunsch', name: 'Extrawunsch', home: [82, 6],
    meaning: 'German: one more special little wish',
    hello: 'Ah! Could we take the scenic path? And stop for a view?',
    story: "My wishes are small ones. A better view. A longer walk. One more minute here.",
    look: { fur: 0xe59a58, belly: 0xf3c491, tip: 0xf0b070, limbs: 0xe8a468, iris: 0x7a4a26, style: 'shaggy', extras: ['glasses', 'moustache'] },
  },
  {
    id: 'genkaku', name: 'Genkaku', home: [-126, -188],
    meaning: 'Japanese: a vision, a waking dream',
    hello: 'Did the mountain move just now, or did I?',
    story: "Sometimes I can't tell a cloud from the mountain. I've decided I like that.",
    look: { fur: 0x8d66dc, belly: 0xf0627c, limbs: 0x8a63d8, iris: 0x3a8ae6, style: 'fluffy', extras: ['hood', 'brows'] },
  },
  {
    id: 'shinrin', name: 'Shinrin-Yoku', home: [-222, 58],
    meaning: 'Japanese: forest bathing',
    hello: 'Breathe it in. The forest does the rest.',
    story: "The antlers? They just grew, the longer I stayed among the trees.",
    look: { fur: 0x6d9c48, tip: 0x8fbf5a, limbs: 0xdc7a30, iris: 0xe8b82a, style: 'fluffy', extras: ['antlers'] },
  },
  {
    id: 'psithuros', name: 'Psithuros', home: [-40, -158],
    meaning: 'Greek: the whisper of wind in the leaves',
    hello: 'The wind has news from the sea today.',
    story: "The wind told me your name before you arrived.",
    look: { fur: 0xf2f7fd, furLow: 0xbcd9f4, tip: 0xffffff, limbs: 0xa9cdf0, iris: 0x2f8ae6, style: 'fluffy' },
  },
  {
    id: 'misogi', name: 'Misogi', home: [44, -50],
    meaning: 'Japanese: washing the spirit clean in cold water',
    hello: 'Stand near the falls. Let the spray wake you.',
    story: "I stand under the falls until my thoughts run clear. Cold, but worth it.",
    look: { fur: 0x9fd0f6, furLow: 0x5c92dc, alt: 0xd9c6f8, tip: 0xe8fbff, limbs: 0x6aa6e6, iris: 0x2f6fd0, style: 'spiky', extras: ['sparkles'] },
  },
  {
    id: 'desbundar', name: 'Desbundar', home: [-16, 24],
    meaning: 'Portuguese: letting go and simply having fun',
    hello: "You came! Now it's a party.",
    story: "I wear the hat every day. Why wait for a reason?",
    look: { fur: 0xf8f1f1, belly: 0xffffff, limbs: 0xf3e6e6, iris: 0x2f8ae6, style: 'fluffy', extras: ['partyHat', 'blush', 'openSmile'], scale: 0.88 },
  },
  {
    id: 'kintsugi', name: 'Kintsugi', home: [-186, -108],
    meaning: 'Japanese: mending what is broken with gold',
    hello: 'Every crack is where the gold goes.',
    story: "I was afraid of the cracks once. Then the gold came in.",
    look: { fur: 0x2a2c36, limbs: 0x2a2c36, paws: 0xf5c62a, iris: 0x7fa6d0, style: 'spiky', extras: ['cracks'] },
  },
  {
    id: 'harmonia', name: 'Harmonia', home: [60, -204],
    meaning: 'Greek: things fitting together in balance',
    hello: 'The lake is so still. Everything in its place.',
    story: "When the lake is perfectly still I hum one note, and the whole shore hums back.",
    look: { fur: 0xf3f1f5, tip: 0xffffff, limbs: 0xe9e6ee, iris: 0x16161c, style: 'fluffy', extras: ['lashes', 'blush', 'sparkles'] },
  },
  {
    id: 'meraki', name: 'Meraki', home: [118, 182],
    meaning: 'Greek: doing something with all your heart',
    hello: 'I planted every one of these flowers myself.',
    story: "Nobody asked me to plant the meadow. That's why I enjoyed it.",
    look: { fur: 0xc4424f, limbs: 0xc4424f, paws: 0xfaf3f3, iris: 0xb05a9c, style: 'fluffy', extras: ['heart'] },
  },
  {
    id: 'mangata', name: 'Mångata', home: [-58, 296],
    meaning: 'Swedish: the road of moonlight across water',
    hello: 'Come back at night. The sea lays out a path.',
    story: "On clear nights I walk the moon's road as far as the tide lets me.",
    look: { fur: 0xeeedf2, limbs: 0xe2e0ea, iris: 0x6a4a9c, style: 'smooth', extras: ['antlersPale', 'smallEars'] },
  },
  {
    id: 'wabisabi', name: 'Wabi Sabi', home: [-150, 150],
    meaning: 'Japanese: the beauty of the worn and imperfect',
    hello: 'Bit scruffy, bit patched. Just right.',
    story: "This patch is from a storm. This one I don't remember. I'd keep them all.",
    look: { fur: 0x6f9c48, furLow: 0xa67748, lowAt: 0.12, lowSoft: 0.18, limbs: 0xa67748, iris: 0xdc7a1e, style: 'shaggy', extras: ['patches'] },
  },
];

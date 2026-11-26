/**
 * Everything that is said in Veloria. Scripts play line by line; a choice's
 * reply lines are inserted after it. `action` names are handled by the store.
 */

export type Speaker = 'him' | 'you' | 'narr' | 'cass';

export interface Choice {
  text: string;
  /** heart = romantic, ask = curious, wry = teasing, spicy = intimate */
  tone?: 'heart' | 'ask' | 'wry' | 'spicy';
  aff?: number;
  /** whose affection the choice moves (Lucien by default) */
  to?: 'cass';
  flag?: string;
  reply?: Line[];
}

export interface Line {
  who: Speaker;
  text: string;
  action?: string;
  choices?: Choice[];
  /** switch the painted scene behind the dialogue from this line on */
  cg?: string;
}

export type ScriptId =
  | 'wake'
  | 'meet'
  | 'q1_done'
  | 'q2_done'
  | 'q3_done'
  | 'ending1'
  | 'wake2'
  | 'q4_done'
  | 'q5_done'
  | 'mem_boats'
  | 'mem_ledge'
  | 'idle_ch1'
  | 'idle_ch2'
  | 'idle_free'
  | 'wake3'
  | 'q6_done'
  | 'q7_done'
  | 'mem_almost'
  | 'mem_lamp'
  | 'idle_cass';

const n = (text: string, action?: string): Line => ({ who: 'narr', text, action });
const h = (text: string, action?: string): Line => ({ who: 'him', text, action });
const c = (text: string, action?: string): Line => ({ who: 'cass', text, action });

export const SCRIPTS: Record<ScriptId, Line[]> = {
  wake: [
    n('Grass, cool beneath your cheek. The scent of blossom. You do not remember falling asleep here.'),
    n('Above you, a single petal hangs in the air. It does not fall.'),
    n('Wherever this is, it is very, very quiet.'),
  ],

  meet: [
    n('Someone is sitting on the steps of the clock tower: the first thing in this city you have seen move.'),
    n('He is turning a pocket watch over in his hands, over and over, the way you might worry a smooth stone.'),
    h("...Don't. Whatever you are, don't vanish yet. Let me look at you first."),
    {
      who: 'you',
      text: '',
      choices: [
        { text: "I'm not going anywhere.", tone: 'heart', aff: 3, reply: [h("People say that. Well — people used to say that. There hasn't been anyone to say anything in a very long time.")] },
        { text: 'Where am I?', tone: 'ask', aff: 1, reply: [h('Veloria. The loveliest city in the world, if you can bear the silence.')] },
        { text: 'Who are you?', aff: 1, reply: [h("Someone who has been talking to a fountain for longer than he'd care to admit.")] },
      ],
    },
    h("You're real. You're breathing. The petals don't stir when I pass them, but your hair moved when you turned. I saw it."),
    h("How did you get in? There is no way in. Believe me — I've spent a very long time looking for the way out."),
    {
      who: 'you',
      text: '',
      choices: [
        { text: "I fell asleep. I think I'm dreaming.", tone: 'ask', aff: 2, reply: [h("Then you're the first dream I've had in — I don't actually know how long. Time is a delicate subject here.")] },
        { text: "I woke beneath a tree. That's all I know.", aff: 1, reply: [h("The old blossom by the woods. Of course. It's the only thing here that ever looked as though it were waiting for someone.")] },
      ],
    },
    n('He stands. He is taller than you expected, and his cloak is worn thin at the hem, as though it has walked the same streets ten thousand times.'),
    n('He offers you his hand. When your fingers touch —'),
    n('— high above you, something enormous shudders.', 'clockStart'),
    n('Tick.'),
    h('...That clock has not moved in ninety-seven years.'),
    {
      who: 'you',
      text: '',
      choices: [
        { text: 'Did I do that?', tone: 'heart', aff: 2, reply: [h("I think we did. I've laid my hand on that tower a thousand times. Apparently it was waiting for yours.")] },
        {
          text: "Ninety-seven years? You don't look a day over thirty.",
          tone: 'wry',
          aff: 3,
          reply: [h("I was twenty-nine when it stopped. I'm told I've aged rather well."), n('He laughs — and looks startled, as if he had forgotten he knew how.')],
        },
        { text: 'Is that a good thing?', tone: 'ask', aff: 1, reply: [h("I have no idea. It's the first new thing to happen in a century. I'm choosing to be delighted.")] },
      ],
    },
    h("Look — the light. Little sparks, all over the square. They weren't there before you came."),
    h("Walk with me? I'd like to know what else you can wake.", 'follow'),
  ],

  q1_done: [
    h('A rosebud. In Veloria. Do you know when something last grew here?'),
    {
      who: 'you',
      text: '',
      choices: [
        { text: 'Tell me.', tone: 'ask', aff: 1, reply: [h("Neither do I. That's rather the point.")] },
        { text: "It's for you.", tone: 'heart', aff: 3, reply: [n('He takes it as though it were made of glass.'), h("No one's given me anything in a hundred years. I'm going to be insufferable about this.")] },
      ],
    },
    h('The fountain in the square was the first thing to stop. I watched it happen. If anything could start again...'),
  ],

  q2_done: [
    n('The suspended water trembles. Then, all at once, it remembers that it is water.'),
    h('Oh.'),
    n('He says it so quietly you almost miss it.'),
    h('I used to sit here every evening. Before. That sound was the sound of home.'),
    {
      who: 'you',
      text: '',
      choices: [
        {
          text: 'Then sit with me now.',
          tone: 'heart',
          aff: 3,
          reply: [n('He sits beside you on the rim. Not touching. Close enough that you feel the warmth of him — which is strange, because nothing else here is warm.')],
        },
        {
          text: 'What happened to everyone?',
          tone: 'ask',
          aff: 1,
          reply: [h("They're still here, in a way. Behind every window, someone is mid-sentence. I stopped looking in. It felt like reading their letters.")],
        },
        {
          text: "You never told me your name.",
          tone: 'wry',
          aff: 2,
          reply: [h("Didn't I? There's been no one to tell. Ask me again in the garden. Let me keep one secret a little longer.")],
        },
      ],
    },
    h("There's a garden on the west side. My mother planted half of it. I'd like you to see it awake."),
  ],

  q3_done: [
    n('Petals unfurl in a slow wave, bed by bed, until the whole garden is breathing colour.'),
    n('Somewhere above you, for the first time, a bird sings.'),
    h('Lucien.'),
    n('He says it to the roses first. Then to you.'),
    h('My name. Lucien Vale. I thought you ought to have it, in case —', 'knowName'),
    {
      who: 'you',
      text: '',
      choices: [
        { text: 'In case what?', tone: 'ask', aff: 2, reply: [h("In case you don't come back. I'd like to be remembered as something other than 'the man by the clock'.")] },
        { text: 'Lucien. It suits you.', tone: 'heart', aff: 3, reply: [h("Does it? It's been so long since anyone said it aloud, I wasn't sure it still fit.")] },
      ],
    },
    h("And yours? No — don't. Tell me next time. Then there has to be a next time."),
    n('He reaches out and tucks a Velorian rose behind your ear. His fingers are careful, as if you might break. Or worse, disappear.'),
  ],

  ending1: [
    n('The edges of the garden begin to blur, like ink dropped in water.'),
    h('Your hands —'),
    n('You look down. You can see the roses through your fingers.'),
    {
      who: 'you',
      text: '',
      choices: [
        { text: "I'll come back. I promise.", tone: 'heart', aff: 3, reply: [h("Don't promise. Just — try. I'm very good at waiting.")] },
        { text: "Lucien, what's happening?", tone: 'ask', aff: 1, reply: [h('I think you are waking up. I think somewhere, the morning has found you.')] },
      ],
    },
    n('He says something else. You see his lips move. But the sound has already gone, and so has the light, and so —', 'vanish'),
    n('He stays in the garden until the clock strikes midnight. Then one. Then two.', 'aloneShot'),
    n('The fountain sings. The roses breathe. And the city, for the first time in ninety-seven years, is not silent.'),
    n('But she does not come back.'),
    n('Not tonight.', 'endChapter1'),
  ],

  wake2: [
    n("Grass. Blossom. That same impossible stillness — except it isn't still. Somewhere, water is singing."),
    n('A petal drifts past your face and, this time, it falls.'),
    h('You came back...'),
    h("I wasn't sure you would."),
    {
      who: 'you',
      text: '',
      choices: [
        { text: 'I always will.', tone: 'heart', aff: 4, reply: [h("Careful. I'll hold you to that — and I have nothing but time.")] },
        { text: 'Tell me the truth.', tone: 'ask', aff: 1, reply: [h("About what? No — I know what. Later. Let me have one moment where you're simply here.")] },
        {
          text: 'Can we ever leave here?',
          tone: 'wry',
          aff: 2,
          reply: [h("I don't know. But a week ago I'd have sworn that clock could never move. I've become a terrible judge of impossible things.")],
        },
      ],
    },
    h('It has been six days. For me. The clock kept ticking after you left — I counted every hour, so I would have something to tell you.'),
    n('Six days. You have slept a single night.'),
    h('You kept your name from me. At my request, I know. I have regretted it for six days. Will you give it to me now?'),
    {
      who: 'you',
      text: '',
      choices: [
        {
          text: "It's {name}.",
          tone: 'heart',
          aff: 3,
          reply: [n('He repeats it under his breath, as though testing whether the city will allow it.'), h('{name}. I am going to say it far too often. I apologise in advance.')],
        },
        {
          text: 'Guess.',
          tone: 'wry',
          aff: 2,
          reply: [h('Something from a story. Something that makes clocks start.'), n('You tell him. {name}.'), h('{name}. Yes. Of course it is.')],
        },
        {
          text: 'Come closer and I will whisper it.',
          tone: 'spicy',
          aff: 4,
          reply: [n('He does. You feel him hold his breath. When you say it, his eyes close.'), h('{name}. Say it to me like that again and I will forget there was ever a curse.')],
        },
      ],
    },
    h("I wrote you a letter. Is that ridiculous? Don't read it in front of me.", 'letter:sixdays'),
    h("And I found something while you were gone. Hollow & Quill — the bookshop. There's a new lock on its door. A brass one. It wasn't there before the city stopped."),
    h('Someone locked it afterwards. Which means someone else was here.', 'follow'),
  ],

  q4_done: [
    n('The key turns with a sound like a sigh. Inside, the lamps flicker — and then, unbelievably, the kettle begins to whistle.'),
    h('Mrs Hollow’s tea. She was so cross about being interrupted.'),
    n('On the counter lies a single envelope, addressed in a looping hand: To the Keeper of Veloria.'),
    n('Beneath it, in different ink, someone has added: and to whoever wakes him.'),
    h("...That's my mother's handwriting."),
    {
      who: 'you',
      text: '',
      choices: [
        { text: 'Do you want me to open it?', tone: 'heart', aff: 3, reply: [h("Yes. No. Yes. Read it to me — I don't trust my hands.")] },
        {
          text: 'Keeper of Veloria?',
          tone: 'ask',
          aff: 2,
          reply: [h('My family wound the great clock for two hundred years. I was the last. I was meant to wind it the night it stopped.')],
        },
      ],
    },
    n('The letter is short. It speaks of a bargain: a city kept safe from time, and a price.', 'letter:keeper'),
    h('"Its keeper must remain, until one from beyond the dream finds their way in."'),
    h("From beyond the dream. That's you."),
    h("So the clock didn't start because of me. It started because you found me."),
  ],

  q5_done: [
    n('Deep within the tower, gears that have not turned in a century catch, and hold, and turn.'),
    n('The great bell swings. Once. The sound rolls over the rooftops, and every bird in Veloria takes flight at once.'),
    h('Do you hear that? Somewhere, a door just opened.'),
    h('The letter said the bargain ends when the hours are restored. All of them.'),
    {
      who: 'you',
      text: '',
      choices: [
        { text: "Then we'll restore every one.", tone: 'heart', aff: 3, reply: [h('We. I like that word in your voice.')] },
        {
          text: 'And if they are — what happens to you?',
          tone: 'ask',
          aff: 2,
          reply: [h("Either I walk out of this city beside you, or I simply... stop. Like everything else did. I've decided not to think about which.")],
        },
      ],
    },
    n('Far below, a lamplighter you have never seen before turns mid-stride and looks up at the tower. Then he is still again.'),
    n('Lucien did not see it. You decide not to tell him. Not yet.', 'endChapter2'),
  ],

  wake3: [
    { who: 'narr', text: 'Night, this time. Real night: the kind that moves. Somewhere, a dog barks, and then looks embarrassed about it.', cg: 'cg_cassian' },
    n('The lamps along the canal are dark. All but one, which is being lit, very carefully, by a man on a ladder.'),
    c('Careful — the cobbles are slick when the dew comes back. Took a hundred years, but it came back.'),
    c("You must be the dreamer. He's told the fountain all about you. The fountain, in turn, has told me."),
    {
      who: 'you',
      text: '',
      choices: [
        {
          text: 'Who are you?',
          tone: 'ask',
          aff: 2,
          to: 'cass',
          reply: [
            c("Cassian Ashby. I light the lamps. Or I did, before. Lately I've mostly stood very still and waited for someone to notice I'm not a statue."),
            { who: 'narr', text: 'He tips an imaginary hat. The real one fell in the canal in 1928.', action: 'knowCass' },
          ],
        },
        {
          text: "Where's Lucien?",
          aff: 1,
          reply: [c('Up the tower, I would wager. Winding something. He winds things when he is worried.'), { who: 'narr', text: '"Cassian Ashby," he adds. "Lamplighter. Charmed."', action: 'knowCass' }],
        },
        {
          text: "You're staring.",
          tone: 'spicy',
          aff: 4,
          to: 'cass',
          reply: [c("You're worth staring at. Don't tell him I said that."), { who: 'narr', text: '"Cassian Ashby," he says, and does not look away. "At your service. Any service."', action: 'knowCass' }],
        },
      ],
    },
    n('His lantern swings. In its light his eyes are the colour of honey and something sharper.'),
    c("I'll be honest, since you'll find out anyway. That was my lock on the bookshop door."),
    {
      who: 'you',
      text: '',
      choices: [
        {
          text: 'Why would you hide that letter?',
          tone: 'ask',
          aff: 2,
          to: 'cass',
          reply: [c('Because Isolde asked me to keep it from him until someone came who could carry it. I have kept a great many things for a great many years.')],
        },
        {
          text: 'Does Lucien know?',
          aff: 2,
          reply: [c("No. And I'd like to be the one to tell him. Will you let me?"), n('You find, to your surprise, that you nod.')],
        },
      ],
    },
    c('Help me with the lamps along the water? He finds his way home by them. He always has.', 'follow'),
  ],

  q6_done: [
    { who: 'narr', text: 'One by one, the canal lamps catch. Their light falls into the water and floats there, gold on black.', cg: 'cg_cassian' },
    n('Someone is crossing the bridge too quickly. He stops when he sees who you are with.'),
    h('{name}.'),
    h('...Cassian.'),
    c('Keeper.'),
    n('The air between them is very old.'),
    h("You're awake."),
    c("Since the bell. You're welcome, by the way. Somebody had to keep the lamps oiled."),
    {
      who: 'you',
      text: '',
      choices: [
        { text: 'Lucien. I was looking for you.', tone: 'heart', aff: 3, reply: [n('Something in his shoulders lets go.'), h("Were you? Good. I was — the tower. Never mind the tower.")] },
        {
          text: "Cassian's been keeping me company.",
          tone: 'wry',
          aff: 3,
          to: 'cass',
          reply: [n("Lucien's jaw tightens. He says nothing at all, which is somehow worse."), c("Don't sulk, Vale. It ages you. Well — it would.")],
        },
        { text: 'You two know each other?', tone: 'ask', aff: 1, reply: [c('We grew up three streets apart. He was insufferable then, too.'), h('He stole my kite. In 1911.'), c('Borrowed.')] },
      ],
    },
    c("Tonight's the Lantern Festival. It was, the night everything stopped. Shall we finish it? The square needs light, and flowers, and a little borrowed time."),
  ],

  q7_done: [
    { who: 'narr', text: 'Strings of light leap from roof to roof across the square. Somewhere, impossibly, a fiddle starts up.', cg: 'cg_dance' },
    h('Dance with me. I have been practising with the fountain. It is a poor partner.'),
    {
      who: 'you',
      text: '',
      choices: [
        { text: 'Yes.', tone: 'heart', aff: 3, reply: [n('He takes your hand as though it is the answer to something.')] },
        {
          text: 'Only if you hold me closer than that.',
          tone: 'spicy',
          aff: 5,
          reply: [n('He does. His hand settles at the small of your back and stays there, warm through your dress.'), h('Like this?'), n('Closer.')],
        },
      ],
    },
    n('The lanterns turn above you. For one song, there is no curse, no bargain, no morning. Only the two of you, and the music, and his breath catching every time you look up.'),
    { who: 'narr', text: 'Later, by the archway, a lantern swings into your path.', cg: 'cg_cassclose' },
    c('A word, dreamer. Before midnight finds us.'),
    c('The bargain needs a keeper. If Lucien walks out of Veloria with you, someone has to stay. I have been ready for a hundred years.'),
    {
      who: 'you',
      text: '',
      choices: [
        { text: 'Why would you do that for him?', tone: 'ask', aff: 3, to: 'cass', reply: [c('For him? No. Because someone ought to get to leave. And because you look at him the way no one has ever looked at me.')] },
        {
          text: 'Cassian...',
          tone: 'spicy',
          aff: 5,
          to: 'cass',
          reply: [n('He tilts your chin up with one finger. Lantern light pools between you.'), c("Don't. Don't look at me like that unless you mean it.")],
        },
      ],
    },
    { who: 'narr', text: 'On the bridge, a pocket watch catches the light.', cg: 'cg_jealous' },
    n('Lucien has seen everything. Or enough.'),
    n('He turns and walks into the dark before you can say his name.', 'endChapter3'),
  ],

  mem_almost: [
    { who: 'narr', text: 'He finds you beneath the clock face, where the hands sweep past so close you can hear them breathe.', cg: 'cg_almost' },
    h('I keep thinking that if I kiss you, you will wake up.'),
    {
      who: 'you',
      text: '',
      choices: [
        { text: 'Then let me wake.', tone: 'spicy', aff: 5, reply: [n('His forehead rests against yours. The clock ticks once, twice. Neither of you moves away.'), h('Not yet. Let me have the almost a little longer.')] },
        { text: 'Then I will dream of you instead.', tone: 'heart', aff: 4, reply: [h('That is the most dangerous thing anyone has ever said to me.')] },
      ],
    },
  ],

  mem_lamp: [
    { who: 'narr', text: 'Cassian lets you light the last lamp on the canal. He stands behind you to steady the pole, closer than he needs to.', cg: 'cg_cassian' },
    c('There. Now there is a light in Veloria that is entirely yours.'),
    {
      who: 'you',
      text: '',
      choices: [
        { text: 'You could have done it yourself.', tone: 'wry', aff: 3, to: 'cass', reply: [c('I could. I wanted to watch you do it.')] },
        { text: 'Stay like this a moment.', tone: 'spicy', aff: 5, to: 'cass', reply: [n('He does not move. You feel him smile against your hair.'), c('A moment. I have a hundred years of them saved up.')] },
      ],
    },
  ],

  idle_cass: [c('The lamps like you. I like you. The lamps have better judgement, admittedly.')],

  mem_boats: [
    n('You find him at the canal, folding a torn page into a paper boat with great seriousness.'),
    h("When I was a boy we'd race these to the bridge. Loser had to confess something."),
    h('Mine is faster. Obviously.'),
    {
      who: 'you',
      text: '',
      choices: [
        { text: 'Then what will you confess?', tone: 'wry', aff: 3, reply: [h("That I let you win. And that I've been folding boats every night since you left, so I'd be ready.")] },
        { text: 'Teach me how.', tone: 'heart', aff: 3, reply: [n('His hands guide yours through each fold. He is a terrible teacher. He keeps forgetting what comes next.')] },
      ],
    },
    n('Two small boats drift towards the bridge, side by side. Neither of you watches to see which wins.'),
  ],

  mem_ledge: [
    n('He leads you up a narrow stair to a ledge beneath the clock face, where the whole city lies below like a story left open.'),
    h('I came up here every night. I could see the edge of everything from here. I used to imagine the world beyond it.'),
    h('I never imagined you. I want you to know that. I would not have dared.'),
    {
      who: 'you',
      text: '',
      choices: [
        { text: 'Lean on me.', tone: 'heart', aff: 4, reply: [n('He does. His head is warm against your shoulder, and for a long while neither of you counts anything at all.')] },
        { text: 'What did you imagine instead?', tone: 'ask', aff: 2, reply: [h('Trains. Rain. Being late for something. Can you imagine? Being late. It sounds glorious.')] },
      ],
    },
  ],

  idle_ch1: [h("Every light you gather feels like the city taking a breath. Keep going — I'm right behind you.")],
  idle_ch2: [h("Mrs Hollow's lock, the tower, the letter... someone wanted this city kept just so. I'd like very much to know who.")],
  idle_free: [h('Stay a little longer. The night is young, and for once it is actually moving.')],
};

export const IDLE_LINES = [
  "I used to know every crack in these cobbles. Now I'd rather look at you.",
  'Do you dream of me, on the other side? Or only of here?',
  "The clock sounds different when you're near. Quicker. Don't laugh.",
  'There was a baker on this corner who sang flat every morning. I miss it more than I can say.',
  'If you find a pocket watch with a cracked glass, it was mine. I lost it to the canal in a temper.',
];

export const INSPECT: Record<string, string> = {
  fountain: 'The fountain is mid-leap. Water hangs in glass-clear arcs, every droplet perfectly still. You touch one. It is cool, and it does not move.',
  bird: 'A sparrow, caught a wingbeat from flight. Its eye is bright. You have the strangest feeling it is waiting for permission.',
  garden: 'Every flower in the garden is closed tight, as if each one fell asleep mid-thought.',
  bookshop:
    '"Hollow & Quill — Books, Maps & Remedies." The door is locked. Through the glass, a cup of tea sits beside an open book, still steaming. The steam does not rise.',
  canal: 'The canal is a sheet of still glass. A paper boat sits upon it, frozen mid-ripple.',
  tree: 'Tucked between the roots is a folded note. The paper is old and soft. The handwriting is yours.',
  lamp: 'A street lamp, its flame caught in a single upward flicker, like a painting of fire.',
  fountain_alive: 'The fountain chatters to itself, delighted to be heard again.',
  garden_alive: 'Bees you could swear were not here a moment ago are working the roses with great urgency.',
  bookshop_alive: 'Through the window, the kettle steams. The page of the open book has turned.',
};

export type LetterId = 'roots' | 'sixdays' | 'keeper';

export interface Letter {
  id: LetterId;
  title: string;
  from: string;
  body: string[];
  sign: string;
}

export const LETTERS: Record<LetterId, Letter> = {
  roots: {
    id: 'roots',
    title: 'A note among the roots',
    from: 'In your own handwriting',
    body: [
      "Don't be afraid.",
      "You have been here before, though you won't remember it. Neither will he.",
      'Find the clock. Stay as long as the dream allows.',
      "And whatever he tells you — he's worth it.",
    ],
    sign: '— You',
  },
  sixdays: {
    id: 'sixdays',
    title: 'Six days',
    from: 'Lucien Vale',
    body: [
      'I have begun this letter eleven times. The fountain has heard every draft and is unimpressed.',
      'The clock has ticked 518,400 times since you left. I know because I counted, and I know that is not a normal thing to confess.',
      'I do not know your name. I know that you tilt your head when something surprises you, and that you laughed at the sparrow. That will have to do until you come back.',
      'If you come back.',
      'When.',
    ],
    sign: '— L.',
  },
  keeper: {
    id: 'keeper',
    title: 'To the Keeper of Veloria',
    from: 'Isolde Vale',
    body: [
      'My darling boy,',
      'If you are reading this, it worked, and I am sorry. I could not let time take the city, and so I asked the clock to keep it. Clocks, it turns out, drive a hard bargain.',
      'Its keeper must remain, until one from beyond the dream finds their way in. Only together can the hours be restored.',
      'Be patient. Be kind to them. And Lucien — let yourself be found.',
    ],
    sign: '— Mother',
  },
};

export interface StoryPage {
  title: string;
  /** progress step that unlocks this page */
  unlock: number;
  art: 'tower' | 'tree' | 'meet' | 'fountain' | 'alone' | 'return' | 'bookshop' | 'bell' | 'lamp' | 'dance';
  text: string[];
}

export interface ChapterDef {
  num: string;
  title: string;
  pages: StoryPage[];
  /** step that unlocks the chapter itself */
  unlock: number;
}

/** progress steps, in order */
export const STEP = {
  title: 0,
  prologue: 1,
  wake: 2,
  explore: 3,
  q1: 4,
  q2: 5,
  q3: 6,
  ending1: 7,
  ch1End: 8,
  wake2: 9,
  q4: 10,
  q5: 11,
  ch2End: 12,
  wake3: 13,
  q6: 14,
  q7: 15,
  ch3End: 16,
} as const;

export const CHAPTERS: ChapterDef[] = [
  {
    num: 'I',
    title: 'The City That Never Woke',
    unlock: STEP.prologue,
    pages: [
      {
        title: 'One More Chapter',
        unlock: STEP.prologue,
        art: 'tower',
        text: [
          'You fell asleep the way you always do: a novel open on your chest, the lamp still burning, promising yourself one more chapter.',
          'Somewhere between one sentence and the next, the room went soft at the edges. The words on the page began to rearrange themselves into rooftops, and spires, and a great clock with its hands at a quarter past eleven.',
          'And then you were somewhere else entirely.',
        ],
      },
      {
        title: 'The Silent Streets',
        unlock: STEP.explore,
        art: 'tree',
        text: [
          'You woke beneath a blossom tree on the edge of a city that had forgotten how to move.',
          'Petals hung in the air like stars. Water stood in arcs above a fountain. A sparrow waited, mid-flight, for a permission that never came.',
          'Among the roots you found a note in your own handwriting. You did not remember writing it.',
        ],
      },
      {
        title: 'The Man Beneath the Clock',
        unlock: STEP.q1,
        art: 'meet',
        text: [
          'He was the only thing in Veloria that moved: a dark-haired man on the clock tower steps, turning a pocket watch over and over in his hands.',
          '"Don\'t vanish yet," he said, as though he had been asked a great many times by a great many dreams.',
          'When your fingers touched his, the clock above you shuddered, and ticked, for the first time in ninety-seven years. Neither of you knew why.',
        ],
      },
      {
        title: 'What the Water Remembered',
        unlock: STEP.q3,
        art: 'fountain',
        text: [
          'Together you gathered the strange small lights that had followed you into the city, and from them you made things that had not existed here for a century: a rosebud, a gear, a reason.',
          'The fountain remembered it was water. He sat beside you on its rim and said "oh" so quietly you almost missed it.',
        ],
      },
      {
        title: 'A Name, and Then Nothing',
        unlock: STEP.ch1End,
        art: 'alone',
        text: [
          'In his mother\'s garden the flowers opened, all at once, and a bird sang. He gave you his name — Lucien — and a rose, and asked you to keep yours until next time, so that there would have to be one.',
          'Then the morning found you, and the garden ran like ink, and you were gone.',
          'He stayed until the clock struck midnight. Then one. Then two. The city was no longer silent. But she did not come back.',
          'Not tonight.',
        ],
      },
    ],
  },
  {
    num: 'II',
    title: 'You Came Back',
    unlock: STEP.wake2,
    pages: [
      {
        title: 'Six Days',
        unlock: STEP.wake2,
        art: 'return',
        text: [
          'The second night, the petals fell.',
          'He was waiting beneath the blossom tree as though he had never left it. For him, six days had passed. He had counted every hour so he would have something to tell you.',
          'He had also written you a letter, and asked you, very firmly, not to read it in front of him.',
        ],
      },
      {
        title: 'Hollow & Quill',
        unlock: STEP.q5,
        art: 'bookshop',
        text: [
          'Someone had put a new brass lock on the bookshop door after the city stopped. Someone else had been here.',
          'Inside, the kettle whistled for the first time in a century, and on the counter lay a letter in his mother\'s hand, addressed to the Keeper of Veloria — and to whoever wakes him.',
        ],
      },
      {
        title: 'The Keeper\'s Bargain',
        unlock: STEP.ch2End,
        art: 'bell',
        text: [
          'The great bell rang once, and every bird in Veloria rose into the sky.',
          'The bargain would end when the hours were restored. All of them. What would happen to him then, neither of you dared to say.',
          'And far below, a lamplighter turned, mid-stride, and looked up at the tower — before falling still again.',
          'You decided not to tell him. Not yet.',
        ],
      },
    ],
  },
  {
    num: 'III',
    title: 'A Night Without End',
    unlock: STEP.wake3,
    pages: [
      {
        title: 'The Last Lamp',
        unlock: STEP.wake3,
        art: 'lamp',
        text: [
          'The third night, the lamplighter was waiting.',
          'Cassian Ashby had golden hair and a borrowed kind of smile, and he confessed within minutes that it was his lock on the bookshop door. He had been keeping a promise to Lucien\'s mother for a hundred years.',
        ],
      },
      {
        title: 'Three Streets Apart',
        unlock: STEP.q7,
        art: 'lamp',
        text: [
          'The canal lamps caught one by one, and Lucien came across the bridge too quickly, and stopped.',
          'They had grown up three streets apart. There was a kite in 1911, and a great deal that neither of them said.',
        ],
      },
      {
        title: 'The Lantern Festival',
        unlock: STEP.ch3End,
        art: 'dance',
        text: [
          'They finished the festival the city never had. Lucien danced as though he had been practising for a century, which he had.',
          'Then Cassian told the truth about the bargain: someone must always stay. He had been ready for a hundred years.',
          'On the bridge, a pocket watch caught the light. Lucien walked into the dark before anyone could say his name.',
        ],
      },
    ],
  },
  { num: 'IV', title: 'The Cost of Time', unlock: 999, pages: [] },
];

export const TIERS = [
  { at: 0, name: 'Stranger', line: 'He watches you as though you might vanish.' },
  { at: 12, name: 'Curious', line: 'He has started saving things to tell you.' },
  { at: 28, name: 'Confidant', line: 'He tells you things he has never told the fountain.' },
  { at: 48, name: 'Kindred', line: 'He finds reasons to stand a little closer.' },
  { at: 72, name: 'Beloved', line: 'He no longer counts the hours when you are gone. He counts the ones when you are here.' },
];

export const TRAITS: { at: number; text: string }[] = [
  { at: 0, text: 'Turns a pocket watch over in his hands when he is thinking.' },
  { at: 8, text: 'Twenty-nine — or a hundred and twenty-six, depending on how you count.' },
  { at: 18, text: 'Laughs as though he is surprised he still remembers how.' },
  { at: 30, text: 'Last of the Vale family, keepers of the great clock.' },
  { at: 45, text: 'Hums when he thinks no one can hear. Always slightly flat.' },
  { at: 60, text: 'Afraid, more than anything, of being forgotten.' },
];

export const MEMORIES: { id: ScriptId; title: string; at: number; who: 'him' | 'cass'; step: number; blurb: string }[] = [
  { id: 'mem_boats', title: 'Paper Boats', at: 22, who: 'him', step: 10, blurb: 'A race to the bridge, and a confession for the loser.' },
  { id: 'mem_ledge', title: 'The Highest Window', at: 40, who: 'him', step: 10, blurb: 'The whole city below, like a story left open.' },
  { id: 'mem_almost', title: 'Beneath the Clock', at: 52, who: 'him', step: 14, blurb: 'If he kisses you, will you wake?' },
  { id: 'mem_lamp', title: 'The Last Lamp', at: 12, who: 'cass', step: 14, blurb: 'He lets you light it. He stands very close.' },
];

export const CASS_TRAITS: { at: number; text: string }[] = [
  { at: 0, text: 'Lamplighter of Veloria. Lights every lamp by hand, and tells each one goodnight.' },
  { at: 8, text: 'Kept a promise to Isolde Vale for a hundred years without telling anyone.' },
  { at: 18, text: 'Flirts the way other people breathe. Means it more than he lets on.' },
  { at: 30, text: 'Grew up three streets from Lucien. Still has the kite.' },
  { at: 45, text: 'Would stay in Veloria forever if it meant someone else could leave.' },
];

export const CASS_IDLE = [
  'Every lamp in this city has a name. That one is Margot. She is dramatic.',
  'He watches you when you are not looking, you know. So do I. We are both terrible.',
  'A hundred years of lighting lamps, and the brightest thing here walked in on two feet.',
  'If you ever want the city from the rooftops, I know a ladder.',
];

export const CASS_GIFT = ['For me? I shall have to light a lamp in its honour.', 'You do know how to make a lamplighter blush. It takes some doing.'];

export const GIFT_LINES: Record<string, string[]> = {
  bloom: ['You found this here? In my city? I may keep it forever.', 'My mother would have known its name. I only know I like it.'],
  clock: ["You're trying to make me feel at home. It's working.", 'A clockmaker\'s son, given clockwork. You do pay attention.'],
  crystal: ['It looks like moonlight decided to stay. Thank you.', 'I shall put it on the windowsill, where the light can find it.'],
  key: ['A key. You do know how to flirt with a man who is trapped.', 'I will find out what this opens. Then I will tell you first.'],
  ink: ['You brought me something to read. Do you know how long I have reread the same eleven books?', 'Words. From you. I will be unbearable about this.'],
  time: ['A little time. The most romantic thing anyone has ever given me.', 'I will spend it on you. Obviously.'],
};

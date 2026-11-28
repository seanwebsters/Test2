export type LessonStep =
  | { kind: 'learn'; title: string; text: string }
  | { kind: 'quiz'; q: string; options: string[]; answer: number; explain: string }
  | { kind: 'practice'; title: string; text: string; reps: number };

export interface Lesson {
  id: string;
  title: string;
  minutes: number;
  trick?: { id: string; name: string };
  plus?: boolean;
  steps: LessonStep[];
}

export interface Unit {
  id: string;
  title: string;
  color: string;
  soft: string;
  free: boolean; // welfare-critical units are always free
  lessons: Lesson[];
}

export const UNITS: Unit[] = [
  {
    id: 'basics',
    title: 'The basics',
    color: '#5fae7a',
    soft: '#e1f0d9',
    free: true,
    lessons: [
      {
        id: 'name',
        title: 'The name game',
        minutes: 3,
        trick: { id: 'perk', name: 'Ear perk' },
        steps: [
          { kind: 'learn', title: 'Their name = good things', text: 'Say {dog}’s name once in a happy voice. The moment they look at you, say “yes!” and give a treat. Their name should always predict something lovely.' },
          { kind: 'quiz', q: '{dog} ignores their name. What should you do?', options: ['Repeat it louder', 'Make it easier: move closer, try somewhere quieter', 'Tell them off'], answer: 1, explain: 'Set them up to succeed. Repeating a name teaches dogs it’s background noise.' },
          { kind: 'practice', title: 'Try it now', text: 'Say {dog}’s name. Look → “yes!” → treat. Tap each time it works.', reps: 5 },
        ],
      },
      {
        id: 'sit',
        title: 'A lovely sit',
        minutes: 4,
        steps: [
          { kind: 'learn', title: 'Lure, don’t push', text: 'Hold a treat at {dog}’s nose and slowly move it up and back over their head. As their bottom touches down, mark “yes!” and reward. Never press on their back.' },
          { kind: 'quiz', q: 'When do you add the word “sit”?', options: ['From the very first try', 'Once they’re reliably following the lure', 'Never'], answer: 1, explain: 'Add the cue once the behaviour happens smoothly, so the word attaches to the right action.' },
          { kind: 'practice', title: 'Five happy sits', text: 'Lure, mark, reward. Tap for each sit.', reps: 5 },
        ],
      },
      {
        id: 'recall',
        title: 'Come back to me',
        minutes: 5,
        steps: [
          { kind: 'learn', title: 'Be the best thing around', text: 'Start indoors. Say “{dog}, come!” once, crouch, and celebrate wildly when they reach you. Use extra-tasty treats for recall only.' },
          { kind: 'quiz', q: '{dog} finally comes back after ages. You…', options: ['Scold them for taking so long', 'Throw a party — treats and praise!', 'Ignore them'], answer: 1, explain: 'Always reward arriving. Scolding teaches that coming back is a bad idea.' },
          { kind: 'practice', title: 'Indoor recalls', text: 'From a few steps away: call, celebrate. Tap for each one.', reps: 4 },
        ],
      },
    ],
  },
  {
    id: 'understand',
    title: 'Understanding your dog',
    color: '#7b62c4',
    soft: '#ece5fb',
    free: true,
    lessons: [
      {
        id: 'tails',
        title: 'What tails really say',
        minutes: 3,
        steps: [
          { kind: 'learn', title: 'A wag isn’t always happy', text: 'A loose, sweeping wag with a wiggly body is joyful. A high, stiff, fast wag can mean tension. A tucked tail means worry. Read the whole body, not just the tail.' },
          { kind: 'quiz', q: 'Which wag is most relaxed?', options: ['High and stiff', 'Low, loose and swishing the whole bottom', 'Tucked between legs'], answer: 1, explain: 'Loose and wiggly is the happy one — the “helicopter” wag is pure joy.' },
        ],
      },
      {
        id: 'calming',
        title: 'Calming signals',
        minutes: 4,
        steps: [
          { kind: 'learn', title: 'Small signs, big feelings', text: 'Yawning when not tired, lip licking, turning the head away and sudden sniffing can be ways dogs say “I’m a bit uncomfortable”. Give space when you see them.' },
          { kind: 'quiz', q: 'A child hugs {dog}, who licks their lips and looks away. This means…', options: ['{dog} loves it', '{dog} is uncomfortable — gently end the hug', '{dog} is hungry'], answer: 1, explain: 'Most dogs don’t enjoy hugs. Offer a chin scratch instead and let them choose.' },
        ],
      },
      {
        id: 'rest',
        title: 'Why rest days matter',
        minutes: 2,
        steps: [
          { kind: 'learn', title: 'Calm is a superpower', text: 'Adult dogs often sleep 12–14 hours a day; puppies and seniors even more. Rest days with gentle sniffing and cuddles help bodies and brains recover. In WAG, rest days always count.' },
          { kind: 'quiz', q: 'After a big exciting day, a good next day is…', options: ['An even bigger adventure', 'A calm day with sniffing and naps', 'No attention at all'], answer: 1, explain: 'Rest days help stress hormones settle. Your streak is safe!' },
        ],
      },
    ],
  },
  {
    id: 'trust',
    title: 'Building trust',
    color: '#d0587a',
    soft: '#fbe1e8',
    free: true,
    lessons: [
      {
        id: 'consent',
        title: 'The consent check',
        minutes: 3,
        steps: [
          { kind: 'learn', title: 'Pet, pause, ask', text: 'Stroke for three seconds, then stop. If {dog} leans in or nudges you, carry on. If they move away or shake off, they’re done — and that’s fine.' },
          { kind: 'practice', title: 'Pet-pause-ask', text: 'Try it three times and notice {dog}’s answer.', reps: 3 },
        ],
      },
      {
        id: 'target',
        title: 'Hand target (boop!)',
        minutes: 4,
        trick: { id: 'boop', name: 'Boop' },
        steps: [
          { kind: 'learn', title: 'Nose to palm', text: 'Hold your flat palm near {dog}’s nose. The moment they sniff it, say “yes!” and treat from your other hand. Soon you can move your hand and they’ll follow.' },
          { kind: 'quiz', q: 'Why is hand targeting useful?', options: ['It guides dogs gently without pulling', 'It’s only a party trick', 'It replaces walks'], answer: 0, explain: 'Targeting helps with vet visits, moving off sofas and building confidence.' },
          { kind: 'practice', title: 'Five boops', text: 'Palm out, boop, “yes!”, treat.', reps: 5 },
        ],
      },
      {
        id: 'safe',
        title: 'A safe space',
        minutes: 3,
        steps: [
          { kind: 'learn', title: 'Somewhere that’s just theirs', text: 'Give {dog} a cosy spot where they’re never disturbed — no grabbing, no chasing. Drop the occasional treat there so it’s a place of good surprises.' },
          { kind: 'quiz', q: 'When {dog} retreats to their bed, you should…', options: ['Follow them for cuddles', 'Leave them be', 'Move the bed'], answer: 1, explain: 'Being left alone when they choose to rest builds enormous trust.' },
        ],
      },
    ],
  },
  {
    id: 'tricks',
    title: 'Fun tricks',
    color: '#d99a1c',
    soft: '#fdf0cf',
    free: true,
    lessons: [
      {
        id: 'paw',
        title: 'High paw',
        minutes: 4,
        trick: { id: 'wave', name: 'Paw wave' },
        steps: [
          { kind: 'learn', title: 'Wait for the paw', text: 'Close a treat in your fist near the floor. {dog} will sniff, lick… and eventually paw at it. Mark “yes!” the moment the paw lifts and open your hand.' },
          { kind: 'practice', title: 'Paw practice', text: 'Tap each time {dog} lifts a paw to your hand.', reps: 5 },
        ],
      },
      {
        id: 'spin',
        title: 'Twirl',
        minutes: 4,
        trick: { id: 'spin', name: 'Twirl' },
        steps: [
          { kind: 'learn', title: 'Draw a circle', text: 'With a treat at {dog}’s nose, slowly draw a big circle so they turn around. Reward at the end. Gradually make the hand movement smaller.' },
          { kind: 'quiz', q: '{dog} only turns halfway. You should…', options: ['Reward the half-turn and build up', 'Wait until it’s perfect', 'Push them round'], answer: 0, explain: 'Reward small steps. That’s how big tricks are built.' },
          { kind: 'practice', title: 'Five twirls', text: 'Tap for each twirl — half-twirls count!', reps: 5 },
        ],
      },
      {
        id: 'bow',
        title: 'Take a bow',
        minutes: 5,
        trick: { id: 'bow', name: 'Play bow' },
        steps: [
          { kind: 'learn', title: 'Elbows down, bottom up', text: 'From standing, lower a treat between {dog}’s front paws. Mark the moment elbows dip while their bottom stays up. It’s the dog word for “let’s play!”' },
          { kind: 'practice', title: 'Bow practice', text: 'Tap for each little bow.', reps: 4 },
        ],
      },
    ],
  },
  {
    id: 'outdoors',
    title: 'Confidence outdoors',
    color: '#5a9fd8',
    soft: '#e0eefa',
    free: true,
    lessons: [
      {
        id: 'loose',
        title: 'Loose-lead walking',
        minutes: 5,
        steps: [
          { kind: 'learn', title: 'Slack lead, good things', text: 'Reward {dog} for walking beside you with a loose lead. If the lead goes tight, stop and wait like a tree. When it slackens, carry on.' },
          { kind: 'quiz', q: 'The lead goes tight. Best response?', options: ['Yank it back', 'Stop and wait, then reward when it loosens', 'Run to keep up'], answer: 1, explain: 'Calm consistency teaches that pulling doesn’t work — but a loose lead does.' },
          { kind: 'practice', title: 'Tree game', text: 'On your next walk, tap each time you reward a loose lead.', reps: 5 },
        ],
      },
      {
        id: 'newthings',
        title: 'Brave with new things',
        minutes: 4,
        steps: [
          { kind: 'learn', title: 'Let them choose to look', text: 'When {dog} notices something new (a bin, a bike), stay calm and reward them for looking. Let them approach at their own speed — or not at all.' },
          { kind: 'quiz', q: '{dog} is nervous of a statue. You should…', options: ['Drag them up to it', 'Let them watch from a distance and reward calm', 'Leave immediately forever'], answer: 1, explain: 'Distance + choice + treats = confidence.' },
        ],
      },
      {
        id: 'findit',
        title: 'Find it!',
        minutes: 3,
        trick: { id: 'sniff', name: 'Super sniff' },
        steps: [
          { kind: 'learn', title: 'The best stress-buster', text: 'Say “find it!” and toss a treat onto the grass. Sniffing lowers heart rate and helps worried dogs feel better outdoors.' },
          { kind: 'practice', title: 'Five finds', text: 'Toss, “find it!”, celebrate.', reps: 5 },
        ],
      },
    ],
  },
  {
    id: 'play',
    title: 'Playing together',
    color: '#e06b4f',
    soft: '#fbe3dc',
    free: true,
    lessons: [
      {
        id: 'tugrules',
        title: 'Tug with rules',
        minutes: 4,
        steps: [
          { kind: 'learn', title: 'Take, drop, again', text: 'Invite {dog} to tug. After a few seconds, go still and offer a treat by their nose. When they drop, say “yes!” and restart the game. Drop = more fun, not the end.' },
          { kind: 'quiz', q: 'Is tug bad for dogs?', options: ['Yes, it makes them aggressive', 'No — with rules it’s brilliant play', 'Only on Tuesdays'], answer: 1, explain: 'Research suggests tug with rules builds bonds and impulse control.' },
        ],
      },
      {
        id: 'fetchdrop',
        title: 'Fetch that comes back',
        minutes: 5,
        steps: [
          { kind: 'learn', title: 'Two-toy trick', text: 'Throw toy one. When {dog} comes back, show toy two and make it exciting. They’ll drop the first to get the second. Swap, throw, repeat.' },
          { kind: 'practice', title: 'Two-toy fetch', text: 'Tap for each successful swap.', reps: 4 },
        ],
      },
    ],
  },
  {
    id: 'advanced',
    title: 'Advanced skills',
    color: '#3d3a6b',
    soft: '#e4e2f2',
    free: false,
    lessons: [
      {
        id: 'settle',
        title: 'Settle on a mat',
        minutes: 6,
        steps: [
          { kind: 'learn', title: 'Calm on cue', text: 'Reward {dog} for any interaction with a mat: looking, stepping, lying. Then quietly drop treats while they relax. Build up to calm minutes in cafés and pubs.' },
          { kind: 'practice', title: 'Mat moments', text: 'Tap each time {dog} chooses the mat.', reps: 5 },
        ],
      },
      {
        id: 'leaveit',
        title: 'Leave it',
        minutes: 6,
        plus: true,
        steps: [
          { kind: 'learn', title: 'Choosing you over that', text: 'Close a boring treat in your fist. When {dog} stops trying and backs off, mark and reward with a better treat from the other hand.' },
          { kind: 'quiz', q: 'Which treat does {dog} get?', options: ['The one in the closed fist', 'A better one from the other hand'], answer: 1, explain: 'Leaving it should pay better than taking it.' },
          { kind: 'practice', title: 'Fist game', text: 'Tap for each good choice.', reps: 5 },
        ],
      },
      {
        id: 'roll',
        title: 'Roll over',
        minutes: 7,
        plus: true,
        trick: { id: 'roll', name: 'Roll over' },
        steps: [
          { kind: 'learn', title: 'From a comfy down', text: 'With {dog} lying down on a soft surface, lure their nose toward their shoulder so they flop onto their side, then over. Only for dogs with happy backs and joints.' },
          { kind: 'practice', title: 'Rolling practice', text: 'Tap each time — partial rolls count.', reps: 3 },
        ],
      },
    ],
  },
];

export const ALL_LESSONS = UNITS.flatMap((u) => u.lessons.map((l) => ({ ...l, unit: u })));

import type { WorldId } from './types';

export interface Episode {
  id: string;
  title: string;
  world: WorldId;
  careers: string[];
  kicker: string;
  /** Paragraphs read aloud one by one. */
  parts: string[];
}

// All episodes are ORIGINAL, FICTIONAL composite stories written for this prototype.
// They are not real interviews and do not depict real people.
export const EPISODES: Episode[] = [
  {
    id: 'director-day', title: 'A Day in the Life of a Film Director', world: 'film', careers: ['film-director', 'video-editor'],
    kicker: 'Call time is 5:45am. The sun waits for nobody.',
    parts: [
      'Meet Maya. She is a fictional director, but her day is built from what directing really involves. Her alarm goes off at 4:50am, because today they are shooting a scene at sunrise, and the sun does not do second takes.',
      'By 5:45 she is on set: a car park dressed up to look like a seaside town. Thirty people are already there. Lighting crews, sound, make-up, catering. Everyone is looking at her for one thing: decisions.',
      'The first decision is small. The actor wants to say a line differently. Maya listens, tries it both ways, and picks the version that feels more honest. Directing, she says, is mostly choosing between two good options, fast.',
      'At 9am, it rains. The schedule collapses. This is the part nobody puts on social media. Maya and her assistant director rebuild the day in fifteen minutes, swapping an outdoor scene for an indoor one.',
      'Lunch is twelve minutes long and she spends it watching yesterday’s footage on a laptop, making notes for the editor.',
      'In the afternoon, there is a tiny moment she has been waiting for all week: a character turning away without speaking. They do it eleven times. On take eight, something real happens. She knows it instantly.',
      'She gets home at 9pm, tired and buzzing. Most directors start by making short films with friends and a phone. Maya did too. The skills are the same: tell a clear story, and help everyone around you do their best work.',
    ],
  },
  {
    id: 'founder-truth', title: 'What Nobody Tells You About Being a Founder', world: 'business', careers: ['entrepreneur', 'product-manager'],
    kicker: 'It’s less “boss life”, more “chief everything officer”.',
    parts: [
      'This is the story of Theo, a fictional founder, pieced together from how early-stage businesses really work. Theo started a business selling refillable cleaning products at 21, from his bedroom.',
      'Here is the first thing nobody tells you: you will do every job. On Monday he was a designer. On Tuesday, a delivery driver. On Wednesday, an accountant who did not understand accounting yet.',
      'The second thing: most of your first ideas will be wrong. Theo thought students would be his customers. They weren’t. Young parents were. Changing direction like that has a name: a pivot. It felt like failure. It was actually progress.',
      'The third thing: cash matters more than profit. Theo once had a huge order that nearly sank the business, because he had to pay for stock months before the customer paid him.',
      'The fourth: you need people. Mentors, other founders, a friend who will tell you the truth. Theo found most of his through free local startup events.',
      'And the last thing nobody tells you: it is allowed to stop. Plenty of founders run a business for a few years, learn an enormous amount, then take those skills somewhere else. That is not failure either.',
    ],
  },
  {
    id: 'f1-team', title: 'Inside a Formula 1 Engineering Team', world: 'engineering', careers: ['motorsport-engineer', 'aerospace-engineer', 'sports-analyst'],
    kicker: 'A thousandth of a second is a whole career’s work.',
    parts: [
      'Meet Priya, a fictional race engineer. Her story is invented, but the job is real. It is Friday practice and she is sitting at a pit wall covered in screens.',
      'The car is sending her data from hundreds of sensors: tyre temperatures, brake pressure, how the floor of the car flexes at 300 kilometres an hour.',
      'Her driver says over the radio that the rear feels nervous in fast corners. Priya’s job is to translate a feeling into numbers, and then numbers into a change.',
      'Back at the factory, hundreds of engineers are part of the same team: aerodynamicists testing tiny wing changes in a wind tunnel, designers drawing parts in CAD, mechanics who can change four tyres in about two seconds.',
      'Priya didn’t start in Formula 1. She did a mechanical engineering apprenticeship, joined a student racing team, and worked in a smaller racing series first.',
      'On Sunday, they finish fifth. The team celebrates like it is a win, because they understood the problem and fixed it. That, she says, is engineering: curiosity under pressure.',
    ],
  },
  {
    id: 'games-made', title: 'How Video Games Are Actually Made', world: 'tech', careers: ['game-developer', 'game-producer', 'sound-designer', 'animator'],
    kicker: 'Spoiler: it’s not just people playing games all day.',
    parts: [
      'This is a fictional tour of an imaginary studio called Lantern Games, built from how real game development works. Forty people are making one game. It will take them three years.',
      'Start at the design team. They are arguing, politely, about how high the character should jump. Too low feels sluggish. Too high breaks the levels. They will test it a hundred times.',
      'Next door, programmers turn those ideas into code. One is fixing a bug where a frog walks through walls. It has been happening for two days. Finding it will be the best part of their week.',
      'Artists and animators give everything personality. A sound designer is recording herself crunching a cabbage, because that is the perfect sound for a footstep in snow.',
      'The producer keeps everyone pointed in the same direction, deciding what gets cut so the game can actually ship. Cutting things you love is a huge part of making games.',
      'And then there is playtesting: watching real people get stuck, confused or delighted. Many people get into games through testing, community roles or game jams, where you make a tiny game in a weekend.',
    ],
  },
  {
    id: 'agency-life', title: 'What It’s Like to Work at a Creative Agency', world: 'creative', careers: ['creative-director', 'copywriter', 'brand-strategist', 'graphic-designer'],
    kicker: 'Big ideas, tight deadlines, a lot of sticky notes.',
    parts: [
      'Welcome to Northlight, a fictional creative agency. It is Monday morning and a brief has landed: a bike brand wants more teenagers cycling to school.',
      'First, the strategist goes digging. Why don’t teenagers cycle? She talks to real young people and finds the insight: it is not about fitness, it is about freedom.',
      'Then the creative teams get to work, usually in pairs: a writer and an art director. They fill walls with ideas. Most are bad. That is the point. You have to make a lot of bad ideas to find the good one.',
      'On Thursday, the creative director reviews everything. Three ideas survive. One gets a big laugh. That is usually a good sign.',
      'Next week they present to the client. The client loves one idea, hates the ending and wants it cheaper. This is normal. The team adapts.',
      'Agencies hire designers, writers, strategists, producers and account managers. Many start as juniors or apprentices with a portfolio of ideas they made just for fun.',
    ],
  },
  {
    id: 'architect-alt', title: 'Becoming an Architect Without a Traditional Background', world: 'engineering', careers: ['architect', 'interior-designer', 'carpenter'],
    kicker: 'From building site to design studio.',
    parts: [
      'Meet Jordan, a fictional architect whose route is based on real alternative pathways. Jordan left school at sixteen and became a carpentry apprentice.',
      'On building sites, Jordan kept noticing things: a staircase that was awkward to use, a kitchen with no daylight. “Who decided this?” they wondered. The answer was usually an architect.',
      'At twenty-one, Jordan started as an architectural technician, drawing detailed plans. Their site experience made them brilliant at it — they knew how things actually get built.',
      'Then came an architecture degree apprenticeship: working four days a week, studying one, with no tuition fees. It was hard work, but paid.',
      'Today Jordan designs homes and community buildings. Clients love that they can talk about bricks and budgets in the same breath.',
      'There is no single right route into architecture. University is one way. Apprenticeships, technician roles and trades are others. Different starting points often make the most interesting designers.',
    ],
  },
  {
    id: 'nurse-night', title: 'Twelve Hours on a Night Shift', world: 'health', careers: ['nurse', 'paramedic', 'doctor'],
    kicker: 'When the hospital goes quiet, the nurses don’t.',
    parts: [
      'This is a fictional night shift with Sophie, a children’s nurse, based on what ward nursing involves. Her shift starts at 7:30pm with a handover: the day team tells her everything about every patient.',
      'Her first job is medication rounds, checking every dose twice. Precision matters, but so does the way she explains things to a scared seven-year-old.',
      'At 2am, a patient’s breathing changes. Sophie spots it early, calls the doctor and they act fast. Noticing small changes is one of nursing’s biggest skills.',
      'At 4am she makes a cup of tea for a parent who can’t sleep. It’s not in any textbook, but it matters.',
      'Sophie trained through a nursing degree apprenticeship while working as a healthcare assistant. She says the best nurses are calm, curious and kind — in that order, on a busy night.',
    ],
  },
  {
    id: 'climate-jobs', title: 'The Jobs Fighting Climate Change', world: 'nature', careers: ['sustainability-consultant', 'renewables-technician', 'ecologist'],
    kicker: 'You don’t have to be a scientist to save the planet.',
    parts: [
      'This episode follows three fictional people with very different climate jobs. First, Kai, a wind turbine technician, who starts his day on a boat heading to an offshore wind farm.',
      'Kai climbs a hundred metres inside a turbine tower to check a gearbox. He trained through an apprenticeship and loves that his work powers thousands of homes.',
      'Next, Amara, a sustainability consultant, is helping a supermarket work out how much carbon its deliveries produce, and how electric vans could cut it.',
      'Finally, Ellis, an ecologist, is counting butterflies in a field that used to be a car park. The numbers have tripled in two years.',
      'Climate careers include engineers, electricians, designers, data analysts, lawyers and marketers. Almost any skill can be pointed at the planet’s biggest problem.',
    ],
  },
  {
    id: 'ai-designer', title: 'Designing How AI Talks to You', world: 'tech', careers: ['ai-product-designer', 'ux-designer', 'creative-technologist'],
    kicker: 'Someone decides what the robot says when it’s wrong.',
    parts: [
      'Meet Lena, a fictional AI product designer, a job that barely existed a few years ago. Her morning starts reading anonymised conversations where people got confused using her company’s assistant.',
      'She notices people trust the AI too much when it sounds confident. So she redesigns how it shows uncertainty, with clearer wording and options to check.',
      'In the afternoon she runs a test with students, watching them use a prototype. One student laughs at a joke the AI makes. Another finds it annoying. Both reactions are useful.',
      'Lena studied psychology, then taught herself design. She says the job is half empathy and half systems thinking, and nobody has it fully figured out yet. That’s what makes it exciting.',
    ],
  },
];

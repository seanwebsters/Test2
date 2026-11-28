import type { Activity, DiaryEntry, Dog, Personality, SceneKey } from './types';
import { pick, rng, uid } from './util';

/**
 * WAG's on-device "story engine". It writes a diary entry in the imagined voice
 * of the dog from the day's logged activities. This is a deterministic template
 * engine (no AI service is called) — clearly labelled as such in the UI.
 */

const OPENERS: Record<Personality, string[]> = {
  playful: ['Today was the BEST day. Possibly ever.', 'Dear Diary, guess what?! Everything happened today.', 'Today was a very good day, and I did at least four zoomies.'],
  gentle: ['Today was a very good day.', 'Dear Diary, today was soft and kind.', 'It was a quiet, lovely sort of day.'],
  curious: ['Dear Diary, today I learned many important things.', 'Today the world was full of questions, and I sniffed most of them.', 'Today was a very interesting day.'],
  brave: ['Today I was extremely brave.', 'Dear Diary, another day of fearless adventure.', 'Today was a very good day for exploring.'],
  cuddly: ['Today was a very good day, mostly because of cuddles.', 'Dear Diary, my favourite person was home and it was wonderful.', 'Today was warm and snuggly.'],
  cheeky: ['Today was a very good day. I was only a little bit naughty.', 'Dear Diary, I have some news and none of it is my fault.', 'Today I got away with almost everything.'],
  sleepy: ['Today was a very good day. I napped three times.', 'Dear Diary, I am writing this from bed.', 'Today was cosy from start to finish.'],
  social: ['Today I said hello to SO many friends.', 'Dear Diary, today was full of lovely faces.', 'Today was a very good day for making friends.'],
};

const CLOSERS: Record<Personality, string[]> = {
  playful: ['I can’t wait for tomorrow. Is it tomorrow yet?', 'I think tomorrow we should play again. And the day after.'],
  gentle: ['I hope tomorrow is just like today.', 'I think I’m the luckiest dog in the world.'],
  curious: ['I wonder what tomorrow smells like.', 'There is still so much world to sniff.'],
  brave: ['Tomorrow, more adventures. I am ready.', 'Nothing can stop us. Except bath time.'],
  cuddly: ['I fell asleep with my head on their foot. Perfect.', 'I love my human very much. Goodnight.'],
  cheeky: ['Tomorrow I will find a bigger stick. They can’t stop me.', 'I regret nothing. Goodnight.'],
  sleepy: ['And now… sleep. Goodnight.', 'Yawn. Same again tomorrow, please.'],
  social: ['I hope we see everyone again tomorrow.', 'Best day with my best friend.'],
};

function lineFor(a: Activity, owner: string, dog: Dog, r: () => number): string {
  const fav = dog.favourites[0];
  switch (a.type) {
    case 'walk': {
      const d = a.discoveries?.[0]?.replace(/^A /, 'a ').replace(/^An /, 'an ');
      const long = (a.minutes ?? 0) >= 25;
      const base = long
        ? pick(r, [`We went on a long walk${a.distanceKm ? ` — ${a.distanceKm.toFixed(1)} whole kilometres` : ''}.`, 'We went on a big adventure together.'])
        : pick(r, ['We went for a little walk.', 'We had a lovely wander.']);
      return d ? `${base} I found ${d}, which I think is the best one yet.` : `${base} My nose has never been so busy.`;
    }
    case 'quest':
      switch (a.category) {
        case 'explore':
          return pick(r, ['We went somewhere I’d never smelled before. It smelled of adventure and slightly of fox.', 'We explored a brand new place. I left my mark. Politely.']);
        case 'senses':
          return pick(r, ['I found three extraordinary smells. One was a mystery. I will think about it all night.', 'My nose did a lot of work today. It deserves a medal.']);
        case 'train':
          return pick(r, [`${owner} taught me something new and I was VERY clever. There were treats.`, 'We practised a new trick. I think I nearly got it, and I got a treat anyway.']);
        case 'bond':
          return pick(r, [`${owner} gave me the best scratches behind my ears. I leaned all the way in.`, 'We had a pampering session. I am now extremely handsome.']);
        case 'play':
          return fav === 'fetch'
            ? `${owner} threw the ball (again and again!). I brought it back almost every time.`
            : pick(r, ['We played my favourite game until I flopped over, happy.', 'We played and played. I won. Probably.']);
        case 'calm':
          return pick(r, ['We sat together quietly and watched the sky change colour. I could hear their heart.', 'We spent some quiet minutes together. No phone, just us.']);
        default:
          return 'We did something special together.';
      }
    case 'lesson':
      return `I practised “${a.title}” at Paw Academy. ${owner} said “yes!” in the happy voice.`;
    case 'rest':
      return pick(r, ['Today we didn’t go anywhere special, and that was perfect. We rested and I dreamt of rabbits.', 'It was a rest day. I did important lying down. My paws say thank you.']);
    case 'cuddle':
      return 'We spent the evening together on the sofa. Best seat in the house.';
    case 'gift':
      return `A friend sent me ${a.title.toLowerCase()}. I have a lot of friends, you know.`;
    case 'photo':
      return `${owner} took a photo of me. I was looking my very best.`;
    default:
      return '';
  }
}

function sceneFor(acts: Activity[], hour: number): { scene: SceneKey; props: string[] } {
  const props = new Set<string>();
  let scene: SceneKey = 'meadow';
  for (const a of acts) {
    if (a.discoveries?.some((d) => /stick/i.test(d))) props.add('stick');
    if (a.discoveries?.some((d) => /leaf|acorn|pinecone/i.test(d))) props.add('leaves');
    if (a.category === 'play') props.add('ball');
    if (a.category === 'explore' || a.type === 'walk') props.add('flowers');
    if (a.category === 'calm' && /sunset/i.test(a.title)) scene = 'sunset';
  }
  if (acts.some((a) => a.type === 'walk' && (a.minutes ?? 0) >= 25)) scene = scene === 'sunset' ? 'sunset' : 'woods';
  if (acts.every((a) => a.type === 'rest' || a.type === 'cuddle' || a.category === 'bond')) scene = 'sofa';
  if (hour >= 21 && scene === 'meadow') scene = 'night';
  if (acts.some((a) => a.category === 'play') && scene === 'meadow') scene = 'park';
  return { scene, props: [...props] };
}

const TITLES = ['A very good day', 'Sticks & sunshine', 'The smell of adventure', 'Just us two', 'A cosy kind of day', 'Paws and puddles', 'The best walk', 'Quiet and lovely', 'Brave little explorer', 'Sofa & sunset'];

export function writeDiary(opts: { day: string; dog: Dog; owner: string; activities: Activity[]; variant?: number; sample?: boolean }): DiaryEntry {
  const { day, dog, owner, activities, variant = 0 } = opts;
  const r = rng(`${day}:${dog.name}:${variant}`);
  const voice: Personality = dog.personality[variant % Math.max(1, dog.personality.length)] ?? 'gentle';
  const acts = activities.length ? activities : [{ id: 'x', ts: Date.now(), type: 'rest', title: 'Rest' } as Activity];
  const body: string[] = [pick(r, OPENERS[voice])];
  const seen = new Set<string>();
  for (const a of acts.slice(0, 4)) {
    const key = a.type + (a.category ?? '');
    if (seen.has(key)) continue;
    seen.add(key);
    const l = lineFor(a, owner, dog, r);
    if (l) body.push(l);
  }
  if (dog.favourites.includes('cuddles') && !seen.has('cuddle')) body.push('Then we spent the evening together on the sofa.');
  body.push(pick(r, CLOSERS[voice]));
  const hour = new Date(Math.max(...acts.map((a) => a.ts))).getHours();
  const { scene, props } = sceneFor(acts, hour);
  const photo = acts.find((a) => a.photo)?.photo;
  const mood = acts.some((a) => a.type === 'rest') ? 'Rested' : acts.length >= 3 ? 'Overjoyed' : 'Content';
  return {
    id: uid(),
    day,
    title: pick(r, TITLES),
    body,
    scene,
    props,
    mood,
    saved: false,
    photo,
    sample: opts.sample,
  };
}

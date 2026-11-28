import type { Answers, Sim, StepResult } from './types';

const pickOf = (a: Answers, step: string) => a[step] as string | undefined;
const avg = (r: Record<string, StepResult>) => {
  const v = Object.values(r);
  return v.length ? v.reduce((s, x) => s + x.score, 0) / v.length : 0;
};

// ───────────────────────── Creative Director ─────────────────────────
export const creativeDirector: Sim = {
  id: 'creative-director', title: 'Launch “Glow”', role: 'Creative Director', careerId: 'creative-director', world: 'creative',
  minutes: 4, glyph: 'bulb', preview: 'poster',
  client: 'Fizz & Co. — a fictional drinks brand',
  brief: 'Fizz & Co. is launching Glow, a sparkling fruit drink with no added sugar. They want a campaign that makes people under 25 actually care. You’re the creative director. Every call is yours.',
  steps: [
    {
      kind: 'choice', id: 'audience', title: 'Who is it for?', prompt: 'Pick the audience you’ll build the whole campaign around.',
      scout: 'Great campaigns talk to someone, not everyone.',
      options: [
        { id: 'students', label: 'Students & first-jobbers', detail: '18–24, social, skint, always on their phones', glyph: 'friends', score: 3, feedback: 'Sharp. A clear, reachable audience that matches the brief.', skills: ['analysis', 'commercial'] },
        { id: 'gym', label: 'Gym regulars', detail: 'Health-conscious, routine-driven', glyph: 'dumbbell', score: 2, feedback: 'Solid — “no added sugar” lands well here, but it narrows the brand.', skills: ['analysis'] },
        { id: 'creatives', label: 'Young creatives', detail: 'Artists, musicians, makers', glyph: 'palette', score: 2, feedback: 'Interesting niche with cultural pull — smaller but very loyal.', skills: ['curiosity'] },
        { id: 'everyone', label: 'Literally everyone', detail: 'Why limit ourselves?', glyph: 'globe', score: 0, feedback: 'Tempting, but a campaign for everyone usually excites no one.', skills: [] },
      ],
    },
    {
      kind: 'choice', id: 'concept', title: 'The big idea', prompt: 'Choose the creative concept.',
      options: [
        { id: 'main', label: 'Main Character Energy', detail: 'Glow makes ordinary moments feel like a film', glyph: 'film', score: 2, feedback: 'Culturally fluent and visual.', skills: ['creativity', 'storytelling'],
          combo: [{ step: 'audience', options: ['students', 'creatives'], delta: 1, note: 'It speaks your audience’s language perfectly.' }] },
        { id: 'fuel', label: 'Fuel the Grind', detail: 'Energy for long days', glyph: 'bolt', score: 1, feedback: 'Clear benefit, but “grind” culture can feel tired.', skills: ['commercial'],
          combo: [{ step: 'audience', options: ['gym'], delta: 1, note: 'Fits the gym crowd’s mindset.' }] },
        { id: 'tiny', label: 'Tiny Joys', detail: 'Celebrate small wins: a sunny bus seat, a good text', glyph: 'sun', score: 3, feedback: 'Warm, specific and shareable — strategists love an insight like this.', skills: ['creativity', 'empathy', 'storytelling'] },
        { id: 'science', label: 'Lab-Tested Refreshment', detail: 'Lead with the formula', glyph: 'flask', score: 0, feedback: 'Accurate, but facts alone rarely make people feel anything.', skills: ['analysis'] },
      ],
    },
    {
      kind: 'choice', id: 'visual', title: 'Visual direction', prompt: 'How should the campaign look? Watch the poster change.',
      options: [
        { id: 'neon', label: 'Neon pop', detail: 'Electric colours, bold type', glyph: 'bolt', score: 2, feedback: 'Eye-catching and young — make sure it doesn’t look like every energy drink.', skills: ['creativity'] },
        { id: 'pastel', label: 'Sunny pastel', detail: 'Soft gradients, friendly shapes', glyph: 'sun', score: 2, feedback: 'Fresh and optimistic.', skills: ['creativity'],
          combo: [{ step: 'concept', options: ['tiny'], delta: 1, note: 'Pastels and “Tiny Joys” feel made for each other.' }] },
        { id: 'mono', label: 'Bold monochrome', detail: 'Black, white, one splash of colour', glyph: 'star', score: 2, feedback: 'Confident and premium — it stands out on a busy feed.', skills: ['creativity'] },
        { id: 'retro', label: 'Retro 70s', detail: 'Warm oranges, groovy curves', glyph: 'music', score: 1, feedback: 'Fun nostalgia, but may feel borrowed rather than owned.', skills: ['curiosity'] },
      ],
    },
    {
      kind: 'choice', id: 'slogan', title: 'The line', prompt: 'Pick the slogan that goes on everything.',
      options: [
        { id: 's1', label: '“Glow on.”', glyph: 'chat', score: 3, feedback: 'Short, ownable, works on a can and a billboard.', skills: ['creativity', 'communication'] },
        { id: 's2', label: '“Refreshingly sugar-free sparkling fruit beverage.”', glyph: 'chat', score: 0, feedback: 'That’s a product description, not a slogan.', skills: [] },
        { id: 's3', label: '“For the little moments.”', glyph: 'chat', score: 2, feedback: 'Lovely tone — slightly generic.', skills: ['communication'],
          combo: [{ step: 'concept', options: ['tiny'], delta: 1, note: 'Ties back to your concept beautifully.' }] },
        { id: 's4', label: '“Drink Glow. Be better.”', glyph: 'chat', score: 1, feedback: 'A bit preachy — people don’t love being told to improve.', skills: ['communication'] },
      ],
    },
    {
      kind: 'choice', id: 'media', title: 'Where does it live?', prompt: 'Choose your lead media channel.',
      options: [
        { id: 'creators', label: 'Creator partnerships', detail: 'Short-form video with real people', glyph: 'phone', score: 3, feedback: 'Exactly where under-25s spend time — and it feels native.', skills: ['commercial', 'digital'] },
        { id: 'tv', label: 'Prime-time TV ad', detail: 'Big, expensive, broad', glyph: 'film', score: 1, feedback: 'Huge reach, but your audience barely watches live TV.', skills: ['commercial'] },
        { id: 'popup', label: 'Campus pop-ups', detail: 'Free cans + photo booth', glyph: 'ticket', score: 2, feedback: 'Great for trial and shareable moments.', skills: ['creativity', 'commercial'],
          combo: [{ step: 'audience', options: ['students'], delta: 1, note: 'Pop-ups on campus hit students directly.' }] },
        { id: 'print', label: 'Magazine spreads', glyph: 'book', score: 0, feedback: 'Beautiful, but not where this audience discovers drinks.', skills: [] },
      ],
    },
    {
      kind: 'choice', id: 'expert', title: 'Expert round: the client pushes back', plus: true,
      prompt: 'The marketing director wants to add “NOW WITH VITAMIN C!” in huge letters. What do you do?',
      options: [
        { id: 'refuse', label: 'Flatly refuse', glyph: 'shield', score: 1, feedback: 'You protected the idea — but damaged the relationship.', skills: ['resilience'] },
        { id: 'reframe', label: 'Find a smarter home for it', detail: 'Pack + small end-frame, keep the hero clean', glyph: 'handshake', score: 3, feedback: 'Classic CD move: give the client what they need without wrecking the work.', skills: ['leadership', 'communication'] },
        { id: 'accept', label: 'Just add it', glyph: 'check', score: 0, feedback: 'Fast, but the campaign loses its focus.', skills: [] },
      ],
    },
  ],
  evaluate: (_a, r) => {
    const s = avg(r);
    return {
      headline: s > 0.8 ? 'The client loved it — Glow is going ahead!' : s > 0.55 ? 'Client says: “Promising — let’s refine.”' : 'Client wants another round of ideas.',
      lines: [
        s > 0.8 ? 'Your choices hung together as one clear story. That consistency is what creative directors are paid for.' : 'Some choices pulled in different directions. Real CDs often go through several rounds — that’s normal.',
        'In real agencies this process takes weeks, with strategists, designers and copywriters all feeding in.',
      ],
    };
  },
};

// ───────────────────────── Entrepreneur ─────────────────────────
const PRODUCTS: Record<string, { cost: number; base: number; name: string; fit: Record<string, number> }> = {
  cases: { name: 'custom phone cases', cost: 4, base: 120, fit: { students: 1.3, office: 0.7, gifts: 1.1, parents: 0.6 } },
  candles: { name: 'hand-poured candles', cost: 5, base: 90, fit: { students: 0.7, office: 0.9, gifts: 1.5, parents: 1.1 } },
  brownies: { name: 'gourmet brownies', cost: 1.2, base: 300, fit: { students: 1.2, office: 1.4, gifts: 0.8, parents: 1.0 } },
  tutoring: { name: 'revision tutoring sessions', cost: 0, base: 40, fit: { students: 0.9, office: 0.2, gifts: 0.3, parents: 1.6 } },
};
const SWEET: Record<string, number> = { cases: 15, candles: 18, brownies: 3, tutoring: 25 };

export const entrepreneur: Sim = {
  id: 'entrepreneur', title: 'The £1,000 Launch', role: 'Entrepreneur', careerId: 'entrepreneur', world: 'business',
  minutes: 4, glyph: 'rocket', preview: 'none',
  client: 'You. It’s your money (pretend money!)',
  brief: 'You’ve got £1,000 and one month to launch a small business. Pick what to sell, who to sell it to, how much to charge and how to spend your marketing budget. Then we’ll simulate how your first month goes.',
  steps: [
    {
      kind: 'choice', id: 'product', title: 'What are you selling?', prompt: 'Choose your product. £400 goes on stock and set-up whichever you pick.',
      options: [
        { id: 'cases', label: 'Custom phone cases', detail: 'Design-led, ~£4 to make', glyph: 'phone', score: 2, feedback: 'Good margins and very giftable.', skills: ['commercial', 'creativity'] },
        { id: 'candles', label: 'Hand-poured candles', detail: 'Cosy, ~£5 to make', glyph: 'sun', score: 2, feedback: 'Great margins, strongest as a gift.', skills: ['commercial', 'craft'] },
        { id: 'brownies', label: 'Gourmet brownies', detail: 'Cheap to make, sells fast', glyph: 'chef', score: 2, feedback: 'Low price but high volume — and people come back.', skills: ['commercial', 'craft'] },
        { id: 'tutoring', label: 'Revision tutoring', detail: 'Sell your time and knowledge', glyph: 'book', score: 2, feedback: 'Almost no stock cost — your time is the limit.', skills: ['communication', 'commercial'] },
      ],
    },
    {
      kind: 'choice', id: 'customer', title: 'Who will buy it?', prompt: 'Pick your main customer.',
      options: [
        { id: 'students', label: 'Students', detail: 'Lots of them, tight budgets', glyph: 'friends', score: 2, feedback: '', skills: ['analysis'] },
        { id: 'office', label: 'Local office workers', detail: 'Lunch money, little time', glyph: 'office', score: 2, feedback: '', skills: ['analysis'] },
        { id: 'gifts', label: 'Online gift buyers', detail: 'Birthdays, Christmas, thank-yous', glyph: 'heart', score: 2, feedback: '', skills: ['analysis'] },
        { id: 'parents', label: 'Parents', detail: 'Will pay for quality and results', glyph: 'house', score: 2, feedback: '', skills: ['analysis'] },
      ],
    },
    {
      kind: 'slider', id: 'price', title: 'Set your price', prompt: 'Too cheap and you lose money; too pricey and nobody buys.',
      unit: '£',
      range: (a) => {
        const p = pickOf(a, 'product') ?? 'cases';
        const sweet = SWEET[p];
        return { min: Math.max(1, Math.round(sweet * 0.3)), max: Math.round(sweet * 2.5), step: p === 'brownies' ? 0.5 : 1, initial: Math.round(sweet * 0.8), hint: `It costs about £${PRODUCTS[p].cost.toFixed(2)} to make one.` };
      },
      judge: (v, a) => {
        const p = pickOf(a, 'product') ?? 'cases';
        const ratio = v / SWEET[p];
        if (ratio < 0.6) return { score: 0.35, feedback: 'Very cheap — lots of sales, but thin margins. You might be working for free.' };
        if (ratio > 1.6) return { score: 0.4, feedback: 'Premium pricing — fewer customers will bite unless the brand feels special.' };
        return { score: ratio > 0.85 && ratio < 1.25 ? 1 : 0.75, feedback: 'A sensible price that balances margin and demand.' };
      },
    },
    {
      kind: 'allocate', id: 'marketing', title: 'Spend your £600', prompt: 'Split your remaining budget across marketing. Keeping some back is allowed!',
      total: 600,
      channels: [
        { id: 'social', label: 'Social ads', glyph: 'phone', detail: 'Targeted, measurable' },
        { id: 'creator', label: 'Local creators', glyph: 'camera', detail: 'Trust and reach' },
        { id: 'stall', label: 'Market stall', glyph: 'ticket', detail: 'Meet customers face to face' },
        { id: 'flyers', label: 'Flyers & posters', glyph: 'book', detail: 'Cheap, hyper-local' },
      ],
    },
    {
      kind: 'choice', id: 'expert', title: 'Expert round: a big order', plus: true,
      prompt: 'A shop wants 300 units at 40% off — paid in 60 days. Cash is tight. Do you take it?',
      options: [
        { id: 'yes', label: 'Yes, grab it', glyph: 'handshake', score: 1, feedback: 'Exciting — but you could run out of cash before they pay. Cash flow kills more startups than bad ideas.', skills: ['commercial'] },
        { id: 'negotiate', label: 'Counter: 50% upfront', glyph: 'chat', score: 3, feedback: 'Smart. Negotiating payment terms protects your cash flow.', skills: ['commercial', 'communication'] },
        { id: 'no', label: 'Politely decline', glyph: 'shield', score: 2, feedback: 'Safe, sensible — though you might miss a growth chance.', skills: ['resilience'] },
      ],
    },
  ],
  evaluate: (a) => {
    const p = pickOf(a, 'product') ?? 'cases';
    const cust = pickOf(a, 'customer') ?? 'students';
    const prod = PRODUCTS[p];
    const price = (a.price as number) ?? SWEET[p];
    const alloc = (a.marketing as Record<string, number>) ?? {};
    const spent = Object.values(alloc).reduce((s, v) => s + v, 0);
    const channelFit: Record<string, Record<string, number>> = {
      social: { students: 1.3, office: 0.9, gifts: 1.4, parents: 1.0 },
      creator: { students: 1.5, office: 0.8, gifts: 1.1, parents: 0.8 },
      stall: { students: 0.9, office: 1.2, gifts: 1.0, parents: 1.2 },
      flyers: { students: 0.8, office: 1.1, gifts: 0.4, parents: 1.3 },
    };
    let mkt = 0;
    for (const [ch, v] of Object.entries(alloc)) mkt += Math.sqrt(v) * (channelFit[ch]?.[cust] ?? 1);
    const fit = prod.fit[cust] ?? 1;
    const elasticity = Math.pow(SWEET[p] / Math.max(price, 0.5), 1.4);
    const demand = prod.base * fit * elasticity * (0.35 + mkt / 40);
    const weeks = [0.15, 0.22, 0.28, 0.35].map((w) => Math.round(demand * w));
    const units = weeks.reduce((s, v) => s + v, 0);
    const revenue = units * price;
    const costs = 400 + spent + units * prod.cost;
    const profit = Math.round(revenue - costs);
    return {
      headline: profit > 300 ? `You made £${profit} profit. Founder mode: on.` : profit > 0 ? `You made £${profit} profit in month one!` : `You’re £${Math.abs(profit)} down — and that’s a normal first month.`,
      lines: [
        `You sold ${units} ${prod.name} at £${price.toFixed(2)} — revenue of £${Math.round(revenue)}.`,
        fit > 1.2 ? 'Your product and customer were a great match — that’s called product–market fit.' : fit < 0.8 ? 'Your product and customer weren’t a natural fit. Founders often “pivot” to a new audience.' : 'Your product and customer were a reasonable fit — testing other audiences could boost sales.',
        spent < 200 ? 'You kept most of your budget — careful, but growth was slower.' : 'Your marketing spend drove most of your growth over the month.',
        'This is a simplified model. Real businesses also deal with returns, competition, delivery and tax.',
      ],
      chart: weeks.map((v, i) => ({ label: `Wk ${i + 1}`, value: v })),
      chartLabel: 'Units sold per week',
      bonus: profit > 0 ? Math.min(1, profit / 600) : 0,
    };
  },
};

// ───────────────────────── Architect ─────────────────────────
export const architect: Sim = {
  id: 'architect', title: 'A Home for the Okafors', role: 'Architect', careerId: 'architect', world: 'engineering',
  minutes: 5, glyph: 'house', preview: 'none',
  client: 'The Okafor family (fictional clients)',
  brief: 'Ade and Chi have a 7-year-old, a very large dog and both work from home two days a week. Budget: £180,000 for the build. The plot faces a garden to the south. Design their home.',
  steps: [
    { kind: 'floorplan', id: 'plan', title: 'Lay out the floor plan', prompt: 'Tap a room, then tap the plot to place it. Tap a placed room to remove it.', scout: 'Check the client wish-list as you go.' },
    {
      kind: 'choice', id: 'material', title: 'Main material', prompt: 'What will the house be built from?',
      options: [
        { id: 'timber', label: 'Timber frame', detail: '+£8k, low carbon, warm', glyph: 'tree', score: 3, cost: 8, feedback: 'Low-carbon and fast to build — clients increasingly ask for this.', skills: ['craft', 'curiosity'] },
        { id: 'brick', label: 'Classic brick', detail: '+£12k, durable, familiar', glyph: 'house', score: 2, cost: 12, feedback: 'Reliable and fits most streets — planning loves it.', skills: ['craft'] },
        { id: 'glass', label: 'Glass & steel', detail: '+£30k, dramatic', glyph: 'office', score: 1, cost: 30, feedback: 'Stunning — but costly and can overheat. Watch that budget.', skills: ['creativity'] },
        { id: 'container', label: 'Recycled shipping containers', detail: '+£5k, quirky', glyph: 'suitcase', score: 2, cost: 5, feedback: 'Cheap and characterful — needs serious insulation work.', skills: ['creativity', 'problem'] },
      ],
    },
    {
      kind: 'choice', id: 'windows', title: 'Light & windows', prompt: 'Where do the biggest windows go?',
      options: [
        { id: 'south', label: 'South, onto the garden', glyph: 'sun', score: 3, feedback: 'Free warmth and light all day, plus garden views. Textbook.', skills: ['analysis'] },
        { id: 'north', label: 'North, towards the street', glyph: 'city', score: 1, feedback: 'Steady light, but colder and less private.', skills: [] },
        { id: 'roof', label: 'Skylights everywhere', glyph: 'star', score: 2, feedback: 'Dramatic light — but can leak and overheat if overdone.', skills: ['creativity'] },
      ],
    },
    {
      kind: 'choice', id: 'expert', title: 'Expert round: planning objection', plus: true,
      prompt: 'A neighbour objects that your design blocks their light. What’s your move?',
      options: [
        { id: 'redesign', label: 'Step the roofline down on their side', glyph: 'pencil', score: 3, feedback: 'Elegant compromise that keeps your design intact.', skills: ['problem', 'empathy'] },
        { id: 'ignore', label: 'Ignore it, it’ll be fine', glyph: 'eye', score: 0, feedback: 'Planning committees take objections seriously — risky.', skills: [] },
        { id: 'meet', label: 'Meet them with drawings', glyph: 'handshake', score: 2, feedback: 'Talking early often solves more than drawings do.', skills: ['communication'] },
      ],
    },
  ],
  evaluate: (a) => {
    const plan = (a.plan as { cost: number; checks: Record<string, boolean> }) ?? { cost: 0, checks: {} };
    const mat = ({ timber: 8, brick: 12, glass: 30, container: 5 } as Record<string, number>)[(pickOf(a, 'material') ?? 'brick')] ?? 0;
    const total = plan.cost + mat;
    const met = Object.values(plan.checks).filter(Boolean).length;
    const all = Object.keys(plan.checks).length || 1;
    return {
      headline: total <= 180 && met === all ? 'The Okafors are thrilled. Planning submitted!' : total > 180 ? `Gorgeous — but £${total - 180}k over budget.` : 'Nearly there — a few wish-list items are missing.',
      lines: [
        `Total build estimate: £${total}k of £180k (rooms £${plan.cost}k + materials £${mat}k).`,
        `You met ${met} of ${all} client requirements.`,
        'Real architects juggle exactly this: what looks good, what works and what it costs — often through dozens of versions.',
      ],
      chart: [
        { label: 'Budget', value: Math.max(0, Math.round(100 - Math.max(0, total - 180) * 3)) },
        { label: 'Function', value: Math.round((met / all) * 100) },
        { label: 'Beauty', value: pickOf(a, 'windows') === 'south' ? 90 : 70 },
      ],
      chartLabel: 'Design balance',
      bonus: (total <= 180 ? 0.5 : 0) + (met / all) * 0.5,
    };
  },
};

// ───────────────────────── Film Director ─────────────────────────

export const filmDirector: Sim = {
  id: 'film-director', title: 'The Reunion Scene', role: 'Film Director', careerId: 'film-director', world: 'film',
  minutes: 3, glyph: 'film', preview: 'scene',
  client: 'An original short film',
  brief: 'Two best friends, apart for five years, see each other across a busy train platform. It’s the emotional heart of the film. You decide how the audience experiences it. Watch the monitor update as you choose.',
  steps: [
    {
      kind: 'choice', id: 'tone', title: 'What should it feel like?', prompt: 'Directors pick the feeling first. Everything else serves it.',
      options: [
        { id: 'tender', label: 'Tender & warm', glyph: 'heart', score: 2, tags: ['warm'], feedback: 'A clear, generous emotional goal.', skills: ['storytelling', 'empathy'] },
        { id: 'tense', label: 'Awkward & tense', glyph: 'bolt', score: 2, tags: ['tense'], feedback: 'Bold — reunions are often complicated.', skills: ['storytelling'] },
        { id: 'joy', label: 'Pure joy', glyph: 'sun', score: 2, tags: ['joy'], feedback: 'Crowd-pleasing and uplifting.', skills: ['storytelling'] },
      ],
    },
    {
      kind: 'choice', id: 'shot', title: 'Camera', prompt: 'How do we first see them?',
      options: [
        { id: 'wide', label: 'Wide shot', detail: 'Two tiny figures in a huge crowd', glyph: 'mountain', score: 2, tags: ['tense'], feedback: 'Shows distance — literal and emotional.', skills: ['creativity'] },
        { id: 'close', label: 'Close-up', detail: 'Their face as they recognise each other', glyph: 'eye', score: 2, tags: ['warm'], feedback: 'Intimate. The audience feels it with them.', skills: ['creativity', 'empathy'] },
        { id: 'handheld', label: 'Handheld run', detail: 'Camera chases them through the crowd', glyph: 'camera', score: 2, tags: ['joy'], feedback: 'Energetic and alive.', skills: ['creativity'] },
      ],
    },
    {
      kind: 'choice', id: 'light', title: 'Lighting', prompt: 'Set the light.',
      options: [
        { id: 'golden', label: 'Golden hour', glyph: 'sun', score: 2, tags: ['warm'], feedback: 'Soft, nostalgic glow.', skills: ['creativity'] },
        { id: 'blue', label: 'Cold blue dusk', glyph: 'moon', score: 2, tags: ['tense'], feedback: 'Melancholy and moody.', skills: ['creativity'] },
        { id: 'bright', label: 'Bright & saturated', glyph: 'star', score: 2, tags: ['joy'], feedback: 'Pops off the screen.', skills: ['creativity'] },
      ],
    },
    {
      kind: 'choice', id: 'sound', title: 'Sound', prompt: 'What do we hear?',
      options: [
        { id: 'strings', label: 'Swelling strings', glyph: 'music', score: 2, tags: ['warm'], feedback: 'Classic emotional lift.', skills: ['storytelling'] },
        { id: 'silence', label: 'Station noise fades to silence', glyph: 'mic', score: 3, tags: ['tense'], feedback: 'Silence can be the loudest choice in a film.', skills: ['storytelling', 'creativity'] },
        { id: 'pop', label: 'Upbeat indie track', glyph: 'music', score: 2, tags: ['joy'], feedback: 'Fun and modern.', skills: ['storytelling'] },
      ],
    },
    {
      kind: 'choice', id: 'ending', title: 'The final beat', prompt: 'How does the scene end?',
      options: [
        { id: 'hug', label: 'A long, slow hug', glyph: 'heart', score: 2, tags: ['warm'], feedback: 'Earned and satisfying.', skills: ['storytelling'] },
        { id: 'hesitate', label: 'They hesitate… then laugh', glyph: 'chat', score: 3, tags: ['tense'], feedback: 'Surprising and human — releases the tension perfectly.', skills: ['storytelling', 'empathy'] },
        { id: 'spin', label: 'Run, jump, spin', glyph: 'star', score: 2, tags: ['joy'], feedback: 'A big, joyful release.', skills: ['storytelling'] },
      ],
    },
  ],
  evaluate: (a) => {
    const t = pickOf(a, 'tone');
    const map: Record<string, Record<string, string>> = {
      shot: { wide: 'tense', close: 'warm', handheld: 'joy' }, light: { golden: 'warm', blue: 'tense', bright: 'joy' },
      sound: { strings: 'warm', silence: 'tense', pop: 'joy' }, ending: { hug: 'warm', hesitate: 'tense', spin: 'joy' },
    };
    const want = t === 'tender' ? 'warm' : t === 'tense' ? 'tense' : 'joy';
    const matches = Object.entries(map).filter(([k, m]) => m[pickOf(a, k) ?? ''] === want).length;

    return {
      headline: matches >= 3 ? 'Test audience: “I actually cried.”' : matches >= 2 ? 'Test audience: “Lovely moment!”' : 'Test audience: “Interesting… but confusing.”',
      lines: [
        `${matches} of 4 craft choices served the feeling you chose.`,
        matches >= 3 ? 'That’s directing: every department pulling towards one emotion.' : 'Mixed signals can be intentional — but usually directors align camera, light and sound behind one feeling.',
        'On a real set you’d make these calls with a cinematographer, composer and editor.',
      ],
      bonus: matches / 4,
    };
  },
};

// ───────────────────────── Lawyer ─────────────────────────
export const lawyer: Sim = {
  id: 'lawyer', title: 'The Missing Bike', role: 'Lawyer', careerId: 'solicitor', world: 'law',
  minutes: 4, glyph: 'scales', preview: 'none',
  client: 'Jay, 18 — your (fictional) client',
  brief: 'Jay is accused of stealing a bike from outside Riverside College at about 4:15pm on Tuesday. Jay says they were on a bus across town. Review the evidence, find the cracks in the case and build your argument.',
  disclaimer: 'A fictional, simplified scenario for learning. Real legal cases follow detailed rules of evidence and procedure.',
  steps: [
    {
      kind: 'spot', id: 'evidence', title: 'Spot the inconsistencies', prompt: 'Compare the evidence with the witness statement. Tap the 3 claims that don’t add up.',
      pick: 3,
      evidence: [
        { label: 'Bus ticket', text: 'Route 22, issued 16:08 at Hill Street (3 miles away). Paid with Jay’s card.', glyph: 'ticket' },
        { label: 'CCTV still', text: 'Bike rack, 16:41. Person in a dark green hoodie with a skateboard.', glyph: 'camera' },
        { label: 'Weather report', text: 'Tuesday afternoon: heavy rain from 15:30 to 17:00.', glyph: 'drop' },
        { label: 'Police log', text: 'Theft reported at 16:55 by the bike’s owner.', glyph: 'clipboard' },
      ],
      items: [
        { id: 'w1', text: '“I saw Jay take the bike at about quarter past four.”', flaw: true, explain: 'The CCTV shows the theft at 16:41 — and Jay’s bus ticket was issued 3 miles away at 16:08.' },
        { id: 'w2', text: '“They were wearing a bright red hoodie.”', flaw: true, explain: 'CCTV shows a dark green hoodie. A clash in identification.' },
        { id: 'w3', text: '“I recognised Jay from college.”', flaw: false, explain: 'Possible — this alone isn’t inconsistent with the evidence.' },
        { id: 'w4', text: '“It was a sunny afternoon, I could see clearly.”', flaw: true, explain: 'The weather report says heavy rain — visibility was likely poor.' },
        { id: 'w5', text: '“The bike was locked to the rack by the gate.”', flaw: false, explain: 'This matches the CCTV location.' },
        { id: 'w6', text: '“I called my friend right after.”', flaw: false, explain: 'Not contradicted by anything we have.' },
      ],
    },
    {
      kind: 'choice', id: 'argument', title: 'Build your argument', prompt: 'What’s the core of your defence?',
      options: [
        { id: 'timeline', label: 'The timeline doesn’t work', detail: 'Bus ticket + CCTV time + weather', glyph: 'clipboard', score: 3, feedback: 'Strong — you’re using objective evidence, not opinions.', skills: ['analysis', 'problem'] },
        { id: 'character', label: 'The witness is a liar', glyph: 'megaphone', score: 0, feedback: 'Attacking someone’s character without evidence usually backfires. They may be honestly mistaken.', skills: [] },
        { id: 'sympathy', label: 'Jay is a good person', glyph: 'heart', score: 1, feedback: 'Character references help — but they don’t answer the evidence.', skills: ['empathy'] },
        { id: 'id', label: 'Mistaken identity', detail: 'Hoodie colour + poor visibility', glyph: 'eye', score: 2, feedback: 'Good — combine it with the timeline for a stronger case.', skills: ['analysis'] },
      ],
    },
    {
      kind: 'choice', id: 'question', title: 'Cross-examination', prompt: 'You get one question for the witness. Which one?',
      options: [
        { id: 'q1', label: '“What was the weather like that afternoon?”', glyph: 'drop', score: 3, feedback: 'Lets the witness reveal the problem themselves. Very skilful.', skills: ['communication', 'analysis'] },
        { id: 'q2', label: '“Why are you lying?”', glyph: 'bolt', score: 0, feedback: 'Aggressive, and it invites a confident denial.', skills: [] },
        { id: 'q3', label: '“Do you like Jay?”', glyph: 'chat', score: 1, feedback: 'Could show bias — but it’s a gamble.', skills: ['communication'] },
      ],
    },
    {
      kind: 'choice', id: 'expert', title: 'Expert round: new evidence', plus: true, prompt: 'The prosecution reveals Jay’s card was used at the college café at 16:30. What now?',
      options: [
        { id: 'check', label: 'Ask who had Jay’s card', glyph: 'eye', score: 3, feedback: 'Great instinct — Jay’s sibling borrowed it. Always test new evidence.', skills: ['analysis', 'curiosity'] },
        { id: 'panic', label: 'Advise Jay to plead guilty', glyph: 'flag', score: 0, feedback: 'Too fast — one fact doesn’t make a case.', skills: [] },
        { id: 'object', label: 'Object to it being late', glyph: 'shield', score: 2, feedback: 'Procedurally fair point — but you still need an answer.', skills: ['analysis'] },
      ],
    },
  ],
  evaluate: (_a, r) => {
    const s = avg(r);
    return {
      headline: s > 0.8 ? 'Case dismissed. Jay hugs you outside court.' : s > 0.5 ? 'Reasonable doubt established — not guilty.' : 'The magistrates weren’t convinced. Time to review.',
      lines: ['Lawyers win by finding facts that don’t fit — then explaining them calmly and clearly.', 'Notice you never needed to prove who did steal the bike — only that the case against Jay didn’t hold up.'],
    };
  },
};

// ───────────────────────── Software Developer ─────────────────────────
export const software: Sim = {
  id: 'software', title: 'Ship It!', role: 'Software Developer', careerId: 'software-developer', world: 'tech',
  minutes: 4, glyph: 'code', preview: 'app',
  client: 'Streakly — a fictional student habit app',
  brief: 'First, warm up your logic brain by programming a delivery robot. Then design and debug Streakly, a tiny habit-tracker app for students.',
  steps: [
    { kind: 'code', id: 'robot', title: 'Program the robot', prompt: 'Tap commands to build a program that gets Bit to the battery. Then press Run.', scout: 'Coding is just breaking big problems into tiny steps.' },
    {
      kind: 'multi', id: 'features', title: 'Pick the MVP features', pick: 3, prompt: 'You have time to build 3 features for version one. Watch the app preview.',
      options: [
        { id: 'streaks', label: 'Daily streaks', glyph: 'bolt', score: 3, feedback: 'Core to a habit app.', skills: ['problem'] },
        { id: 'remind', label: 'Reminders', glyph: 'bulb', score: 3, feedback: 'Helps people actually come back.', skills: ['empathy'] },
        { id: 'stats', label: 'Progress charts', glyph: 'chart', score: 2, feedback: 'Nice motivation boost.', skills: ['analysis'] },
        { id: 'social', label: 'Share with friends', glyph: 'friends', score: 2, feedback: 'Adds accountability — and complexity.', skills: ['digital'] },
        { id: 'ai', label: 'AI life coach', glyph: 'brain', score: 1, feedback: 'Shiny, but a big build for v1.', skills: ['curiosity'] },
        { id: 'themes', label: '40 colour themes', glyph: 'palette', score: 0, feedback: 'Fun, but not what makes or breaks the app.', skills: [] },
      ],
    },
    {
      kind: 'choice', id: 'bug', title: 'Fix the bug', prompt: 'Users report the app crashes when they save a habit with no name. What’s the best fix?',
      options: [
        { id: 'validate', label: 'Disable “Save” until a name is typed, and show a hint', glyph: 'check', score: 3, feedback: 'Fixes the cause and helps the user. Excellent engineering and UX.', skills: ['problem', 'empathy', 'digital'] },
        { id: 'default', label: 'Auto-name it “Untitled habit”', glyph: 'pencil', score: 2, feedback: 'Prevents the crash — a decent, pragmatic fix.', skills: ['problem'] },
        { id: 'catch', label: 'Wrap everything in try/catch and hide errors', glyph: 'shield', score: 0, feedback: 'Hides the problem instead of fixing it — bugs pile up later.', skills: [] },
        { id: 'tell', label: 'Post on social: “please type a name”', glyph: 'megaphone', score: 0, feedback: 'Users shouldn’t have to work around our bugs.', skills: [] },
      ],
    },
    {
      kind: 'choice', id: 'test', title: 'Before you ship', prompt: 'It’s Friday, 5pm. The feature works on your laptop. What do you do?',
      options: [
        { id: 'ship', label: 'Ship it to everyone now', glyph: 'rocket', score: 0, feedback: 'The classic Friday deploy — what could go wrong? (Everything.)', skills: [] },
        { id: 'tests', label: 'Run tests and release to 5% of users first', glyph: 'target', score: 3, feedback: 'Exactly how strong teams ship safely.', skills: ['problem', 'analysis'] },
        { id: 'monday', label: 'Wait until Monday with fresh eyes', glyph: 'moon', score: 2, feedback: 'Sensible — rest is part of good engineering.', skills: ['resilience'] },
      ],
    },
    {
      kind: 'choice', id: 'expert', title: 'Expert round: scale', plus: true, prompt: 'Streakly goes viral: 100× users overnight and the app slows down. First move?',
      options: [
        { id: 'measure', label: 'Measure where it’s slow first', glyph: 'chart', score: 3, feedback: 'Never optimise blind. Data first.', skills: ['analysis', 'problem'] },
        { id: 'rewrite', label: 'Rewrite it in a faster language', glyph: 'code', score: 0, feedback: 'Months of work during a crisis — rarely the answer.', skills: [] },
        { id: 'servers', label: 'Add more servers', glyph: 'gear', score: 2, feedback: 'Buys time quickly — then find the root cause.', skills: ['problem'] },
      ],
    },
  ],
  evaluate: (_a, r) => {
    const s = avg(r);
    return {
      headline: s > 0.8 ? 'Streakly hits 4.8★ in the app store!' : s > 0.55 ? 'Streakly launched — users like it!' : 'Streakly is live, with a few rough edges.',
      lines: ['Developers spend as much time thinking, testing and talking as typing code.', 'That robot puzzle? It’s the same skill as real programming: precise steps, in order.'],
    };
  },
};

// ───────────────────────── Doctor ─────────────────────────
export const doctor: Sim = {
  id: 'doctor', title: 'Why So Tired?', role: 'Doctor (GP)', careerId: 'doctor', world: 'health',
  minutes: 4, glyph: 'stethoscope', preview: 'none',
  client: 'Sam, 19 — a fictional patient',
  brief: 'Sam has come to the GP surgery saying they’ve felt exhausted for about three weeks. You have a 10-minute appointment. Ask good questions, think about possible explanations, and decide what happens next.',
  disclaimer: 'Educational and fictional. This is not medical advice — anyone worried about their health should speak to a GP, pharmacist or NHS 111.',
  steps: [
    {
      kind: 'ask', id: 'history', title: 'Take a history', prompt: 'You have time for 4 questions. Choose wisely.', maxAsk: 4,
      scout: 'Doctors say most diagnoses come from listening, not tests.',
      questions: [
        { id: 'sleep', q: 'How are you sleeping?', a: '“Honestly about 8 hours, but I wake up still tired.”', useful: true },
        { id: 'diet', q: 'Has your eating changed recently?', a: '“I went vegetarian two months ago… I skip meals a lot.”', useful: true },
        { id: 'other', q: 'Any other symptoms?', a: '“I get breathless on stairs. My friend said I look pale.”', useful: true },
        { id: 'mood', q: 'How’s your mood and stress?', a: '“Exams are stressful, but I feel OK in myself.”', useful: true },
        { id: 'throat', q: 'Any sore throat or swollen glands?', a: '“No, nothing like that.”', useful: true },
        { id: 'team', q: 'Which football team do you support?', a: '“…Er, does that matter?”', useful: false },
        { id: 'phone', q: 'What phone do you have?', a: '“An old one? Why?”', useful: false },
        { id: 'holiday', q: 'Where did you last go on holiday?', a: '“Cornwall last summer.”', useful: false },
      ],
    },
    {
      kind: 'multi', id: 'ddx', title: 'Possible explanations', pick: 2, prompt: 'Based on what you’ve heard, pick the 2 explanations most worth investigating.',
      options: [
        { id: 'iron', label: 'Low iron (anaemia)', detail: 'Diet change, pale, breathless', glyph: 'drop', score: 3, feedback: 'Fits the diet change, paleness and breathlessness well.', skills: ['analysis'] },
        { id: 'stress', label: 'Stress & lifestyle', detail: 'Exams, skipped meals', glyph: 'brain', score: 2, feedback: 'Reasonable to consider alongside physical causes.', skills: ['empathy'] },
        { id: 'glandular', label: 'Glandular fever', glyph: 'bolt', score: 1, feedback: 'Common at this age, but no sore throat or swollen glands makes it less likely.', skills: ['analysis'] },
        { id: 'broken', label: 'A broken bone', glyph: 'hammer', score: 0, feedback: 'Nothing points to an injury.', skills: [] },
      ],
    },
    {
      kind: 'choice', id: 'plan', title: 'Next steps', prompt: 'What do you do?',
      options: [
        { id: 'bloods', label: 'Order a blood test and give diet advice', detail: 'Review results in a week', glyph: 'clipboard', score: 3, feedback: 'Measured and sensible — test before treating, and support Sam meanwhile.', skills: ['analysis', 'empathy', 'communication'] },
        { id: 'antibiotics', label: 'Prescribe antibiotics', glyph: 'drop', score: 0, feedback: 'No sign of infection — antibiotics wouldn’t help and contribute to resistance.', skills: [] },
        { id: 'ae', label: 'Send to A&E immediately', glyph: 'bolt', score: 0, feedback: 'Nothing suggests an emergency today.', skills: [] },
        { id: 'tough', label: '“You’re just young and busy.”', glyph: 'chat', score: 0, feedback: 'Dismissing symptoms can miss something treatable — and loses trust.', skills: [] },
      ],
    },
    {
      kind: 'choice', id: 'expert', title: 'Expert round: explaining results', plus: true, prompt: 'Sam’s results show low iron. How do you explain it?',
      options: [
        { id: 'plain', label: 'Plain words + what we’ll do + check understanding', glyph: 'chat', score: 3, feedback: 'Clear, kind and collaborative — the gold standard.', skills: ['communication', 'empathy'] },
        { id: 'jargon', label: '“Your ferritin is 8 µg/L, microcytic picture.”', glyph: 'book', score: 0, feedback: 'Accurate but baffling for most patients.', skills: [] },
        { id: 'leaflet', label: 'Hand over a leaflet only', glyph: 'pencil', score: 1, feedback: 'Useful backup, not a substitute for a conversation.', skills: [] },
      ],
    },
  ],
  evaluate: (_a, r) => {
    const s = avg(r);
    return {
      headline: s > 0.8 ? 'Sam leaves reassured, with a clear plan.' : s > 0.5 ? 'Good consultation — a few things to tighten up.' : 'Sam leaves a bit confused. Let’s practise.',
      lines: ['GPs often have just 10 minutes. Asking focused questions is a superpower.', 'Notice: you didn’t “diagnose” — you made a safe plan to find out more. That’s real clinical thinking.'],
    };
  },
};

// ───────────────────────── Marketing Director ─────────────────────────
export const marketing: Sim = {
  id: 'marketing', title: 'Make Loop Famous', role: 'Marketing Director', careerId: 'marketing-director', world: 'business',
  minutes: 3, glyph: 'megaphone', preview: 'none',
  client: 'Loop — a fictional smart water bottle',
  brief: 'Loop is a reusable bottle that glows when you need a drink. It costs £29. You have £10,000 and a month to make it the bottle everyone wants. Choose your ad, your audience and your channel mix.',
  steps: [
    {
      kind: 'choice', id: 'ad', title: 'Choose the hero ad', prompt: 'Your team made three ads. Which runs?',
      options: [
        { id: 'a', label: 'Ad A — “It glows. You glow.”', detail: 'Quick, playful demo with a creator', glyph: 'star', score: 3, feedback: 'Shows the product doing its thing in 3 seconds. That’s gold on social.', skills: ['creativity', 'commercial'] },
        { id: 'b', label: 'Ad B — Spec sheet', detail: '500ml, BPA-free, Bluetooth 5.0', glyph: 'clipboard', score: 1, feedback: 'Useful detail for the product page, not the hook.', skills: ['analysis'] },
        { id: 'c', label: 'Ad C — Save the oceans', detail: 'Plastic-pollution message', glyph: 'wave', score: 2, feedback: 'Powerful values message — make sure Loop feels like the hero, not an afterthought.', skills: ['storytelling'] },
      ],
    },
    {
      kind: 'choice', id: 'audience', title: 'Target audience', prompt: 'Who are you targeting first?',
      options: [
        { id: 'gym', label: 'Gym-goers', glyph: 'dumbbell', score: 2, feedback: 'They already carry bottles. Easy sell.', skills: ['analysis'] },
        { id: 'students', label: 'Students in exam season', glyph: 'book', score: 3, feedback: 'Smart timing — “stay hydrated while revising” is a fresh angle.', skills: ['analysis', 'creativity'] },
        { id: 'office', label: 'Office workers', glyph: 'office', score: 2, feedback: 'Good fit, but harder to reach cheaply.', skills: ['analysis'] },
      ],
    },
    {
      kind: 'allocate', id: 'channels', title: 'Spend £10,000', prompt: 'Split your budget across channels.', total: 10000,
      channels: [
        { id: 'tiktok', label: 'Short-form video', glyph: 'phone', detail: 'Cheap reach, viral potential' },
        { id: 'creators', label: 'Creator partners', glyph: 'camera', detail: 'Trust & demos' },
        { id: 'search', label: 'Search ads', glyph: 'target', detail: 'Catch people ready to buy' },
        { id: 'outdoor', label: 'Posters', glyph: 'city', detail: 'Big, visible, hard to measure' },
      ],
    },
  ],
  evaluate: (a, r) => {
    const alloc = (a.channels as Record<string, number>) ?? {};
    const eff: Record<string, number> = { tiktok: 1.4, creators: 1.3, search: 1.1, outdoor: 0.6 };
    let reach = 0;
    for (const [k, v] of Object.entries(alloc)) reach += Math.sqrt(v) * (eff[k] ?? 1) * 260;
    const quality = avg(r);
    const sales = Math.round((reach / 1000) * (2 + quality * 8));
    const spent = Object.values(alloc).reduce((s, v) => s + v, 0);
    const diversified = Object.values(alloc).filter((v) => v > 1000).length;
    return {
      headline: `${Math.round(reach).toLocaleString('en-GB')} people reached · ${sales.toLocaleString('en-GB')} bottles sold`,
      lines: [
        `You spent £${spent.toLocaleString('en-GB')} for about £${(sales * 29).toLocaleString('en-GB')} in sales.`,
        diversified >= 2 ? 'Spreading across channels reduced your risk — nice.' : 'Putting everything in one channel is a gamble — it can boom or bust.',
        'Real marketing directors test, measure and shift budget weekly based on results.',
      ],
      chart: Object.entries(alloc).map(([k, v]) => ({ label: k === 'tiktok' ? 'Video' : k === 'creators' ? 'Creators' : k === 'search' ? 'Search' : 'Posters', value: Math.round(Math.sqrt(v) * (eff[k] ?? 1) * 26) })),
      chartLabel: 'Reach by channel (hundreds)',
      bonus: Math.min(1, sales / 3000),
    };
  },
};

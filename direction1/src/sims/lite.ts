import type { Sim, StepResult } from './types';

const avg = (r: Record<string, StepResult>) => {
  const v = Object.values(r);
  return v.length ? v.reduce((s, x) => s + x.score, 0) / v.length : 0;
};
const verdict = (good: string, ok: string, low: string, lines: string[]) => (_a: unknown, r: Record<string, StepResult>) => {
  const s = avg(r);
  return { headline: s > 0.8 ? good : s > 0.5 ? ok : low, lines };
};

export const scientist: Sim = {
  id: 'scientist', title: 'The Plant Mystery', role: 'Research Scientist', careerId: 'research-scientist', world: 'science',
  minutes: 3, glyph: 'flask', client: 'Your own lab (fictional)',
  brief: 'A gardener swears plants grow faster when you play them music. Design an experiment that could actually find out.',
  steps: [
    { kind: 'choice', id: 'hyp', title: 'Your hypothesis', prompt: 'Which hypothesis can you actually test?', options: [
      { id: 'h1', label: 'Plants exposed to 2 hours of music a day grow taller in 4 weeks than plants in silence', glyph: 'pencil', score: 3, feedback: 'Specific and measurable. Lovely.', skills: ['analysis'] },
      { id: 'h2', label: 'Plants like music', glyph: 'heart', score: 0, feedback: '“Like” can’t be measured.', skills: [] },
      { id: 'h3', label: 'Music affects plants somehow', glyph: 'music', score: 1, feedback: 'Too vague to prove or disprove.', skills: ['curiosity'] },
    ] },
    { kind: 'choice', id: 'control', title: 'Keep it fair', prompt: 'What must stay the same for both groups?', options: [
      { id: 'all', label: 'Light, water, soil, plant type and temperature', glyph: 'check', score: 3, feedback: 'Exactly — only the music should change.', skills: ['analysis', 'problem'] },
      { id: 'water', label: 'Just the water', glyph: 'drop', score: 1, feedback: 'Good start, but light or warmth could skew results.', skills: ['analysis'] },
      { id: 'none', label: 'Doesn’t matter', glyph: 'dice', score: 0, feedback: 'Then you can’t tell what caused any difference.', skills: [] },
    ] },
    { kind: 'choice', id: 'n', title: 'How many plants?', prompt: 'Choose your sample size.', options: [
      { id: 'one', label: '1 plant per group', glyph: 'leaf', score: 0, feedback: 'One weird plant could fool you.', skills: [] },
      { id: 'twenty', label: '20 plants per group', glyph: 'tree', score: 3, feedback: 'Enough to spot a real pattern.', skills: ['analysis'] },
      { id: 'thousand', label: '1,000 plants per group', glyph: 'globe', score: 2, feedback: 'Very robust — if you have a warehouse and a budget!', skills: ['commercial'] },
    ] },
    { kind: 'choice', id: 'surprise', title: 'A surprise', prompt: 'The silent plants grew MORE. What do you do?', options: [
      { id: 'report', label: 'Report it honestly and repeat the experiment', glyph: 'clipboard', score: 3, feedback: 'That’s science. Surprises are where discoveries live.', skills: ['curiosity', 'resilience'] },
      { id: 'hide', label: 'Leave that result out', glyph: 'eye', score: 0, feedback: 'Hiding data is a serious breach of research ethics.', skills: [] },
      { id: 'blame', label: 'Assume the equipment broke', glyph: 'gear', score: 1, feedback: 'Worth checking — but don’t dismiss data you don’t like.', skills: ['analysis'] },
    ] },
  ],
  evaluate: verdict('Peer reviewers: “Rigorous and elegant.”', 'A solid experiment with room to tighten.', 'Reviewers have questions — let’s refine.', ['Research is mostly careful design and honest reporting.', 'Fair tests, enough samples and openness to surprise — that’s the scientific method.']),
};

export const ecologist: Sim = {
  id: 'ecologist', title: 'Rewild the Field', role: 'Ecologist', careerId: 'ecologist', world: 'nature',
  minutes: 3, glyph: 'leaf', client: 'Meadowbrook Parish Council (fictional)',
  brief: 'A town has an empty, mown field the size of four football pitches. They want it to be “good for nature” and loved by locals. You’re the ecologist.',
  steps: [
    { kind: 'choice', id: 'survey', title: 'Start with a survey', prompt: 'What do you do first?', options: [
      { id: 'survey', label: 'Survey what already lives there across seasons', glyph: 'eye', score: 3, feedback: 'Always know your baseline before changing anything.', skills: ['analysis', 'curiosity'] },
      { id: 'plant', label: 'Plant 500 trees immediately', glyph: 'tree', score: 1, feedback: 'Well meant — but trees on rare grassland can harm it.', skills: [] },
      { id: 'ask', label: 'Ask locals what they want', glyph: 'chat', score: 2, feedback: 'Important — but combine it with a wildlife survey.', skills: ['communication'] },
    ] },
    { kind: 'multi', id: 'habitats', title: 'Choose habitats', pick: 2, prompt: 'Pick two habitats to create.', options: [
      { id: 'meadow', label: 'Wildflower meadow', glyph: 'sun', score: 3, feedback: 'A pollinator paradise.', skills: ['curiosity'] },
      { id: 'pond', label: 'A shallow pond', glyph: 'drop', score: 3, feedback: 'Ponds are biodiversity hotspots.', skills: ['curiosity'] },
      { id: 'hedge', label: 'Native hedgerows', glyph: 'leaf', score: 2, feedback: 'Corridors for wildlife.', skills: ['craft'] },
      { id: 'lawn', label: 'Neat lawn', glyph: 'flag', score: 0, feedback: 'That’s what’s there now!', skills: [] },
    ] },
    { kind: 'choice', id: 'people', title: 'Bring people in', prompt: 'How do you get locals on board?', options: [
      { id: 'volunteer', label: 'Community planting days + a mown path', glyph: 'friends', score: 3, feedback: 'People protect what they help create.', skills: ['communication', 'leadership'] },
      { id: 'fence', label: 'Fence it off to protect it', glyph: 'shield', score: 1, feedback: 'Protective, but locals may resent losing the space.', skills: [] },
      { id: 'signs', label: 'Put up information signs', glyph: 'book', score: 2, feedback: 'Helpful — even better with involvement.', skills: ['communication'] },
    ] },
    { kind: 'choice', id: 'measure', title: 'Measure success', prompt: 'How will you know it worked?', options: [
      { id: 'repeat', label: 'Repeat the survey every year and compare', glyph: 'chart', score: 3, feedback: 'Evidence over impressions.', skills: ['analysis'] },
      { id: 'look', label: 'If it looks nice, it worked', glyph: 'eye', score: 0, feedback: 'Looks can deceive.', skills: [] },
    ] },
  ],
  evaluate: verdict('Two years on: butterflies tripled.', 'The field is buzzing with new life.', 'Some progress — nature takes time.', ['Ecologists blend science with people skills.', 'Fieldwork, data and community all matter.']),
};

export const coach: Sim = {
  id: 'coach', title: 'Turn the Season Around', role: 'Sports Coach', careerId: 'sports-coach', world: 'sport',
  minutes: 3, glyph: 'trophy', client: 'Riverside U18s (fictional team)',
  brief: 'Your youth team has lost three games in a row and confidence is low. You’ve got one week before the next match.',
  steps: [
    { kind: 'choice', id: 'talk', title: 'Team talk', prompt: 'What do you say at the first session?', options: [
      { id: 'honest', label: 'Honest review + one thing we did well', glyph: 'chat', score: 3, feedback: 'Balanced honesty builds trust.', skills: ['leadership', 'communication'] },
      { id: 'shout', label: 'Tell them they’re embarrassing', glyph: 'megaphone', score: 0, feedback: 'Shame rarely improves performance.', skills: [] },
      { id: 'ignore', label: 'Say nothing, just train', glyph: 'eye', score: 1, feedback: 'Players need to know what’s changing.', skills: [] },
    ] },
    { kind: 'choice', id: 'focus', title: 'Training focus', prompt: 'You conceded late goals every game. Focus on…', options: [
      { id: 'fitness', label: 'Match fitness and game management', glyph: 'dumbbell', score: 3, feedback: 'Targets the real pattern in the data.', skills: ['analysis'] },
      { id: 'tricks', label: 'New skill moves', glyph: 'star', score: 1, feedback: 'Fun, but not the problem.', skills: ['creativity'] },
      { id: 'set', label: 'Set pieces', glyph: 'target', score: 2, feedback: 'Useful, partly addresses it.', skills: ['problem'] },
    ] },
    { kind: 'choice', id: 'pick', title: 'Selection', prompt: 'Your best striker has missed training twice. Do they start?', options: [
      { id: 'talk', label: 'Talk to them first — find out why', glyph: 'handshake', score: 3, feedback: 'There may be something going on at home or school.', skills: ['empathy', 'leadership'] },
      { id: 'drop', label: 'Drop them, no discussion', glyph: 'flag', score: 1, feedback: 'Consistent, but you may miss the reason.', skills: [] },
      { id: 'start', label: 'Start them — we need goals', glyph: 'ball', score: 1, feedback: 'Others may see this as unfair.', skills: [] },
    ] },
  ],
  evaluate: verdict('2–1 win! The team believes again.', 'A draw — and a big step forward.', 'Another loss, but you learned loads.', ['Coaching is mostly people skills plus smart analysis.', 'The best coaches build confidence as well as technique.']),
};

export const hotel: Sim = {
  id: 'hotel', title: 'The Overbooked Night', role: 'Hotel Manager', careerId: 'hotel-manager', world: 'travel',
  minutes: 3, glyph: 'key', client: 'The Harbour Hotel (fictional)',
  brief: 'It’s 10pm on a festival weekend. The system double-booked a room and a tired family of four has just arrived with no room.',
  steps: [
    { kind: 'choice', id: 'first', title: 'First thirty seconds', prompt: 'What do you do first?', options: [
      { id: 'apologise', label: 'Apologise sincerely, offer drinks and a seat', glyph: 'cup', score: 3, feedback: 'Calm them first, solve second.', skills: ['empathy', 'communication'] },
      { id: 'system', label: 'Explain it was the computer’s fault', glyph: 'laptop', score: 0, feedback: 'True, but guests don’t care whose fault it is.', skills: [] },
    ] },
    { kind: 'choice', id: 'solve', title: 'Find a fix', prompt: 'You have no rooms. Options?', options: [
      { id: 'partner', label: 'Book a nearby hotel, pay the taxi, offer breakfast here', glyph: 'handshake', score: 3, feedback: 'Turns a disaster into loyalty.', skills: ['problem', 'commercial'] },
      { id: 'sofa', label: 'Offer the lobby sofas', glyph: 'house', score: 0, feedback: 'Not appropriate for a family.', skills: [] },
      { id: 'suite', label: 'Give them the honeymoon suite (still free)', glyph: 'crown', score: 2, feedback: 'Generous — check nobody’s due in it!', skills: ['problem'] },
    ] },
    { kind: 'choice', id: 'after', title: 'Next morning', prompt: 'How do you prevent it happening again?', options: [
      { id: 'review', label: 'Review the booking system with the team', glyph: 'clipboard', score: 3, feedback: 'Fix root causes, not just symptoms.', skills: ['leadership', 'analysis'] },
      { id: 'blame', label: 'Find out who to blame', glyph: 'eye', score: 0, feedback: 'Blame culture makes people hide mistakes.', skills: [] },
    ] },
  ],
  evaluate: verdict('5-star review: “Best service we’ve ever had.”', 'The family left happy.', 'The family were not impressed.', ['Hospitality is calm problem-solving with a smile.', 'Great managers turn bad moments into loyal guests.']),
};

export const electrician: Sim = {
  id: 'electrician', title: 'The Tripping Switch', role: 'Electrician', careerId: 'electrician', world: 'trades',
  minutes: 3, glyph: 'bolt', client: 'Mrs Patel’s kitchen (fictional)',
  brief: 'Every time Mrs Patel uses her kettle and toaster together, the power trips. Find the fault safely and fix it.',
  disclaimer: 'A simplified learning scenario. Electrical work must only be done by qualified people.',
  steps: [
    { kind: 'choice', id: 'safe', title: 'Safety first', prompt: 'Before touching anything…', options: [
      { id: 'isolate', label: 'Isolate the circuit, lock it off and test it’s dead', glyph: 'shield', score: 3, feedback: 'Safe isolation is the number-one rule.', skills: ['problem', 'craft'] },
      { id: 'quick', label: 'Just be careful', glyph: 'bolt', score: 0, feedback: 'Never work live. Ever.', skills: [] },
    ] },
    { kind: 'choice', id: 'test', title: 'Find the fault', prompt: 'What do you check?', options: [
      { id: 'load', label: 'Check the circuit rating versus the appliances’ load', glyph: 'calculator', score: 3, feedback: 'Kettle + toaster can draw ~5kW — too much for that circuit.', skills: ['analysis'] },
      { id: 'kettle', label: 'Assume the kettle is broken', glyph: 'cup', score: 1, feedback: 'Possible — but test before assuming.', skills: [] },
    ] },
    { kind: 'choice', id: 'fix', title: 'The fix', prompt: 'What do you recommend?', options: [
      { id: 'circuit', label: 'Add a dedicated kitchen circuit', glyph: 'wrench', score: 3, feedback: 'The proper, safe solution.', skills: ['craft', 'problem'] },
      { id: 'bigger', label: 'Fit a bigger breaker', glyph: 'gear', score: 0, feedback: 'Dangerous — the cables could overheat.', skills: [] },
      { id: 'advice', label: 'Tell her not to use both at once', glyph: 'chat', score: 1, feedback: 'A short-term workaround only.', skills: ['communication'] },
    ] },
    { kind: 'choice', id: 'explain', title: 'Explain it', prompt: 'Mrs Patel asks what was wrong.', options: [
      { id: 'clear', label: 'Simple explanation + written quote', glyph: 'clipboard', score: 3, feedback: 'Clear communication earns repeat customers.', skills: ['communication', 'commercial'] },
      { id: 'tech', label: 'Full technical lecture', glyph: 'book', score: 1, feedback: 'Accurate, but overwhelming.', skills: [] },
    ] },
  ],
  evaluate: verdict('Fixed, certified, and Mrs Patel tells all her neighbours.', 'Job done — a happy customer.', 'Job done, but let’s review the safety steps.', ['Trades are problem-solving with real consequences.', 'Good tradespeople are safety experts and great communicators.']),
};

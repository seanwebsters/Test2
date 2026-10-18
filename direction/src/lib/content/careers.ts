import { CAREER_ROWS, type CareerRow } from "./careers-data";
import type { Career, CategoryId, DaySlot, RouteId, Traits } from "./types";

const CATEGORY_DAYS: Record<CategoryId, (title: string) => DaySlot[]> = {
  creative: (t) => [
    { time: "09:30", title: "Inspiration hunt", detail: `Most ${t}s start by soaking up references, competitors and culture.` },
    { time: "10:30", title: "Brief or project check-in", detail: "Agree what success looks like with a client or team lead." },
    { time: "11:30", title: "Making time", detail: "Heads-down sketching, designing or building — the bit most people picture." },
    { time: "14:30", title: "Crit and feedback", detail: "Share work in progress, take notes, push it further." },
    { time: "16:30", title: "Polish and present", detail: "Refine the strongest idea and get it ready to show." },
  ],
  business: (t) => [
    { time: "09:00", title: "Priorities", detail: `A ${t} starts by checking numbers, inbox and the plan for the day.` },
    { time: "10:00", title: "Meetings that matter", detail: "Work through decisions with colleagues, customers or partners." },
    { time: "12:00", title: "Problem solving", detail: "Dig into a problem: data, options and a recommendation." },
    { time: "14:30", title: "Stakeholder time", detail: "Persuade, negotiate or update the people who need to know." },
    { time: "16:30", title: "Wrap and plan", detail: "Write up next steps and follow up on promises." },
  ],
  tech: (t) => [
    { time: "09:30", title: "Stand-up", detail: "Quick team sync: what's done, what's next, what's blocked." },
    { time: "10:00", title: "Focus block", detail: `Deep, uninterrupted work — the core of being a ${t}.` },
    { time: "13:30", title: "Review & collaborate", detail: "Review teammates' work, pair on tricky problems." },
    { time: "15:00", title: "Investigate", detail: "Chase down an issue, read docs, test an idea." },
    { time: "16:30", title: "Ship or document", detail: "Release, write notes and set up tomorrow." },
  ],
  film: (t) => [
    { time: "07:00", title: "Early call", detail: "Shoot days start early — and can run long." },
    { time: "08:30", title: "Prep", detail: "Check the plan for the day's scenes or content." },
    { time: "10:00", title: "On set / in the edit", detail: `Doing the core craft of a ${t}, take after take.` },
    { time: "14:00", title: "Collaborate", detail: "Solve problems with the director, crew or client." },
    { time: "18:00", title: "Wrap and review", detail: "Review what you captured and prep for tomorrow." },
  ],
  music: (t) => [
    { time: "11:00", title: "Late start", detail: "Music hours often skew later — studios and gigs run into the night." },
    { time: "12:00", title: "Admin & emails", detail: "Bookings, releases, collaborators and payments." },
    { time: "14:00", title: "Studio session", detail: `Hands-on creative time — the heart of being a ${t}.` },
    { time: "18:00", title: "Networking", detail: "Catch up with artists, managers or promoters." },
    { time: "21:00", title: "Live or listening", detail: "Gigs, sets or new releases to stay sharp." },
  ],
  fashion: (t) => [
    { time: "09:30", title: "Trend research", detail: "Social, street style, shows and sales data." },
    { time: "11:00", title: "Design or sourcing", detail: `Core craft time for a ${t}: sketches, fabrics, samples or edits.` },
    { time: "13:30", title: "Fittings & meetings", detail: "Work with pattern cutters, models, buyers or suppliers." },
    { time: "15:30", title: "Shoot or line review", detail: "Check the collection or content comes together." },
    { time: "17:30", title: "Next season", detail: "Fashion runs months ahead — plan what's next." },
  ],
  marketing: (t) => [
    { time: "09:00", title: "What's happening", detail: "Check news, trends and campaign performance." },
    { time: "10:00", title: "Plan & brief", detail: "Agree goals, audiences and messages with the team." },
    { time: "11:30", title: "Create", detail: `Write, design, pitch or build — the craft of a ${t}.` },
    { time: "14:30", title: "Publish & engage", detail: "Launch content, talk to audiences or journalists." },
    { time: "16:30", title: "Measure", detail: "See what worked and adjust tomorrow's plan." },
  ],
  finance: (t) => [
    { time: "08:00", title: "Markets & news", detail: "Read what moved overnight and why it matters." },
    { time: "09:00", title: "Analysis", detail: `Models, spreadsheets and reports — core work for a ${t}.` },
    { time: "12:00", title: "Team review", detail: "Check numbers and assumptions with colleagues." },
    { time: "14:00", title: "Client or stakeholder time", detail: "Explain what the numbers mean and recommend a decision." },
    { time: "17:00", title: "Deadlines", detail: "Finalise deliverables — some days run late." },
  ],
  healthcare: (t) => [
    { time: "07:30", title: "Handover", detail: "Shifts start with a briefing on patients and priorities." },
    { time: "08:30", title: "Patient care", detail: `Assess, treat and support patients — the heart of being a ${t}.` },
    { time: "12:30", title: "Team huddle", detail: "Work through complex cases with colleagues." },
    { time: "14:00", title: "Clinics or rounds", detail: "More patients, plus notes and referrals." },
    { time: "19:30", title: "Handover", detail: "Pass on what the next shift needs to know. Shift patterns vary." },
  ],
  science: (t) => [
    { time: "09:00", title: "Plan the experiment", detail: "Check protocols, samples and equipment." },
    { time: "10:00", title: "Lab or field work", detail: `Hands-on investigation — core work for a ${t}.` },
    { time: "13:00", title: "Data time", detail: "Analyse results, spot patterns, check what's surprising." },
    { time: "15:00", title: "Lab meeting", detail: "Share findings and get challenged by peers." },
    { time: "16:30", title: "Write it up", detail: "Record results carefully — science runs on good notes." },
  ],
  engineering: (t) => [
    { time: "08:30", title: "Project check", detail: "Review schedules, risks and today's design questions." },
    { time: "09:30", title: "Design work", detail: `Calculations, CAD and simulations — core work for a ${t}.` },
    { time: "12:30", title: "Site or lab visit", detail: "See the real thing and test assumptions." },
    { time: "14:30", title: "Design review", detail: "Present your solution and respond to challenges." },
    { time: "16:30", title: "Document", detail: "Specs and reports that others can build from." },
  ],
  sports: (t) => [
    { time: "07:00", title: "Early session", detail: "Training days start early." },
    { time: "09:00", title: "Plan & review", detail: "Review data or video from the last session." },
    { time: "11:00", title: "Hands-on", detail: `Training, coaching or deals — the core of being a ${t}.` },
    { time: "15:00", title: "Recovery & admin", detail: "Plans, reports and looking after people." },
    { time: "19:00", title: "Match or event", detail: "Evenings and weekends are often game time." },
  ],
  law: (t) => [
    { time: "08:30", title: "Inbox triage", detail: "Clients, deadlines and court dates." },
    { time: "09:30", title: "Research & drafting", detail: `Reading cases and drafting documents — core work for a ${t}.` },
    { time: "12:00", title: "Client meeting", detail: "Understand the problem and explain options clearly." },
    { time: "14:00", title: "Negotiation or hearing", detail: "Argue the position and protect your client." },
    { time: "17:00", title: "Billing & prep", detail: "Record time and prepare for tomorrow." },
  ],
  education: (t) => [
    { time: "08:00", title: "Prep", detail: "Set up for the day's sessions." },
    { time: "09:00", title: "Teaching", detail: `Live sessions with learners — the heart of being a ${t}.` },
    { time: "12:30", title: "Support time", detail: "One-to-one help, pastoral care and parents." },
    { time: "14:00", title: "More sessions", detail: "Adapt to how each group is doing." },
    { time: "16:00", title: "Marking & planning", detail: "Feedback on work and planning next week." },
  ],
  hospitality: (t) => [
    { time: "10:00", title: "Prep & briefing", detail: "Get the team and space ready." },
    { time: "12:00", title: "Service", detail: `Busy, fast and people-focused — the core of being a ${t}.` },
    { time: "15:00", title: "Reset", detail: "Orders, rotas and a breather." },
    { time: "18:00", title: "Evening rush", detail: "Peak time: stay calm and keep standards high." },
    { time: "22:00", title: "Close", detail: "Wrap up and note what to improve. Hours are often evenings and weekends." },
  ],
  public: (t) => [
    { time: "08:30", title: "Briefing", detail: "Understand today's priorities and risks." },
    { time: "09:30", title: "Frontline or desk work", detail: `Working on behalf of the public — core work for a ${t}.` },
    { time: "12:30", title: "Partners", detail: "Coordinate with other services and organisations." },
    { time: "14:30", title: "Casework or research", detail: "Detailed work on a case, policy or project." },
    { time: "17:00", title: "Records & handover", detail: "Public service runs on accountability and good records." },
  ],
};

const CATEGORY_CHALLENGES: Record<CategoryId, string[]> = {
  creative: ["Your work will be critiqued constantly — it makes you better, but it can sting.", "Early-career pay can be modest and competition for roles is high."],
  business: ["Pressure to hit targets can be intense.", "You'll need to make decisions with incomplete information."],
  tech: ["The tools change fast, so you'll keep learning for your whole career.", "Entry-level roles are competitive — projects you've built help you stand out."],
  film: ["Lots of freelance and short-term contracts, especially early on.", "Long, irregular hours on productions."],
  music: ["Income is often irregular and comes from several sources.", "Rejection is part of the job; persistence matters."],
  fashion: ["Highly competitive with intense deadlines around seasons.", "Early roles can involve a lot of unglamorous admin."],
  marketing: ["Results are visible and measured — there's nowhere to hide.", "The landscape shifts every time platforms change."],
  finance: ["Long hours are common in some areas, particularly early on.", "Professional exams while working take serious discipline."],
  healthcare: ["Emotionally demanding work, including shifts at night and weekends.", "Long training routes for many roles."],
  science: ["Experiments fail often; patience is essential.", "Research careers can involve short-term contracts."],
  engineering: ["Mistakes can be costly, so precision really matters.", "Chartership takes years of documented experience."],
  sports: ["Many roles involve evenings, weekends and travel.", "Competitive entry and often modest early pay."],
  law: ["Heavy reading, long hours and high stakes.", "Competition for training roles is fierce."],
  education: ["Workload outside contact time can be heavy.", "Supporting people through hard moments takes emotional energy."],
  hospitality: ["Evenings, weekends and holidays are peak working times.", "Physically demanding, fast-paced work."],
  public: ["Bureaucracy and constraints can be frustrating.", "Some roles expose you to difficult situations."],
};

function parseTraits(tr: string): Traits {
  if (!/^\d{10}$/.test(tr)) throw new Error(`Bad trait code ${tr}`);
  const d = tr.split("").map((x) => Number(x) / 9);
  return {
    create: d[0]!, solve: d[1]!, help: d[2]!, lead: d[3]!, social: d[4]!,
    money: d[5]!, creativity: d[6]!, stability: d[7]!, flexibility: d[8]!, impact: d[9]!,
  };
}

function build(row: CareerRow): Career {
  return {
    slug: row.s,
    title: row.t,
    category: row.c,
    tagline: row.tag,
    summary: row.sum,
    skills: row.sk,
    salary: { entry: row.pay[0], mid: row.pay[1], senior: row.pay[2], variable: row.pay[3] === "v" },
    routes: row.r as RouteId[],
    qualifications: row.q,
    progression: row.p,
    related: row.rel ?? [],
    challenges: row.ch ?? CATEGORY_CHALLENGES[row.c],
    dayInLife: row.day ?? CATEGORY_DAYS[row.c](row.t),
    traits: parseTraits(row.tr),
    interests: row.i,
    pathway: row.full ? "full" : "starter",
    featured: row.featured,
  };
}

export const CAREERS: Career[] = CAREER_ROWS.map(build);

const bySlug = new Map(CAREERS.map((c) => [c.slug, c]));

// Fill in related careers for rows that didn't specify them.
for (const c of CAREERS) {
  if (c.related.length === 0) {
    c.related = CAREERS.filter((o) => o.category === c.category && o.slug !== c.slug).slice(0, 4).map((o) => o.slug);
  }
  c.related = c.related.filter((s) => bySlug.has(s) && s !== c.slug);
}

export function getCareer(slug: string): Career | undefined {
  return bySlug.get(slug);
}

export function requireCareer(slug: string): Career {
  const c = bySlug.get(slug);
  if (!c) throw new Error(`Unknown career ${slug}`);
  return c;
}

export const ROUTE_LABELS: Record<RouteId, { name: string; detail: string }> = {
  degree: { name: "University degree", detail: "Study a related subject at university." },
  apprenticeship: { name: "Apprenticeship", detail: "Earn a salary while you train, with no tuition fees." },
  "self-taught": { name: "Self-taught", detail: "Learn from free and low-cost resources and prove it with projects." },
  bootcamp: { name: "Bootcamp / short course", detail: "Intensive training over weeks or months." },
  portfolio: { name: "Portfolio-first", detail: "Let your work speak: projects get you hired." },
  "graduate-scheme": { name: "Graduate scheme", detail: "Structured programmes for recent graduates." },
  vocational: { name: "College & vocational", detail: "Practical qualifications such as BTECs, T Levels or diplomas." },
  "entry-level": { name: "Entry-level role", detail: "Start in a junior or assistant role and work up." },
  postgrad: { name: "Postgraduate study", detail: "Master's or doctorate for specialist roles." },
  freelance: { name: "Freelance", detail: "Work for yourself, project by project." },
  "start-up": { name: "Start something", detail: "Launch your own project or business." },
  "training-contract": { name: "Training contract / QWE", detail: "Supervised legal work experience." },
  military: { name: "Armed forces", detail: "Train in a technical role through the forces." },
};

export function searchCareers(query: string, category?: CategoryId | null): Career[] {
  const q = query.trim().toLowerCase();
  return CAREERS.filter((c) => {
    if (category && c.category !== category) return false;
    if (!q) return true;
    return (
      c.title.toLowerCase().includes(q) ||
      c.tagline.toLowerCase().includes(q) ||
      c.summary.toLowerCase().includes(q) ||
      c.skills.some((s) => s.includes(q))
    );
  });
}

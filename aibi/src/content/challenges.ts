import type { WriteTask } from "./types";
import type { Profile } from "./profile";
import { C } from "./criteria";
import { hashString } from "@/lib/date";

export interface DailyChallenge {
  id: string;
  emoji: string;
  title: string;
  tags: string[]; // matches Interest / Work ids
  gradient: [string, string];
  task: WriteTask;
}

export const CHALLENGES: DailyChallenge[] = [
  {
    id: "dinners-30",
    emoji: "🍝",
    title: "Plan five dinners for under £30",
    tags: ["everyday", "growth", "notworking", "student"],
    gradient: ["#F59E0B", "#EF4444"],
    task: {
      title: "Five dinners, under £30",
      brief: "Use AI to plan five weeknight dinners for your household for under £30 total, with a shopping list.",
      placeholder: "Plan 5 dinners for … under £30. We like … Give me a table and a shopping list.",
      output: "plan",
      criteria: [C.detail(20), C.has("budget", "Budget", "Include the £30 limit.", ["£\\s?30", "budget", "under £"]), C.has("people", "Who's eating", "Say how many people.", ["\\d\\s?(people|adults|kids)", "for (two|three|four|me|my family|us)", "family"]), C.has("list", "Shopping list", "Ask for a shopping list.", ["shopping list", "list"])],
      demo: {
        strong: "**5 dinners for 2 — about £27**\n\n| Night | Dinner |\n|---|---|\n| Mon | Chickpea & spinach curry |\n| Tue | Egg fried rice with peas |\n| Wed | Lentil & tomato soup |\n| Thu | Roasted pepper & feta pasta |\n| Fri | Flatbread pizzas |\n\n**Shopping list:** rice, chickpeas, spinach, lentils, tinned tomatoes ×4, pasta, peppers, feta, eggs, peas, flour, mozzarella, onions & garlic.\n\n*Prices are estimates — check your supermarket app.*",
        weak: "Pasta, rice and soups are cheap. Shop at discount supermarkets.",
      },
    },
  },
  {
    id: "messy-email",
    emoji: "📧",
    title: "Turn a messy paragraph into a professional email",
    tags: ["work", "office", "business", "owner"],
    gradient: ["#2563EB", "#7C3AED"],
    task: {
      title: "Messy to professional",
      brief: "Rewrite this with AI: \"hey so cant make thurs mtg, can we do fri am? also still waiting on the figures from u, need them for the board pack, thx\"",
      placeholder: "Turn this into a polite, professional email to … Keep it …",
      output: "email",
      criteria: [C.detail(12), C.has("recipient", "Recipient", "Who's it to?", ["manager", "boss", "client", "colleague", "team", "to (my|the|a)"]), C.tone(), C.constraints()],
      demo: {
        strong: "**Subject:** Thursday's meeting & board pack figures\n\nHi Chris,\n\nUnfortunately I can't make Thursday's meeting — would Friday morning work instead? I'm free from 9 until 12.\n\nAlso, could you send the latest figures when you have a moment? I need them for the board pack by Wednesday.\n\nThanks so much,\nSam",
        weak: "Dear Sir, I cannot attend. Please send figures. Regards.",
      },
    },
  },
  {
    id: "birthday-card",
    emoji: "🎂",
    title: "Create a personalised birthday card",
    tags: ["everyday", "creativity", "growth", "creator"],
    gradient: ["#EC4899", "#F59E0B"],
    task: {
      title: "A birthday card they'll keep",
      brief: "Ask AI to write a birthday card message for someone you love — with a real memory or inside joke.",
      placeholder: "Write a birthday card for my … turning … Remember when …",
      criteria: [C.detail(18), C.has("details", "Personal details", "Add a name, age or memory.", ["remember", "when we", "favourite", "turning", "joke", "\\d{2}"]), C.tone(), C.constraints()],
      demo: {
        strong: "**Warm:** \"Happy 40th, Jo! Here's to more Sunday swims, terrible karaoke and the legendary Cornwall tent disaster. Love you loads x\"\n\n**Funny:** \"40 and still can't fold a fitted sheet. Never change.\"\n\n**Short:** \"To my favourite adventure buddy — happy birthday!\"",
        weak: "Happy birthday! Have a great day!",
      },
    },
  },
  {
    id: "first-website",
    emoji: "🌐",
    title: "Build your first website",
    tags: ["build", "business", "owner", "creator"],
    gradient: ["#0EA5E9", "#6366F1"],
    task: {
      title: "Brief your first website",
      brief: "Write a brief for a one-page website — then build it for real in Playground → Build a website.",
      placeholder: "A one-page website for … Sections: … Style: … Main action: …",
      output: "plan",
      criteria: [C.detail(20), C.has("sections", "Sections", "List sections.", ["section", "hero", "about", "services", "contact", "gallery", "menu"]), C.has("style", "Style", "Colours and feel.", ["colou?r", "style", "modern", "friendly", "minimal", "bold"]), C.has("action", "Main action", "What should visitors do?", ["book", "buy", "sign ?up", "contact", "order", "rsvp"])],
      demo: {
        strong: "Your brief is ready to build! ✅ Clear audience ✅ Sections ✅ Style ✅ Call to action.\n\n**Next:** open **Playground → Build a website**, paste your brief and watch your page appear in seconds.",
        weak: "A website needs pages. Add some text.",
      },
    },
  },
  {
    id: "business-5",
    emoji: "💡",
    title: "Create a business idea in five minutes",
    tags: ["business", "build", "owner", "student", "growth"],
    gradient: ["#10B981", "#0EA5E9"],
    task: {
      title: "Five-minute business idea",
      brief: "Ask AI for side-business ideas based on your skills, time and budget — and a free way to test the best one.",
      placeholder: "I'm good at … I have … hours a week and £… Suggest 3 ideas and how to test one for free.",
      output: "list",
      criteria: [C.detail(20), C.has("skills", "Your skills", "Share what you're good at.", ["good at", "skill", "experience", "i (can|love|know)"]), C.constraints(), C.has("test", "Test it", "Ask how to test it.", ["test", "validate", "try", "first step"])],
      demo: {
        strong: "**3 ideas that fit you**\n1. **Weekend sourdough club** – pre-orders for your street (£60 to start)\n2. **Bake-along workshops** – 6 people × £25\n3. **Gluten-free celebration cakes** – underserved locally\n\n**Test #1 for free this week:** post in your local group — \"Would you pre-order a loaf for Saturday? £4.50\". Aim for 10 yeses.",
        weak: "Start an online shop or become a freelancer.",
      },
    },
  },
  {
    id: "automate-3",
    emoji: "⚙️",
    title: "Identify three tasks you could automate at work",
    tags: ["work", "office", "owner", "business"],
    gradient: ["#10B981", "#3B82F6"],
    task: {
      title: "Three tasks to automate",
      brief: "Describe your typical week and ask AI to find three repetitive tasks you could automate, with tools and time saved.",
      placeholder: "I'm a … Every week I … Find 3 tasks I could automate, with tools and time saved, as a table.",
      output: "list",
      criteria: [C.detail(25), C.context(), C.has("tasks", "Real tasks", "Describe specific repetitive tasks.", ["every (day|week|morning)", "copy", "send", "remind", "report", "update", "email"]), C.format()],
      demo: {
        strong: "| Task | Tool | Saves |\n|---|---|---|\n| Copying enquiries into a tracker | Zapier/Make | 45 min/wk |\n| Monday status email (you approve) | Power Automate + Copilot | 40 min/wk |\n| Invoice reminders | Accounting software | 1 hr/wk |\n\nStart with #1 — low risk, easy to test.",
        weak: "Use automation tools to automate tasks.",
      },
    },
  },
  {
    id: "explain-bill",
    emoji: "🧾",
    title: "Get a confusing bill explained — safely",
    tags: ["everyday", "growth", "notworking", "student"],
    gradient: ["#8B5CF6", "#6366F1"],
    task: {
      title: "Decode a bill, safely",
      brief: "Ask AI to explain a confusing bill or letter (phone, energy, council tax) — using placeholders instead of personal details.",
      placeholder: "My [SUPPLIER] bill says … Please explain what … means and what I should check.",
      criteria: [C.detail(18), C.has("private", "Kept it private", "Use placeholders like [NAME] or leave details out.", ["\\[", "placeholder", "my (bill|supplier|provider|letter)"]), C.has("ask", "Clear question", "Say what you want explained.", ["explain", "what does", "what should", "\\?"]), C.format()],
      demo: {
        strong: "**What your bill means**\n• **Standing charge** – a daily fee, even if you use nothing\n• **Unit rate** – what you pay per kWh used\n• **Estimated reading (E)** – they guessed your usage; submit a real reading to correct it\n\n**Check:** meter readings, tariff end date, and any exit fees before switching.",
        weak: "Bills can be confusing. Contact your provider.",
      },
    },
  },
  {
    id: "weekend-plan",
    emoji: "🗺️",
    title: "Plan a perfect weekend near you",
    tags: ["everyday", "growth", "creativity"],
    gradient: ["#F59E0B", "#EC4899"],
    task: {
      title: "Perfect local weekend",
      brief: "Ask AI to plan a weekend in or near your town that fits your budget and interests — and say what to double-check.",
      placeholder: "Plan a weekend near … for … who love … Budget £… Format as …",
      output: "plan",
      criteria: [C.detail(22), C.context(), C.has("budget", "Budget", "Add a budget.", ["£\\s?\\d", "budget", "free", "cheap"]), C.format()],
      demo: {
        strong: "**Saturday:** farmers' market breakfast → riverside walk → independent bookshop → pizza night\n**Sunday:** National Trust garden (members free) → Sunday roast at a village pub → film at the community cinema\n\n**Budget:** ≈ £70 for two\n**Check before you go:** opening times and booking for the pub.",
        weak: "Go for a walk and visit a café.",
      },
    },
  },
  {
    id: "story-kid",
    emoji: "📖",
    title: "Write a bedtime story starring someone you love",
    tags: ["creativity", "everyday", "creator"],
    gradient: ["#6366F1", "#EC4899"],
    task: {
      title: "A personalised bedtime story",
      brief: "Ask AI for a short bedtime story starring a child (or grown-up!) you know — include their name, favourite things and length.",
      placeholder: "Write a 3-minute bedtime story for … who loves … Make it …",
      criteria: [C.detail(18), C.has("character", "Characters", "Name the star and their loves.", ["named|called|for my", "loves", "favourite"]), C.tone(), C.constraints()],
      demo: {
        strong: "**Milo and the Moon Biscuit**\n\nMilo, who was five and three-quarters, was certain the moon was a biscuit…\n\n*(A gentle 3-minute story with Pickle the dog, a laundry-basket rocket and a sleepy, happy ending.)*",
        weak: "Once upon a time there was a child. The end.",
      },
    },
  },
  {
    id: "cv-bullet",
    emoji: "📄",
    title: "Upgrade your CV in one prompt",
    tags: ["work", "growth", "student", "notworking", "office"],
    gradient: ["#0EA5E9", "#22C55E"],
    task: {
      title: "Stronger CV bullet points",
      brief: "Ask AI to turn a plain description of something you did into three punchy, achievement-focused CV bullets.",
      placeholder: "I'm applying for … Turn this into 3 CV bullets with results: …",
      output: "list",
      criteria: [C.detail(18), C.context(), C.has("results", "Results", "Ask for measurable results.", ["result", "impact", "achiev", "numbers|metrics|%"]), C.constraints()],
      demo: {
        strong: "• Cut weekly reporting time by 40% by automating spreadsheet updates\n• Trained 6 new starters, improving first-month accuracy scores by 25%\n• Led a team rota redesign that reduced overtime costs by £3k a quarter",
        weak: "• Did reports\n• Helped people",
      },
    },
  },
  {
    id: "fact-check",
    emoji: "🔍",
    title: "Fact-check a viral claim with AI",
    tags: ["growth", "everyday", "student", "work"],
    gradient: ["#5726CC", "#2696F0"],
    task: {
      title: "Fact-check a viral claim",
      brief: "Pick a claim you've seen online. Ask AI to assess it, show evidence on both sides, and tell you which sources to check.",
      placeholder: "I saw a claim that … Assess it, give evidence for and against, and list sources I should check.",
      criteria: [C.detail(18), C.has("both", "Both sides", "Ask for evidence for and against.", ["both sides", "for and against", "evidence", "counter"]), C.has("sources", "Sources", "Ask which sources to check.", ["source", "where can i check", "references", "verify"])],
      demo: {
        strong: "**Claim assessment: likely misleading**\n\n**Evidence for:** one small 2019 study found a weak link.\n**Evidence against:** larger reviews since found no effect.\n**Check:** NHS website, Full Fact, and the original study's sample size.\n\nVerdict: don't share without context.",
        weak: "That might be true or false.",
      },
    },
  },
  {
    id: "learn-skill",
    emoji: "🎸",
    title: "Get a 7-day plan to learn something new",
    tags: ["growth", "student", "creativity"],
    gradient: ["#F97316", "#8B5CF6"],
    task: {
      title: "7-day learning plan",
      brief: "Ask AI to design a 7-day, 15-minutes-a-day plan to start learning a skill you've always wanted.",
      placeholder: "Create a 7-day plan to learn … I'm a beginner, I have 15 minutes a day …",
      output: "plan",
      criteria: [C.detail(16), C.has("level", "Your level", "Say your starting level.", ["beginner", "never", "new to", "already"]), C.constraints(), C.format()],
      demo: {
        strong: "| Day | 15-minute focus |\n|---|---|\n| 1 | Learn 3 basic chords |\n| 2 | Switch between them slowly |\n| 3 | Strumming pattern |\n| 4 | Your first song (4 chords) |\n| 5 | Practise with a slow backing track |\n| 6 | Add a 4th chord |\n| 7 | Record yourself & celebrate! |",
        weak: "Practise every day and you'll improve.",
      },
    },
  },
];

export function todaysChallenge(profile: Profile | null, day: string): DailyChallenge {
  const tags = new Set<string>([...(profile?.interests ?? []), profile?.work ?? ""]);
  const relevant = CHALLENGES.filter((c) => c.tags.some((t) => tags.has(t)));
  const pool = relevant.length >= 3 ? relevant : CHALLENGES;
  return pool[hashString(day) % pool.length];
}

export function challengeById(id: string) {
  return CHALLENGES.find((c) => c.id === id);
}

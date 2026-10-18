import { skillName } from "../skills";
import type { Career, CareerPath } from "../types";
import { levels, type LevelSpec } from "./builder";

/**
 * Generated pathways for every career without a hand-written one. They follow
 * the same 10-level arc and use the career's own skills, routes and progression,
 * so every career in the universe is playable from day one.
 */
export function buildStarterPath(career: Career): CareerPath {
  const t = career.title;
  const a = /^[AEIOU]/i.test(t) ? "an" : "a";
  const sk = career.skills;
  const s0 = sk[0] ?? "curiosity";
  const s1 = sk[1] ?? "communication";
  const s2 = sk[2] ?? "self-management";
  const s3 = sk[3] ?? "networking";
  const n0 = skillName(s0);
  const n1 = skillName(s1);
  const n2 = skillName(s2);
  const firstRole = career.progression[0] ?? `junior ${t}`;
  const midRole = career.progression[Math.min(2, career.progression.length - 1)] ?? t;
  const topRole = career.progression[career.progression.length - 1] ?? `senior ${t}`;

  const specs: LevelSpec[] = [
    {
      title: "Discover the Industry",
      summary: `What ${t}s really do and where they work.`,
      milestone: `You can explain what ${a} ${t} does.`,
      missions: [
        { title: `Watch a day in the life of ${a} ${t}`, objective: "See the job beyond the job title.", minutes: 15, kind: "research", skills: "industry-knowledge:6, curiosity:4",
          steps: [`Find a video, blog or podcast where ${a} ${t} describes their day.`, "Note three tasks you'd enjoy and one you wouldn't.", "Write down one surprise."], evidence: "text" },
        { title: `Find three organisations that hire ${t}s`, objective: "Know where the jobs are.", minutes: 15, kind: "research", skills: "industry-knowledge:6",
          steps: [`Search for ${t} roles and note who's hiring.`, "Look at each organisation's website.", "Pick the one you'd most like to work for and say why."] },
        { title: "Learn the language", objective: "Pick up the key terms of the field.", minutes: 10, kind: "learn", skills: "industry-knowledge:5",
          steps: [`List five words or acronyms ${t}s use often.`, "Look up what each means.", "Use two of them in a sentence."] },
        { title: "Gut check", objective: "Notice how this career makes you feel.", minutes: 5, kind: "reflect", skills: "self-management:4",
          steps: ["What excites you about this so far?", "What worries you?", "On a scale of 1–10, how curious are you to keep going?"] },
        { title: "Quest: Explain the career", objective: "Prove you understand the role.", minutes: 20, kind: "quest", skills: "communication:7, industry-knowledge:6",
          steps: [`Write 150 words explaining what ${a} ${t} does to a friend.`, "Include what a typical week involves.", "Mention one route in."] },
      ],
    },
    {
      title: "Learn the Fundamentals",
      summary: `The core knowledge behind ${n0} and ${n1}.`,
      milestone: "You know the fundamentals of the field.",
      missions: [
        { title: `Intro to ${n0}`, objective: `Learn the basics of ${n0.toLowerCase()}.`, minutes: 20, kind: "learn", skills: `${s0}:8`,
          steps: [`Find a free beginner resource on ${n0.toLowerCase()}.`, "Work through the first lesson.", "Write the three most important ideas."] },
        { title: `Intro to ${n1}`, objective: `Learn the basics of ${n1.toLowerCase()}.`, minutes: 20, kind: "learn", skills: `${s1}:8`,
          steps: [`Find a beginner guide to ${n1.toLowerCase()} in a ${t} context.`, "Note one technique you can practise.", "Try it once today."] },
        { title: "Study a great example", objective: "Learn from the best in the field.", minutes: 15, kind: "research", skills: `industry-knowledge:5, ${s0}:4`,
          steps: [`Find an example of outstanding work by ${a} ${t}.`, "Break down what made it excellent.", "Write how you'd learn to do the same."] },
        { title: "Routes in", objective: "Understand the ways into this career.", minutes: 15, kind: "research", skills: "career-craft:6",
          steps: ["Read the 'ways in' section of this career page.", "Research the route that fits you best.", "Note entry requirements and costs."] },
        { title: "Quest: Fundamentals check", objective: "Prove you grasp the basics.", minutes: 30, kind: "quest", skills: `${s0}:8, ${s1}:6`,
          steps: [`Complete a short practical exercise using ${n0.toLowerCase()}.`, "Describe what you did and what you learned.", "Ask the coach for feedback."] },
      ],
    },
    {
      title: "Build Your Skills",
      summary: "Practise the craft hands-on.",
      milestone: "You've practised the core skills for real.",
      missions: [
        { title: `${n0} practice session`, objective: "Build skill through repetition.", minutes: 30, kind: "practice", skills: `${s0}:9`,
          steps: ["Set a 25-minute timer.", `Practise one specific ${n0.toLowerCase()} technique.`, "Note what improved."] },
        { title: `${n2} drill`, objective: `Strengthen your ${n2.toLowerCase()}.`, minutes: 20, kind: "practice", skills: `${s2}:8`,
          steps: [`Find a short exercise that trains ${n2.toLowerCase()}.`, "Do it twice.", "Rate yourself honestly."] },
        { title: "Learn a key tool", objective: "Get familiar with the tools of the trade.", minutes: 30, kind: "learn", skills: "digital-tools:7",
          steps: [`Find out which tools ${t}s use most.`, "Try a free version or tutorial.", "Do one small task with it."] },
        { title: "Make something small", objective: "Create your first piece of work.", minutes: 45, kind: "create", skills: `${s0}:7, portfolio:5`,
          steps: [`Create a small piece of work a ${t} might produce.`, "Keep it simple and finish it.", "Describe it as evidence."], tags: ["portfolio"] },
        { title: "Quest: Skills showcase", objective: "Prove you can apply what you've learned.", minutes: 60, kind: "quest", skills: `${s0}:10, ${s2}:6`,
          steps: ["Complete a mini-project that uses two core skills.", "Write what went well and what was hard.", "Save it for your portfolio."], tags: ["project", "portfolio"] },
      ],
    },
    {
      title: "Create Your Portfolio",
      summary: "Collect proof of what you can do.",
      milestone: "You have evidence of your abilities to show others.",
      missions: [
        { title: "Pick a place to show your work", objective: "Set up a home for your evidence.", minutes: 20, kind: "practice", skills: "portfolio:7",
          steps: ["Choose a portfolio site, document or profile.", "Write a short bio.", "Add one piece of work."] },
        { title: "Write a case study", objective: "Show how you think, not just what you made.", minutes: 40, kind: "create", skills: "storytelling:6, portfolio:7",
          steps: ["Pick your best piece of work.", "Describe the challenge, your approach and the result.", "Add images or links."], tags: ["portfolio"] },
        { title: "Self-initiated project", objective: "Create work no one asked for.", minutes: 120, kind: "create", skills: `${s0}:8, ${s1}:6`,
          steps: [`Invent a realistic project a ${t} might take on.`, "Plan it, do it and document it.", "Add it to your portfolio."], tags: ["portfolio", "project"] },
        { title: "Get feedback", objective: "Improve through critique.", minutes: 30, kind: "connect", skills: "feedback:8, resilience:4",
          steps: ["Share your work with two people.", "Ask what's strongest and what's unclear.", "Make one improvement."], tags: ["connection"] },
        { title: "Quest: Portfolio ready", objective: "Prove you have work to show.", minutes: 60, kind: "quest", skills: "portfolio:12",
          steps: ["Have at least three pieces of evidence in one place.", "Make sure each has a short explanation.", "Share the link."], evidence: "link", tags: ["portfolio"] },
      ],
    },
    {
      title: "Gain Real Experience",
      summary: "Get out into the real world.",
      milestone: "You've had real-world experience in the field.",
      missions: [
        { title: `Message ${a} ${t}`, objective: "Start a genuine professional connection.", minutes: 15, kind: "connect", skills: "networking:9",
          steps: [`Find ${a} ${t} on LinkedIn or at a local organisation.`, "Send a short, specific, friendly message.", "Ask one question about their journey."], tags: ["connection"], aiHelp: "Help me write a short outreach message." },
        { title: "Find work experience", objective: "Look for a taster of the job.", minutes: 30, kind: "research", skills: "career-craft:6",
          steps: ["Search for work experience, volunteering or virtual work experience in this field.", "Save two to Opportunities.", "Apply to one."] },
        { title: "Attend an event or talk", objective: "See the industry in person or online.", minutes: 60, kind: "connect", skills: "networking:7, industry-knowledge:4",
          steps: ["Find a free event, webinar or meetup.", "Attend and note three takeaways.", "Talk to (or message) one person afterwards."], tags: ["connection"] },
        { title: "Volunteer your skills", objective: "Use your skills to help someone.", minutes: 120, kind: "create", skills: `${s0}:7, collaboration:6`,
          steps: ["Find a club, charity or person who could use your help.", "Agree a small piece of work.", "Deliver it and ask for feedback."], tags: ["project"] },
        { title: "Quest: Real-world experience", objective: "Prove you've stepped into the real world.", minutes: 45, kind: "quest", skills: `networking:8, ${s1}:6`,
          steps: ["Describe a real experience: shadowing, volunteering, an event or a project.", "What did you learn about the job?", "Does it make you more or less excited?"] },
      ],
    },
    {
      title: "Land Your First Role",
      summary: `Get ready to apply for ${firstRole} roles.`,
      milestone: "You're ready to apply and interview.",
      missions: [
        { title: "Build your CV", objective: "Create a CV for this field.", minutes: 45, kind: "create", skills: "career-craft:9",
          steps: ["Lead with skills and projects relevant to this career.", "Keep it to one page.", "Ask the coach to review it."], tags: ["cv"], aiHelp: "Review my CV." },
        { title: `Research ${firstRole} roles`, objective: "Learn what employers ask for.", minutes: 30, kind: "research", skills: "career-craft:6",
          steps: [`Find five ${firstRole} or similar listings.`, "List the skills they ask for.", "Highlight gaps to work on."] },
        { title: "Practise interview answers", objective: "Get confident answering common questions.", minutes: 30, kind: "practice", skills: "communication:7, career-craft:5",
          steps: ["Prepare answers to: Why this career? Tell me about a challenge. What are your strengths?", "Use the STAR method.", "Say them out loud."], tags: ["interview"] },
        { title: "Mock interview with the coach", objective: "Rehearse under realistic conditions.", minutes: 25, kind: "practice", skills: "career-craft:7",
          steps: [`Ask the coach for a ${firstRole} interview practice.`, "Answer at least five questions.", "Note what to improve."], tags: ["interview"], aiHelp: `Run a mock interview for a ${firstRole} role.` },
        { title: "Quest: Apply for real", objective: "Prove you're actively going for it.", minutes: 90, kind: "quest", skills: "career-craft:10, resilience:6",
          steps: ["Apply for three relevant roles, courses or apprenticeships.", "Tailor each application.", "Track them in Opportunities."], tags: ["application"] },
      ],
    },
    {
      title: "Develop Your Expertise",
      summary: "Go deeper and specialise.",
      milestone: "You have a specialism and growing expertise.",
      missions: [
        { title: "Choose a specialism", objective: "Find your niche.", minutes: 25, kind: "research", skills: "industry-knowledge:6, career-craft:4",
          steps: [`Research specialisms within ${t} work.`, "Pick the one that interests you most.", "Write why."] },
        { title: "Advanced learning", objective: "Level up your knowledge.", minutes: 60, kind: "learn", skills: `${s0}:9`,
          steps: ["Find an intermediate or advanced resource.", "Complete one module.", "Teach what you learned to someone."] },
        { title: "Learn from an expert", objective: "Study someone at the top.", minutes: 30, kind: "research", skills: `industry-knowledge:6, ${s1}:4`,
          steps: [`Find an interview with a respected ${topRole}.`, "Write three lessons from it.", "Apply one this week."] },
        { title: "Build a habit", objective: "Grow consistently.", minutes: 20, kind: "practice", skills: "self-management:8",
          steps: ["Choose one skill to practise daily for a week.", "Track it.", "Reflect on progress."] },
        { title: "Quest: Expert project", objective: "Prove growing expertise.", minutes: 240, kind: "quest", skills: `${s0}:12, ${s2}:6`,
          steps: ["Complete an ambitious project in your specialism.", "Document your process.", "Add it to your Passport."], tags: ["portfolio", "project"] },
      ],
    },
    {
      title: "Lead Projects",
      summary: "Take ownership and guide others.",
      milestone: "You can lead work, not just do it.",
      missions: [
        { title: "Plan a project", objective: "Practise project planning.", minutes: 30, kind: "create", skills: "project-management:8",
          steps: ["Pick a project with several steps.", "Write goals, tasks, owners and deadlines.", "Identify risks."] },
        { title: "Lead a group session", objective: "Guide others to an outcome.", minutes: 60, kind: "connect", skills: "leadership:8, collaboration:5",
          steps: ["Gather two or three people.", "Run a focused session with a clear goal.", "Agree next steps."], tags: ["connection"] },
        { title: "Present your work", objective: "Communicate with impact.", minutes: 30, kind: "practice", skills: "presenting:9",
          steps: ["Prepare a five-minute presentation of your best work.", "Present it to someone.", "Ask for one improvement."] },
        { title: "Give feedback", objective: "Help others improve.", minutes: 20, kind: "connect", skills: "feedback:8",
          steps: ["Review someone's work.", "Share strengths, questions and one suggestion.", "Check how it landed."], tags: ["connection"] },
        { title: "Quest: Lead a project", objective: "Prove you can lead.", minutes: 240, kind: "quest", skills: "leadership:12, project-management:6",
          steps: ["Lead a small project from start to finish.", "Describe your leadership decisions.", "Reflect on what you'd do differently."], tags: ["project"] },
      ],
    },
    {
      title: `Become ${midRole === t ? `a Senior ${t}` : midRole}`,
      summary: "Step up to senior responsibilities.",
      milestone: "You operate at a senior level.",
      missions: [
        { title: "Mentor someone", objective: "Grow others.", minutes: 45, kind: "connect", skills: "teaching:8",
          steps: ["Offer help to someone newer.", "Share what you wish you'd known.", "Follow up a week later."], tags: ["connection"] },
        { title: "Understand the business side", objective: "Know how your work creates value.", minutes: 30, kind: "learn", skills: "finance-basics:6, strategy:5",
          steps: [`Research how organisations that employ ${t}s make money.`, "Map where your work fits.", "Write how you could add more value."] },
        { title: "Build your reputation", objective: "Become known for something.", minutes: 45, kind: "create", skills: `networking:6, ${s3}:5`,
          steps: ["Share an insight from your work publicly.", "Engage with others in the field.", "Track responses."] },
        { title: "Reflect on your values", objective: "Lead with intention.", minutes: 20, kind: "reflect", skills: "leadership:5, self-management:4",
          steps: ["What kind of professional do you want to be known as?", "Write three principles.", "Check your recent work against them."] },
        { title: "Quest: Senior-level contribution", objective: "Prove you're operating at a senior level.", minutes: 180, kind: "quest", skills: `${s0}:10, leadership:8`,
          steps: ["Describe a contribution that shaped others' work.", "Show the impact.", "Add it to your Passport."] },
      ],
    },
    {
      title: "Master Your Craft",
      summary: `Grow towards ${topRole} and give back.`,
      milestone: "You're shaping your field.",
      missions: [
        { title: "Teach what you know", objective: "Share expertise widely.", minutes: 60, kind: "create", skills: "teaching:7, writing:5",
          steps: ["Create a guide, talk or video on something you've mastered.", "Share it publicly.", "Respond to questions."] },
        { title: "Cross-discipline collaboration", objective: "Grow beyond your field.", minutes: 120, kind: "connect", skills: "collaboration:8",
          steps: ["Find someone in a different field.", "Work on something together.", "Share what you learned."], tags: ["connection"] },
        { title: "Review your journey", objective: "See how far you've come.", minutes: 30, kind: "reflect", skills: "self-management:5",
          steps: ["Look back at your earliest work.", "List what's changed.", "Write your next big goal."] },
        { title: "Plan your next five years", objective: "Set long-term direction.", minutes: 30, kind: "reflect", skills: "career-craft:6",
          steps: [`Research what ${topRole}s do.`, "Map the gap from where you are.", "Discuss it with the coach."] },
        { title: "Quest: Signature work", objective: "Prove mastery.", minutes: 300, kind: "quest", skills: `${s0}:12, portfolio:8`,
          steps: ["Bring together your strongest work.", "Tell the story that connects it.", "Share it in your Passport."], tags: ["portfolio", "project"] },
      ],
    },
  ];

  const prefix = `st-${career.slug}`;
  return { careerSlug: career.slug, title: t, kind: "starter", levels: levels(prefix, specs) };
}

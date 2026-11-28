// A curated, beginner-friendly guide to popular AI tools. Descriptions are
// deliberately general; pricing and features change, so the UI links to each
// official site and reminds users to check current details.

export type ToolCategory = "assistants" | "writing" | "image" | "video" | "audio" | "research" | "productivity" | "coding" | "automation";

export const CATEGORIES: { id: ToolCategory; label: string; icon: string; gradient: [string, string] }[] = [
  { id: "assistants", label: "AI assistants", icon: "🤖", gradient: ["#7C4DFF", "#A78BFA"] },
  { id: "writing", label: "Writing", icon: "✍️", gradient: ["#6366F1", "#8B5CF6"] },
  { id: "image", label: "Images & design", icon: "🎨", gradient: ["#EC4899", "#F59E0B"] },
  { id: "video", label: "Video", icon: "🎬", gradient: ["#EF4444", "#EC4899"] },
  { id: "audio", label: "Music & voice", icon: "🎵", gradient: ["#F97316", "#EAB308"] },
  { id: "research", label: "Research", icon: "🔎", gradient: ["#0EA5E9", "#6366F1"] },
  { id: "productivity", label: "Productivity", icon: "📋", gradient: ["#22C55E", "#0EA5E9"] },
  { id: "coding", label: "Build & code", icon: "🧩", gradient: ["#0F172A", "#6366F1"] },
  { id: "automation", label: "Automation", icon: "⚙️", gradient: ["#10B981", "#3B82F6"] },
];

export interface Tool {
  id: string;
  name: string;
  maker: string;
  category: ToolCategory;
  mono: string;
  color: string;
  what: string;
  when: string[];
  level: "beginner" | "intermediate" | "advanced";
  price: "Free to start" | "Free tier + paid plans" | "Paid";
  tags: string[]; // interest / work ids
  tryMode?: "chat" | "image" | "write" | "analyse" | "brainstorm" | "website";
  lesson?: string;
  url: string;
}

export const TOOLS: Tool[] = [
  { id: "chatgpt", name: "ChatGPT", maker: "OpenAI", category: "assistants", mono: "G", color: "#10A37F", what: "An all-round AI assistant for questions, writing, planning and images.", when: ["Everyday questions and explanations", "Drafting emails and documents", "Planning trips, meals and projects"], level: "beginner", price: "Free tier + paid plans", tags: ["everyday", "work", "growth", "office", "student"], tryMode: "chat", lesson: "w1-l5", url: "https://chatgpt.com" },
  { id: "claude", name: "Claude", maker: "Anthropic", category: "assistants", mono: "C", color: "#D97757", what: "A thoughtful AI assistant that's great with long documents, writing and careful reasoning.", when: ["Analysing long reports or contracts", "Nuanced writing and editing", "Thinking through complex decisions"], level: "beginner", price: "Free tier + paid plans", tags: ["work", "growth", "office", "student", "build"], tryMode: "analyse", lesson: "w4-l2", url: "https://claude.ai" },
  { id: "gemini", name: "Gemini", maker: "Google", category: "assistants", mono: "G", color: "#4285F4", what: "Google's AI assistant, connected to Gmail, Docs and other Google apps.", when: ["If you live in Google Workspace", "Quick help on your phone", "Summarising emails and docs"], level: "beginner", price: "Free tier + paid plans", tags: ["everyday", "work", "office"], tryMode: "chat", url: "https://gemini.google.com" },
  { id: "copilot", name: "Microsoft Copilot", maker: "Microsoft", category: "assistants", mono: "M", color: "#0078D4", what: "AI built into Windows, Edge and Microsoft 365 apps like Word, Excel and Outlook.", when: ["Working in Word, Excel or PowerPoint", "Summarising Teams meetings", "Company-approved AI at work"], level: "beginner", price: "Free tier + paid plans", tags: ["work", "office", "business"], tryMode: "write", lesson: "w4-l5", url: "https://copilot.microsoft.com" },
  { id: "grammarly", name: "Grammarly", maker: "Grammarly", category: "writing", mono: "G", color: "#15C39A", what: "Writing assistant that checks tone and clarity and rewrites as you type.", when: ["Polishing important emails", "Getting tone right", "Writing in a second language"], level: "beginner", price: "Free tier + paid plans", tags: ["work", "office", "student"], tryMode: "write", url: "https://www.grammarly.com" },
  { id: "notion-ai", name: "Notion AI", maker: "Notion", category: "productivity", mono: "N", color: "#111111", what: "AI inside Notion for notes, wikis, meeting summaries and to-do lists.", when: ["Organising notes and projects", "Summarising meeting notes", "Team knowledge bases"], level: "intermediate", price: "Free tier + paid plans", tags: ["work", "business", "growth", "student"], tryMode: "write", lesson: "w4-l3", url: "https://www.notion.so/product/ai" },
  { id: "perplexity", name: "Perplexity", maker: "Perplexity AI", category: "research", mono: "P", color: "#1FB8CD", what: "An AI answer engine that searches the web and shows its sources.", when: ["Research with sources you can check", "Up-to-date information", "Comparing products"], level: "beginner", price: "Free tier + paid plans", tags: ["growth", "student", "work", "everyday"], tryMode: "chat", lesson: "w8-l3", url: "https://www.perplexity.ai" },
  { id: "notebooklm", name: "NotebookLM", maker: "Google", category: "research", mono: "N", color: "#4285F4", what: "Upload your own documents and ask questions — answers cite your sources.", when: ["Studying course material", "Understanding a pile of reports", "Turning docs into audio overviews"], level: "intermediate", price: "Free to start", tags: ["student", "growth", "work"], tryMode: "analyse", url: "https://notebooklm.google.com" },
  { id: "midjourney", name: "Midjourney", maker: "Midjourney", category: "image", mono: "M", color: "#000000", what: "Creates striking, artistic images from text descriptions.", when: ["Beautiful artwork and concepts", "Mood boards", "Stylised illustrations"], level: "intermediate", price: "Paid", tags: ["creativity", "creator"], tryMode: "image", lesson: "w5-l2", url: "https://www.midjourney.com" },
  { id: "firefly", name: "Adobe Firefly", maker: "Adobe", category: "image", mono: "F", color: "#FA0F00", what: "Image generation and editing designed for commercial-safe creative work.", when: ["Images for business use", "Editing photos with AI", "Working in Photoshop"], level: "beginner", price: "Free tier + paid plans", tags: ["creativity", "creator", "business"], tryMode: "image", url: "https://firefly.adobe.com" },
  { id: "canva", name: "Canva", maker: "Canva", category: "image", mono: "C", color: "#00C4CC", what: "Design anything — posters, slides, social posts — with AI helpers built in.", when: ["Posters, invites and social posts", "Quick presentations", "Adding text to AI images"], level: "beginner", price: "Free tier + paid plans", tags: ["creativity", "business", "creator", "everyday"], tryMode: "image", lesson: "w5-l7", url: "https://www.canva.com" },
  { id: "gamma", name: "Gamma", maker: "Gamma", category: "productivity", mono: "γ", color: "#6B4BF5", what: "Turns an outline or prompt into a designed presentation in minutes.", when: ["Fast, good-looking slides", "Turning notes into a deck", "One-page documents"], level: "beginner", price: "Free tier + paid plans", tags: ["work", "business", "office", "student"], tryMode: "write", lesson: "w4-l4", url: "https://gamma.app" },
  { id: "runway", name: "Runway", maker: "Runway", category: "video", mono: "R", color: "#111111", what: "Generate and edit video clips with AI.", when: ["Short creative clips", "Animating still images", "Video effects"], level: "intermediate", price: "Free tier + paid plans", tags: ["creativity", "creator"], lesson: "w5-l5", url: "https://runwayml.com" },
  { id: "capcut", name: "CapCut", maker: "CapCut", category: "video", mono: "C", color: "#000000", what: "Easy video editor with AI captions, effects and templates.", when: ["Social videos", "Auto-captions", "Quick edits on your phone"], level: "beginner", price: "Free tier + paid plans", tags: ["creativity", "creator", "business"], url: "https://www.capcut.com" },
  { id: "suno", name: "Suno", maker: "Suno", category: "audio", mono: "S", color: "#F97316", what: "Creates complete songs — vocals and music — from a description.", when: ["Birthday songs and jingles", "Background music", "Just for fun"], level: "beginner", price: "Free tier + paid plans", tags: ["creativity", "creator", "everyday"], lesson: "w5-l6", url: "https://suno.com" },
  { id: "elevenlabs", name: "ElevenLabs", maker: "ElevenLabs", category: "audio", mono: "11", color: "#111111", what: "Natural-sounding AI voices for narration, dubbing and audiobooks.", when: ["Voiceovers for videos", "Listening to documents", "Accessibility"], level: "intermediate", price: "Free tier + paid plans", tags: ["creativity", "creator", "business"], url: "https://elevenlabs.io" },
  { id: "otter", name: "Otter", maker: "Otter.ai", category: "productivity", mono: "O", color: "#2563EB", what: "Records and transcribes meetings, then summarises actions.", when: ["Meeting notes", "Interviews and lectures", "Never missing an action"], level: "beginner", price: "Free tier + paid plans", tags: ["work", "office", "student", "business"], tryMode: "analyse", lesson: "w4-l3", url: "https://otter.ai" },
  { id: "lovable", name: "Lovable", maker: "Lovable", category: "coding", mono: "♥", color: "#FF4F79", what: "Describe an app or website and it builds a working version you can refine.", when: ["Your first web app", "Prototypes for a business idea", "Internal tools"], level: "intermediate", price: "Free tier + paid plans", tags: ["build", "business", "owner"], tryMode: "website", lesson: "w6-l2", url: "https://lovable.dev" },
  { id: "replit", name: "Replit", maker: "Replit", category: "coding", mono: "R", color: "#F26207", what: "Build and host apps in the browser with an AI agent that writes the code.", when: ["Apps that need a backend", "Learning to code with help", "Quick deployments"], level: "advanced", price: "Free tier + paid plans", tags: ["build", "student"], tryMode: "website", url: "https://replit.com" },
  { id: "claude-code", name: "Claude Code", maker: "Anthropic", category: "coding", mono: "C", color: "#D97757", what: "An AI coding agent that builds and edits real software projects with you.", when: ["Building real products", "Working on existing code", "Automating developer tasks"], level: "advanced", price: "Paid", tags: ["build"], tryMode: "website", url: "https://claude.com/product/claude-code" },
  { id: "github-copilot", name: "GitHub Copilot", maker: "GitHub", category: "coding", mono: "G", color: "#24292F", what: "AI pair programmer inside your code editor.", when: ["Writing code faster", "Learning a new language", "Explaining unfamiliar code"], level: "advanced", price: "Free tier + paid plans", tags: ["build"], url: "https://github.com/features/copilot" },
  { id: "zapier", name: "Zapier", maker: "Zapier", category: "automation", mono: "Z", color: "#FF4F00", what: "Connects thousands of apps so tasks happen automatically — with AI steps.", when: ["Form → spreadsheet → email flows", "Small-business admin", "No-code automation"], level: "intermediate", price: "Free tier + paid plans", tags: ["work", "business", "owner"], lesson: "w7-l1", url: "https://zapier.com" },
  { id: "make", name: "Make", maker: "Make", category: "automation", mono: "M", color: "#6D00CC", what: "Visual automation builder for more complex workflows.", when: ["Multi-step workflows", "Branching logic", "Lower cost at volume"], level: "advanced", price: "Free tier + paid plans", tags: ["business", "owner", "build"], lesson: "w7-l6", url: "https://www.make.com" },
  { id: "power-automate", name: "Power Automate", maker: "Microsoft", category: "automation", mono: "P", color: "#0066FF", what: "Automation across Microsoft 365 — Outlook, Teams, Excel, SharePoint.", when: ["Automating Microsoft-based work", "Approvals and reminders", "Company-approved automation"], level: "intermediate", price: "Paid", tags: ["work", "office"], lesson: "w7-l5", url: "https://www.microsoft.com/power-platform/products/power-automate" },
];

export function recommendedTools(interests: string[], work: string, familiarity: string): Tool[] {
  const tags = new Set([...interests, work]);
  const maxLevel = familiarity === "beginner" ? 0 : familiarity === "familiar" ? 1 : 2;
  const lv = { beginner: 0, intermediate: 1, advanced: 2 } as const;
  return TOOLS.filter((t) => lv[t.level] <= maxLevel)
    .map((t) => ({ t, score: t.tags.filter((x) => tags.has(x)).length * 2 + (t.level === "beginner" ? 1 : 0) }))
    .filter((x) => x.score > 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((x) => x.t);
}

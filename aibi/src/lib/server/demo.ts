import "server-only";

// Demo mode: realistic, deterministic responses generated locally when no AI
// key is configured. The UI always labels these as demo output.

const STOP = new Set("a an the and or but of for to in on at with about my me i you your our we is are be can could would should please make write give create help explain tell show some this that it as into from by up out how what why when where which who need want like just really also then than so very more most will shall have has been were was not any all its they them their there these those would".split(" "));

export function topicOf(prompt: string, max = 7): string {
  const cleaned = prompt
    .replace(/\[[^\]]*\]/g, "")
    .replace(/^(hi|hello|hey)[,!. ]*/i, "")
    .replace(/^(please\s+)?(can you|could you|would you|i want you to|i need you to|help me( to)?|i'?d like( you)? to)\s+/i, "")
    .replace(/^(write|create|make|give me|generate|draft|plan|explain|tell me about|brainstorm|suggest|build|design)\s+(me\s+)?(a|an|some|the)?\s*/i, "")
    .split(/[.?!\n]/)[0]
    .trim();
  const words = cleaned.split(/\s+/).slice(0, max).join(" ");
  return words || "your idea";
}

export function keywords(text: string, n = 6): string[] {
  const counts = new Map<string, number>();
  for (const w of text.toLowerCase().match(/[a-z][a-z'-]{2,}/g) ?? []) {
    if (STOP.has(w)) continue;
    counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([w]) => w);
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function demoChat(prompt: string, mode: string, doc?: string): string {
  const p = prompt.toLowerCase();
  const topic = topicOf(prompt);
  if (mode === "analyse") return demoAnalyse(doc ?? prompt, prompt);
  if (mode === "brainstorm") return demoBrainstorm(prompt);
  if (mode === "write") return demoWrite(prompt);

  if (/^(hi|hello|hey|hiya)\b/.test(p) && p.length < 30)
    return "Hi! 👋 I'm here to help. You could ask me to:\n\n• **Explain** something confusing in plain English\n• **Plan** a trip, a week of meals or a project\n• **Write** an email, a message or a speech\n• **Brainstorm** ideas for a gift, a party or a business\n\nWhat would you like to do?";
  if (/explain|what is|what are|how does|how do|why/.test(p))
    return `Here's a simple way to think about **${topic}**:\n\n**The short version:** it's about how a few key parts work together to produce a result you can see in everyday life.\n\n**The three key ideas**\n1. **What it is** – the core concept in one line\n2. **How it works** – the main mechanism, step by step\n3. **Why it matters to you** – where you'd notice it day to day\n\n**Everyday analogy:** think of it like a recipe — the ingredients and the order both matter.\n\nWant me to go deeper on any of these, or test you with a quick question?`;
  if (/plan|itinerary|trip|holiday|schedule|week/.test(p))
    return `**Your plan: ${cap(topic)}**\n\n| When | What | Notes |\n|---|---|---|\n| Morning | Start with the most important thing | Fresh energy |\n| Midday | Something enjoyable & easy | Keep it flexible |\n| Afternoon | Second priority | Book ahead if needed |\n| Evening | Relax & recharge | Leave buffer time |\n\n**Tips**\n• Tell me your budget and dates and I'll make this specific\n• Double-check opening times and prices before you go`;
  if (/recipe|dinner|cook|meal|lunch|breakfast/.test(p))
    return `**Quick idea: ${cap(topic)}** (serves 2, ~25 min)\n\n**You'll need:** a protein or pulses, a vegetable or two, a carb (rice, pasta or bread), garlic, oil and seasoning.\n\n1. Get the carb cooking first\n2. Soften garlic in oil, add the vegetables\n3. Add the protein and season well\n4. Combine, taste, adjust — a squeeze of lemon lifts everything\n\nTell me exactly what's in your fridge and any dietary needs, and I'll tailor it.`;
  if (/email|message|reply|letter/.test(p)) return demoWrite(prompt);
  if (/idea|ideas|name|names|suggest/.test(p)) return demoBrainstorm(prompt);
  return `Great question about **${topic}**. Here's a helpful starting point:\n\n• **First,** clarify what a good outcome looks like for you\n• **Next,** consider two or three options and what each would cost in time and money\n• **Then,** pick the simplest option you can try this week\n\n**To make my answer much better, tell me:**\n1. Who is this for?\n2. Any limits (budget, time, length)?\n3. How would you like the answer laid out?`;
}

function demoWrite(prompt: string): string {
  const p = prompt.toLowerCase();
  const topic = topicOf(prompt, 10);
  if (/email|reply|message to/.test(p)) {
    const formal = /formal|professional|manager|boss|client|landlord|council/.test(p);
    return `**Subject:** ${cap(topic).slice(0, 60)}\n\n${formal ? "Dear [Name]," : "Hi [Name],"}\n\nI hope you're well. I'm getting in touch about ${topic}.\n\n${formal ? "I would be grateful if we could agree on the next steps. I've outlined the key points below:" : "Here's a quick summary of where things are:"}\n\n• The main point you need to know\n• What I'm proposing\n• What I need from you (and by when)\n\n${formal ? "Please let me know if you have any questions." : "Let me know what you think!"}\n\n${formal ? "Kind regards," : "Thanks,"}\n[Your name]`;
  }
  if (/story|poem|bedtime/.test(p))
    return `**${cap(topic)}**\n\nOnce, on an ordinary Tuesday, something rather extraordinary happened.\n\nIt began with a small, curious sound — the kind you only hear when everyone else is too busy to notice. Our hero noticed.\n\nWhat followed was an adventure full of wrong turns, unexpected friends and one very important decision…\n\n*(Tell me the characters' names, the age of the reader and the mood you want, and I'll write the full story.)*`;
  if (/post|caption|instagram|linkedin|tweet/.test(p))
    return `**Option 1 — warm**\n${cap(topic)} ✨ We've been working on this for a while and can't wait to share it with you. Tell us what you think below 👇\n\n**Option 2 — punchy**\n${cap(topic)}. That's it. That's the post. 😄\n\n**Option 3 — story-led**\nA year ago this was just an idea scribbled on a napkin. Today: ${topic}. Thank you for being part of it. 💜`;
  return `**Draft: ${cap(topic)}**\n\n${cap(topic)} matters because it affects the people involved in real, everyday ways.\n\n**Key points**\n• The main message in one sentence\n• A specific example that brings it to life\n• What you'd like the reader to do next\n\nWant it shorter, more formal, or with a different tone? Just say.`;
}

function demoBrainstorm(prompt: string): string {
  const topic = topicOf(prompt, 8);
  const angles = [
    ["The budget-friendly one", "Do it brilliantly for under £20"],
    ["The personal touch", "Built around a shared memory or inside joke"],
    ["The experience", "Something to do together, not just something to own"],
    ["The surprise", "Unexpected timing or location"],
    ["The DIY version", "Handmade, with an AI-designed template"],
    ["The digital twist", "A playlist, a video montage or a custom website"],
    ["The local hero", "Support a nearby independent business"],
    ["The learning angle", "A class or workshop to try something new"],
    ["The group effort", "Get friends or colleagues to contribute"],
    ["The bold one", "The idea you'd never usually try — why not?"],
  ];
  return `**10 ideas for ${topic}**\n\n${angles.map(([t, d], i) => `${i + 1}. **${t}** – ${d}`).join("\n")}\n\n**My top pick:** #3 — experiences tend to be remembered longest.\n\nTell me who it's for, your budget and the vibe, and I'll make these much more specific.`;
}

export function demoAnalyse(doc: string, question: string): string {
  const text = doc.trim();
  // Split into paragraphs first, then sentences (without breaking on decimals like 6.9%).
  const sentences = text
    .split(/\n+/)
    .flatMap((para) => para.split(/(?<=[.!?])\s+(?=[A-Z0-9£$€\[“"])/))
    .map((x) => x.trim())
    .filter((x) => x.split(/\s+/).length >= 6);
  const pool = sentences.length ? sentences : [text];
  const words = text.split(/\s+/).filter(Boolean).length;
  const kw = keywords(text, 8);
  const scored = pool.map((s, i) => ({
    s,
    i,
    score: kw.reduce((acc, k) => acc + (s.toLowerCase().includes(k) ? 1 : 0), 0) + (/\d/.test(s) ? 1 : 0) + (i === 0 ? 1 : 0),
  }));
  const top = [...scored].sort((a, b) => b.score - a.score).slice(0, Math.min(4, scored.length)).sort((a, b) => a.i - b.i);
  const numbers = Array.from(new Set((text.match(/(£|\$|€)\s?\d[\d,]*(\.\d+)?|\d[\d,]*(\.\d+)?\s?%/g) ?? []).map((n) => n.replace(/,$/, "")))).slice(0, 6);
  const dates = Array.from(new Set(text.match(/\b(\d{1,2}(st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*|(mon|tues|wednes|thurs|fri|satur|sun)day|\d{1,2}\/\d{1,2}(\/\d{2,4})?)\b/gi) ?? [])).slice(0, 5);
  const actions = pool.filter((s) => /\b(please|must|need to|required|should|sign|return|pay|by \d|deadline|if we do not)\b/i.test(s)).slice(0, 3);
  const q = question && question !== doc ? `\n\n**Your question:** ${question.slice(0, 140)}\n${actions.length ? `The text says: "${actions.find((a) => /\bby \d|\bdeadline/i.test(a)) ?? actions[0]}"` : `The most relevant passage: "${top[0]?.s ?? ""}"`}` : "";
  return `**Summary** (${words} words · ~${Math.max(1, Math.round(words / 230))} min read)\n\n${top.map((t) => `• ${t.s}`).join("\n")}${actions.length ? `\n\n**Actions for you**\n${actions.map((a) => `• ${a}`).join("\n")}` : ""}\n\n**Key themes:** ${kw.slice(0, 6).join(", ") || "—"}${numbers.length ? `\n**Money & figures:** ${numbers.join(", ")}` : ""}${dates.length ? `\n**Dates & deadlines:** ${dates.join(", ")}` : ""}\n\n**Questions worth asking**\n1. Is anything here unclear, unusual or one-sided?\n2. Which figures should you double-check against the original?\n3. Who can you ask if you're unsure (e.g. Citizens Advice)?${q}`;
}

// ---------- Website builder ----------
const PALETTES: Record<string, [string, string, string]> = {
  green: ["#1F7A4D", "#E8F5EC", "#F4B942"],
  blue: ["#1E4FD8", "#E8EEFF", "#FFB020"],
  pink: ["#D63384", "#FFE8F3", "#6F42C1"],
  purple: ["#6A35F0", "#F1ECFF", "#FFC53D"],
  black: ["#111111", "#F5F5F5", "#E0B44C"],
  orange: ["#E8590C", "#FFF1E6", "#1F7A4D"],
  red: ["#C92A2A", "#FFF0F0", "#1E1E1E"],
  teal: ["#0C8599", "#E3FAFC", "#F59F00"],
  gold: ["#8A6D1D", "#FBF6E9", "#2B2B2B"],
  cream: ["#7A5C3E", "#FBF6EE", "#4F7942"],
};

function pickPalette(brief: string): [string, string, string] | null {
  const b = brief.toLowerCase();
  for (const k of Object.keys(PALETTES)) if (b.includes(k)) return PALETTES[k];
  if (/dark|night/.test(b)) return PALETTES.black;
  if (/wedding|elegant|luxury/.test(b)) return PALETTES.gold;
  if (/garden|eco|dog|nature|plant/.test(b)) return PALETTES.green;
  if (/bakery|cafe|coffee/.test(b)) return PALETTES.cream;
  return null;
}

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

export function demoWebsite(brief: string, latest = ""): string {
  const quoted = brief.match(/["'“‘]([^"'”’]{2,40})["'”’]/)?.[1];
  const called = brief.match(/(?:called|named)\s+([A-Z][\w&' ]{1,30})/)?.[1];
  const forWhat = brief.match(/\bfor\s+(?:my\s+|a\s+|an\s+|our\s+)?([^,.]{3,50})/i)?.[1];
  const name = (quoted || called || (forWhat ? cap(forWhat.split(" ").slice(0, 4).join(" ")) : "Your Business")).trim();
  const [primary, soft, accent] = pickPalette(latest) ?? pickPalette(brief) ?? PALETTES.purple;
  const b = brief.toLowerCase();
  const action = /rsvp/.test(b) ? "RSVP now" : /book/.test(b) ? "Book now" : /order|buy|shop/.test(b) ? "Order now" : /sign ?up|join/.test(b) ? "Join today" : /donat/.test(b) ? "Donate" : "Get in touch";
  const kind = /wedding/.test(b) ? "wedding" : /portfolio/.test(b) ? "portfolio" : /cafe|coffee|bakery|restaurant/.test(b) ? "food" : "business";
  const services =
    kind === "wedding"
      ? [["The ceremony", "2pm · St Mary's Church"], ["The party", "6pm · dinner, dancing & cake"], ["Stay", "Rooms held at the Old Mill Hotel"]]
      : kind === "portfolio"
        ? [["Design", "Brand identities and visual systems"], ["Illustration", "Editorial and children's books"], ["Workshops", "Creative sessions for teams"]]
        : kind === "food"
          ? [["Fresh daily", "Baked every morning from 6am"], ["Local", "Ingredients from farms within 30 miles"], ["Catering", "Platters for offices and parties"]]
          : [["Our service", "What we do best, explained simply"], ["How it works", "Three easy steps from hello to done"], ["Pricing", "Clear, fair prices with no surprises"]];
  const tagline =
    kind === "wedding" ? "We're getting married — and we'd love you there." : kind === "portfolio" ? "Thoughtful design that makes ideas shine." : kind === "food" ? "Made with love, served with a smile." : "Friendly, reliable and here to help.";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(name)}</title>
<style>
*{box-sizing:border-box;margin:0}body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1d1d1f;background:${soft}}
.wrap{max-width:960px;margin:0 auto;padding:0 20px}
nav{display:flex;justify-content:space-between;align-items:center;padding:18px 0}nav b{font-size:20px;color:${primary}}
nav a{color:#1d1d1f;text-decoration:none;font-weight:600;font-size:14px;margin-left:16px}
.hero{padding:56px 0 64px;text-align:center}.hero h1{font-size:clamp(34px,7vw,58px);line-height:1.05;letter-spacing:-.02em}
.hero p{font-size:18px;color:#555;margin:16px auto 28px;max-width:520px}
.btn{display:inline-block;background:${primary};color:#fff;padding:14px 26px;border-radius:999px;font-weight:700;text-decoration:none;box-shadow:0 6px 20px -6px ${primary}}
.badge{display:inline-block;background:${accent};color:#111;padding:6px 12px;border-radius:999px;font-size:12px;font-weight:800;margin-bottom:16px;letter-spacing:.04em;text-transform:uppercase}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;padding:12px 0 48px}
.card{background:#fff;border-radius:20px;padding:22px;box-shadow:0 10px 30px -15px rgba(0,0,0,.2)}.card h3{color:${primary};margin-bottom:6px}
.quote{background:#fff;border-radius:20px;padding:28px;text-align:center;font-size:18px;margin-bottom:48px}.quote small{display:block;margin-top:10px;color:#777}
form{background:#fff;border-radius:20px;padding:24px;display:grid;gap:12px;margin-bottom:40px}input,textarea{border:1.5px solid #ddd;border-radius:12px;padding:12px;font:inherit}
footer{text-align:center;color:#777;font-size:13px;padding:24px 0 40px}
</style></head><body>
<div class="wrap"><nav><b>${esc(name)}</b><div><a href="#about">About</a><a href="#contact">Contact</a></div></nav>
<section class="hero"><span class="badge">Welcome</span><h1>${esc(name)}</h1><p>${esc(tagline)}</p><a class="btn" href="#contact">${action}</a></section>
<section id="about" class="grid">${services.map(([t, d]) => `<div class="card"><h3>${esc(t)}</h3><p>${esc(d)}</p></div>`).join("")}</section>
<div class="quote">“Absolutely wonderful — friendly, thoughtful and brilliant value.”<small>★★★★★ A happy customer</small></div>
<section id="contact"><h2 style="margin-bottom:12px">${action}</h2><form onsubmit="event.preventDefault();this.innerHTML='<p style=&quot;text-align:center;font-weight:700&quot;>Thank you! We\\'ll be in touch soon.</p>'"><input placeholder="Your name" required><input type="email" placeholder="Email" required><textarea rows="3" placeholder="Message"></textarea><button class="btn" style="border:0;cursor:pointer">Send</button></form></section>
<footer>© ${new Date().getFullYear()} ${esc(name)} · Built with AIBI</footer></div></body></html>`;
}

// ---------- Image (procedural SVG art) ----------
export function demoImage(prompt: string): string {
  const p = prompt.toLowerCase();
  let h = 0;
  for (let i = 0; i < p.length; i++) h = (h * 31 + p.charCodeAt(i)) >>> 0;
  const rnd = () => ((h = (h * 1664525 + 1013904223) >>> 0) / 4294967296);
  const night = /night|moon|star|neon|space|dark/.test(p);
  const sunset = /sunset|golden|dusk|autumn|warm/.test(p);
  const sea = /\b(sea|seaside|ocean|beach|lake|coast|water|lighthouse|harbou?r)\b/.test(p);
  const forest = /\b(forest|woods?|woodland|trees?|garden|jungle|park)\b/.test(p);
  const snow = /snow|winter|ice/.test(p);
  const pastel = /pastel|soft|dreamy|watercolou?r/.test(p);
  const rain = /rain|storm|drizzle|cloudy|grey|gray/.test(p);
  const city = /city|street|caf[eé]|town|shop|building|london|paris|tokyo/.test(p);
  const sky = rain && !night ? ["#5B6B8C", "#AEB9CF"] : night ? ["#0B1036", "#3B2A8F"] : sunset ? ["#FF8A5B", "#FFD36E"] : pastel ? ["#BFD9FF", "#FDE2F3"] : ["#7FC8FF", "#E6F4FF"];
  const land = snow ? ["#FFFFFF", "#DDE8F5"] : forest ? ["#2F8F4E", "#1F6B3A"] : night ? ["#2A1F5C", "#1A1340"] : sunset ? ["#B8577A", "#7A3360"] : ["#7FD88F", "#4FB46A"];
  const W = 768;
  const H = 768;
  let stars = "";
  if (night) for (let i = 0; i < 60; i++) stars += `<circle cx="${rnd() * W}" cy="${rnd() * H * 0.5}" r="${rnd() * 2 + 0.5}" fill="#fff" opacity="${0.4 + rnd() * 0.6}"/>`;
  const orbY = 180 + rnd() * 120;
  const orbX = 200 + rnd() * 360;
  const orb = rain && !night ? "" : night ? `<circle cx="${orbX}" cy="${orbY}" r="70" fill="#FFF6D8"/><circle cx="${orbX + 24}" cy="${orbY - 14}" r="60" fill="${sky[0]}" opacity=".9"/>` : `<circle cx="${orbX}" cy="${orbY}" r="${sunset ? 110 : 80}" fill="${sunset ? "#FFE8A3" : "#FFF7C2"}" opacity=".95"/>`;
  const hills = (y: number, col: string, amp: number) => {
    let d = `M0 ${y}`;
    for (let x = 0; x <= W; x += 96) d += ` Q ${x + 48} ${y - amp * (0.5 + rnd())} ${x + 96} ${y + (rnd() - 0.5) * 30}`;
    return `<path d="${d} V${H} H0Z" fill="${col}"/>`;
  };
  const water = sea ? `<rect x="0" y="${H * 0.62}" width="${W}" height="${H * 0.38}" fill="${night ? "#1B2A6B" : "#3FA9E8"}"/><g opacity=".5">${Array.from({ length: 8 }, () => `<rect x="${rnd() * W}" y="${H * 0.65 + rnd() * H * 0.3}" width="${40 + rnd() * 80}" height="4" rx="2" fill="#fff"/>`).join("")}</g>` : "";
  const lighthouse = /lighthouse/.test(p) ? `<g transform="translate(${W * 0.68} ${H * 0.36})"><path d="M0 220 L20 0 L60 0 L80 220Z" fill="#fff"/><rect x="18" y="40" width="44" height="22" fill="#E5484D"/><rect x="12" y="110" width="56" height="22" fill="#E5484D"/><rect x="22" y="-26" width="36" height="26" fill="#FFE08A"/>${night ? `<path d="M40 -13 L-300 -80 L-300 60Z" fill="#FFF3B0" opacity=".25"/>` : ""}</g>` : "";
  const trees = forest ? Array.from({ length: 14 }, () => { const x = rnd() * W; const s = 0.6 + rnd(); return `<g transform="translate(${x} ${H * 0.7 + rnd() * 60}) scale(${s})"><path d="M0 -90 L-34 0 L34 0Z" fill="#1E6B3A"/><path d="M0 -130 L-26 -50 L26 -50Z" fill="#2F8F4E"/><rect x="-5" y="0" width="10" height="20" fill="#6B4A2B"/></g>`; }).join("") : "";
  const clouds = !night ? Array.from({ length: 3 }, () => { const x = rnd() * W; const y = 80 + rnd() * 160; return `<g opacity=".85"><ellipse cx="${x}" cy="${y}" rx="70" ry="26" fill="#fff"/><ellipse cx="${x + 50}" cy="${y - 12}" rx="50" ry="24" fill="#fff"/></g>`; }).join("") : "";
  const town = city ? Array.from({ length: 9 }, (_, i) => { const w = 60 + rnd() * 40; const h = 120 + rnd() * 200; const x = i * 88 - 10; const y = H * 0.78 - h; let win = ""; for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (rnd() > 0.35) win += `<rect x="${x + 10 + c * (w / 3.2)}" y="${y + 16 + r * 30}" width="${w / 6}" height="14" rx="2" fill="${night || rain || sunset ? "#FFD36E" : "#DDEBFF"}" opacity=".9"/>`; return `<rect x="${x}" y="${y}" width="${w}" height="${h + 40}" rx="6" fill="${night ? "#241a52" : "#6E5A8C"}"/>${win}`; }).join("") : "";
  const drops = rain ? `<g stroke="#E6EEFF" stroke-width="2" opacity=".55">${Array.from({ length: 90 }, () => { const x = rnd() * W; const y = rnd() * H; return `<line x1="${x}" y1="${y}" x2="${x - 8}" y2="${y + 22}"/>`; }).join("")}</g>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient><filter id="g"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .06 0"/><feComposite in2="SourceGraphic" operator="in"/></filter></defs><rect width="${W}" height="${H}" fill="url(#s)"/>${stars}${orb}${clouds}${hills(H * 0.55, land[0] + "99", 90)}${water}${hills(H * (sea ? 0.8 : 0.68), land[0], 70)}${hills(H * (sea ? 0.9 : 0.82), land[1], 50)}${town}${trees}${lighthouse}${drops}<rect width="${W}" height="${H}" filter="url(#g)"/></svg>`;
}

import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// Server-only AI access. API keys are read from the environment here and never
// reach the browser. With no key configured, routes fall back to demo mode.

export const MODEL = process.env.AIBI_MODEL || "claude-opus-5-5";

let client: Anthropic | null = null;
export function claude(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  client = client ?? new Anthropic();
  return client;
}

export const imageLive = () => !!process.env.OPENAI_API_KEY;

export const AIBI_SYSTEM = `You are the AI assistant inside AIBI, a friendly app that teaches everyday people to use AI.
- Be genuinely helpful, warm and concise. Use UK English and £ for money.
- Use light markdown: **bold**, bullet lists, numbered steps and simple tables where they help.
- Keep answers scannable on a phone: short paragraphs, under about 300 words unless the task needs more.
- If something is time-sensitive (prices, opening hours, laws) or high-stakes (health, legal, money), say what to double-check.
- Never ask for or repeat sensitive personal data (passwords, card numbers, ID numbers).`;

// Very small in-memory rate limiter to protect the API key from abuse.
const hits = new Map<string, { n: number; t: number }>();
export function rateLimited(ip: string, max = 40, windowMs = 60_000): boolean {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h.t > windowMs) {
    hits.set(ip, { n: 1, t: now });
    return false;
  }
  h.n += 1;
  return h.n > max;
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}

export function clamp(s: unknown, max: number): string {
  return typeof s === "string" ? s.slice(0, max) : "";
}

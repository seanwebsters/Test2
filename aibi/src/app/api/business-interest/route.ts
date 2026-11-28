import { NextResponse } from "next/server";
import { clamp, clientIp, rateLimited } from "@/lib/server/ai";

export const dynamic = "force-dynamic";

// Receives AIBI for Business enquiries. Wire this to your CRM or email service
// (e.g. HubSpot, Resend) — for now enquiries are written to the server log.
export async function POST(req: Request) {
  if (rateLimited(clientIp(req), 5)) return NextResponse.json({ ok: false }, { status: 429 });
  try {
    const b = await req.json();
    const entry = { company: clamp(b.company, 120), email: clamp(b.email, 160), size: clamp(b.size, 40), at: new Date().toISOString() };
    if (!entry.company || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(entry.email)) return NextResponse.json({ ok: false, error: "Please add your company and a valid work email." }, { status: 400 });
    console.log("[aibi:business-interest]", JSON.stringify(entry));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

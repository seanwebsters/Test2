import { NextResponse } from "next/server";
import { listApprovedStories, publicBaseUrl } from "@/lib/services/public-stories";

export const dynamic = "force-dynamic";

const CORS = { "access-control-allow-origin": "*", "access-control-allow-methods": "GET, OPTIONS", "access-control-allow-headers": "content-type, range" };

/**
 * Public feed of approved stories (human-approved and released), newest first.
 * No sign-in; safe to call from another site (CORS open).
 */
export async function GET(req: Request) {
  const stories = await listApprovedStories(publicBaseUrl(req));
  return NextResponse.json({ stories }, { headers: { ...CORS, "cache-control": "public, max-age=60" } });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

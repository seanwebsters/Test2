import { NextResponse } from "next/server";
import { claude, imageLive } from "@/lib/server/ai";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ text: !!claude(), image: imageLive() });
}

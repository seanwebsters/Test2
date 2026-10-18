import { NextResponse } from "next/server";
import { setSessionUser } from "@/lib/auth/session";
import { newGuestId } from "@/lib/auth/token";

export async function POST() {
  await setSessionUser(newGuestId());
  return NextResponse.json({ ok: true });
}

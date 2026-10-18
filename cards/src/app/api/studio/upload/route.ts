import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api";
import { currentUser } from "@/lib/auth/session";
import { now } from "@/lib/clock";
import { getStore } from "@/lib/db";
import { ServiceError } from "@/lib/services/core";
import { setArtworkTx } from "@/lib/studio/content";

const TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

/** Artwork upload (local storage adapter). Swap for Supabase Storage in production — see docs. */
export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user || user.role !== "admin") throw new ServiceError("forbidden", "Administrator access required", 403);
    const form = await req.formData();
    const file = form.get("file");
    const universeId = String(form.get("universeId") ?? "");
    const cardId = form.get("cardId") ? String(form.get("cardId")) : undefined;
    if (!(file instanceof File)) throw new ServiceError("no_file", "Choose an image");
    const ext = TYPES[file.type];
    if (!ext) throw new ServiceError("bad_type", "PNG, JPEG or WebP only");
    if (file.size > 5 * 1024 * 1024) throw new ServiceError("too_big", "Max 5 MB");
    const name = `${randomUUID()}.${ext}`;
    const dir = path.resolve(process.cwd(), process.env.DATA_DIR || ".data", "uploads");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
    const url = `/api/assets/${name}`;
    await getStore().transact((d) => setArtworkTx(d, user.id, { universeId, cardId }, url, now()));
    return NextResponse.json({ url });
  } catch (e) {
    return errorResponse(e);
  }
}

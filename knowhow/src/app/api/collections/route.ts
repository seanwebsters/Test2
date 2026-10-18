import { NextResponse } from "next/server";
import { z } from "zod";
import { handler, body } from "@/lib/api";
import { HttpError, currentUser } from "@/lib/auth";
import { SERIES_BY_SLUG } from "@/lib/catalog";
import { allCollections } from "@/lib/collections";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  const user = await currentUser();
  const all = await allCollections();
  return NextResponse.json(all.filter((c) => c.isPublic || c.ownerId === user.id));
});

const PALETTES: [string, string][] = [["#DFFF57", "#111114"], ["#FF92C7", "#3B0D27"], ["#B6A1FF", "#1F1640"], ["#FF7768", "#2A0B07"], ["#57E3FF", "#062F38"], ["#FFB547", "#3D2306"]];

const Create = z.object({
  title: z.string().trim().min(3).max(60),
  description: z.string().trim().max(200).default(""),
  seriesSlugs: z.array(z.string()).max(40).default([]),
  isPublic: z.boolean().default(true),
});

export const POST = handler(async (req: Request) => {
  const b = await body(req, Create);
  const user = await currentUser();
  const mine = (await allCollections()).filter((c) => c.ownerId === user.id);
  if (mine.length >= 30) throw new HttpError(400, "That's a lot of collections. Delete one first.");
  const now = new Date().toISOString();
  const c = {
    id: `c_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    ownerId: user.id, ownerHandle: user.handle, ownerName: user.displayName,
    title: b.title, description: b.description, seriesSlugs: b.seriesSlugs.filter((s) => SERIES_BY_SLUG[s]),
    isPublic: b.isPublic, editorial: false, followers: 0, createdAt: now, updatedAt: now,
    palette: PALETTES[mine.length % PALETTES.length],
  };
  await store.saveCollection(c);
  return NextResponse.json(c);
});

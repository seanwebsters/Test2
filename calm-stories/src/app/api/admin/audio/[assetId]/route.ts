import { NextResponse } from "next/server";
import { route } from "@/lib/api";
import { requireEditor } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { serveStoredAudio } from "@/lib/storage/serve";

/** Editors preview any episode audio (including unreleased uploads) from the review queue. */
export const GET = route<{ params: Promise<{ assetId: string }> }>(async (req, { params }) => {
  await requireEditor();
  const { assetId } = await params;
  const asset = await getDb().get("audio_assets", assetId);
  if (!asset) throw notFound();
  if (asset.kind === "sample") return NextResponse.redirect(new URL(asset.url, req.url), 307);
  return serveStoredAudio(req, asset.storage_key, asset.mime_type);
});

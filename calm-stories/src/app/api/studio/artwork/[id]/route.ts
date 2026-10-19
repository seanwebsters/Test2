import { z } from "zod";
import { parseBody, route } from "@/lib/api";
import { requireEditor } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { nowIso } from "@/lib/util";

const Body = z.object({ action: z.enum(["approve", "reject", "use"]) });

/** Approve, reject, or put a different concept into use (poster → series art, cover → episode art). */
export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  await requireEditor();
  const { id } = await params;
  const { action } = await parseBody(req, Body);
  const db = getDb();
  const a = await db.get("artwork_assets", id);
  if (!a) throw notFound();
  if (action === "reject") return { asset: await db.update("artwork_assets", id, { status: "rejected" }) };
  if (action === "use" || action === "approve") {
    const url = a.variants["1200w"] ?? a.url;
    if (a.kind === "poster") {
      const s = await db.get("series", a.series_id);
      if (s) await db.update("series", s.id, { artwork: { ...s.artwork, image_url: url }, updated_at: nowIso() });
      for (const other of await db.list("artwork_assets", { where: { series_id: a.series_id, kind: "poster", status: ["selected", "approved"] } })) if (other.id !== id) await db.update("artwork_assets", other.id, { status: "concept" });
    }
    if (a.kind === "episode_cover" && a.episode_id) {
      await db.update("episodes", a.episode_id, { artwork_url: url, updated_at: nowIso() });
      for (const other of await db.list("artwork_assets", { where: { episode_id: a.episode_id, kind: "episode_cover", status: ["selected", "approved"] } })) if (other.id !== id) await db.update("artwork_assets", other.id, { status: "concept" });
    }
    if (a.kind === "character_portrait" && a.character_id) await db.update("characters", a.character_id, { portrait_asset_id: id, updated_at: nowIso() });
  }
  return { asset: await db.update("artwork_assets", id, { status: action === "approve" ? "approved" : "selected" }) };
});

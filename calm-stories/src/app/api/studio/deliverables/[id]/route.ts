import { z } from "zod";
import { parseBody, route } from "@/lib/api";
import { requireEditor } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { badRequest, notFound } from "@/lib/errors";
import { saveDeliverable } from "@/lib/studio/bible";
import { nowIso, wordCount } from "@/lib/util";

const Body = z.object({ data: z.unknown(), note: z.string().max(500).default("") });

/**
 * Human edit of any deliverable: saved as a new version by the Network
 * Executive, so the history keeps every agent and human revision.
 */
export const PUT = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const viewer = await requireEditor();
  const { id } = await params;
  const db = getDb();
  const d = await db.get("deliverables", id);
  if (!d) throw notFound();
  const { data, note } = await parseBody(req, Body);
  if (d.kind === "script") {
    const s = z.object({ scenes: z.array(z.object({ index: z.number().int(), title: z.string(), text: z.string().min(1) })) }).safeParse(data);
    if (!s.success) throw badRequest("A script needs scenes with text.");
  }
  const next = await saveDeliverable({ ...d, data, reasoning: note || "Edited by the Network Executive", agent: "network_executive", model: "human", edited_by: viewer.user.id, title: `${d.title.replace(/ \(edited\)$/, "")} (edited)` });
  // Keep the locked script in step with human edits.
  if (d.kind === "script" && d.key === "script" && d.episode_id) {
    const scr = await db.findOne("episode_scripts", { episode_id: d.episode_id });
    const scenes = (data as { scenes: { index: number; title: string; text: string }[] }).scenes;
    const content = scenes.map((s) => s.text).join("\n\n---\n\n");
    if (scr) await db.update("episode_scripts", scr.id, { scenes, content, word_count: wordCount(content), version: next.version, updated_at: nowIso() });
  }
  return { deliverable: next };
});

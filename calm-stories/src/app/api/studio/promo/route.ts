import { z } from "zod";
import { parseBody, route } from "@/lib/api";
import { requireEditor } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { createRun } from "@/lib/studio/engine";
import "@/lib/studio";

const Body = z.object({ series_id: z.string() });

/** Commission environment art and social/promo assets for a series. */
export const POST = route(async (req) => {
  const viewer = await requireEditor();
  const { series_id } = await parseBody(req, Body);
  const s = await getDb().get("series", series_id);
  if (!s) throw notFound();
  const { run } = await createRun({
    kind: "series_development",
    title: `Promo pack · ${s.title}`,
    series_id,
    budget_cents: 300,
    created_by: viewer.user.id,
    steps: [
      { key: "environments", type: "art.environments", agent: "art_director", label: "Paint environment art", activity: "typing", deps: [] },
      { key: "social", type: "art.social", agent: "art_director", label: "Create social and promo assets", activity: "typing", deps: [] },
    ],
  });
  return { run_id: run.id };
});

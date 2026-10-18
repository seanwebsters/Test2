import { OPPORTUNITY_TYPE_LABELS, type OpportunityType } from "@/lib/content/opportunities";
import { requireViewer } from "@/lib/server/auth";
import { handle, json } from "@/lib/server/http";
import { recommendOpportunities } from "@/lib/server/opportunities";
import { loadState } from "@/lib/server/services";

export const GET = handle(async (req: Request) => {
  const viewer = await requireViewer();
  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const state = await loadState(viewer);
  const items = await recommendOpportunities(state, {
    type: type && type in OPPORTUNITY_TYPE_LABELS ? (type as OpportunityType) : null,
    careerSlug: url.searchParams.get("career"),
    remoteOnly: url.searchParams.get("remote") === "1",
    q: url.searchParams.get("q"),
  });
  return json({ items });
});

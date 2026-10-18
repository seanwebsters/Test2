import { requireViewer } from "@/lib/server/auth";
import { handle, json } from "@/lib/server/http";
import { getTodayPlan } from "@/lib/server/services";

export const GET = handle(async () => {
  const viewer = await requireViewer();
  return json(await getTodayPlan(viewer));
});

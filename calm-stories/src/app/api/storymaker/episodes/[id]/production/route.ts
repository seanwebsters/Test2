import { getViewer } from "@/lib/auth";
import { json, route } from "@/lib/api";
import { getProduction } from "@/lib/audio/production";

export const GET = route<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const { id } = await params;
  return json(await getProduction(await getViewer(), id));
});

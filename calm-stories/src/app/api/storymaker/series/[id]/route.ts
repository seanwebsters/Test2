import { getViewer } from "@/lib/auth";
import { json, route } from "@/lib/api";
import { workspaceSnapshot } from "@/lib/storymaker/service";

export const GET = route<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const { id } = await params;
  return json(await workspaceSnapshot(await getViewer(), id));
});

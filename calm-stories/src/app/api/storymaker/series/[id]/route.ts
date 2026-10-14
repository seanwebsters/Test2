import { route } from "@/lib/api";
import { requireCreator } from "@/lib/auth/session";
import { loadWorkspace } from "@/lib/storymaker/workspace";

export const GET = route<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const { id } = await params;
  return loadWorkspace(await requireCreator(), id);
});

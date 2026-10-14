import { getViewer } from "@/lib/auth";
import { json, route } from "@/lib/api";
import { getScriptBundle, getVersion, restoreVersion } from "@/lib/storymaker/service";

type Ctx = { params: Promise<{ id: string; versionId: string }> };

export const GET = route<Ctx>(async (_req, { params }) => {
  const { id, versionId } = await params;
  return json(await getVersion(await getViewer(), id, versionId));
});

/** Rollback: copies the chosen version into a new current version. */
export const POST = route<Ctx>(async (_req, { params }) => {
  const { id, versionId } = await params;
  const viewer = await getViewer();
  await restoreVersion(viewer, id, versionId);
  return json(await getScriptBundle(viewer, id));
}, { limit: 30 });

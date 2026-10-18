import { requireViewer } from "@/lib/server/auth";
import { assertSameOrigin, handle, json, parseBody } from "@/lib/server/http";
import { ProfilePatchSchema } from "@/lib/server/schemas";
import { updateProfileSettings } from "@/lib/server/services";

export const PATCH = handle(async (req: Request) => {
  assertSameOrigin(req);
  const viewer = await requireViewer();
  const body = await parseBody(req, ProfilePatchSchema);
  const profile = await updateProfileSettings(viewer, body);
  return json({ handle: profile.handle, privacy: profile.privacy, displayName: profile.displayName });
});

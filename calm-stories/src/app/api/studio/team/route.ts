import { route } from "@/lib/api";
import { requireEditor } from "@/lib/auth/session";
import { getTeamState } from "@/lib/studio/team";

export const GET = route(async () => {
  await requireEditor();
  return { agents: await getTeamState(), at: new Date().toISOString() };
});

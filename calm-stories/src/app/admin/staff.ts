import "server-only";
import { getViewer } from "@/lib/auth/session";
import { isEditor } from "@/lib/auth/policy";

/**
 * Admin pages render in parallel with the admin layout, so the layout's
 * sign-in gate alone would still stream page data to non-staff. Every admin
 * page checks this itself and renders nothing for non-staff.
 */
export async function isStaff(): Promise<boolean> {
  const viewer = await getViewer();
  return viewer.user !== null && isEditor(viewer);
}

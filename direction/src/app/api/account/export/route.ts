import { requireViewer } from "@/lib/server/auth";
import { handle } from "@/lib/server/http";
import { exportData } from "@/lib/server/services";

export const GET = handle(async () => {
  const viewer = await requireViewer();
  const data = await exportData(viewer);
  return new Response(JSON.stringify(data, null, 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": 'attachment; filename="direction-data.json"', "Cache-Control": "no-store" },
  });
});

import { startDemoSession } from "@/lib/server/auth";
import { seedDemo } from "@/lib/server/demo";
import { assertSameOrigin, handle, json } from "@/lib/server/http";

export const POST = handle(async (req: Request) => {
  assertSameOrigin(req);
  const viewer = await startDemoSession();
  await seedDemo(viewer);
  return json({ ok: true });
});

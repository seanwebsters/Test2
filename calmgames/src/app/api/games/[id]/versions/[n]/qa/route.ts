import { ok, rateLimit, route } from "@/lib/http";
import { testVersion } from "@/lib/orchestrator";

export const maxDuration = 120;

export const POST = route(async (req, { params }: { params: Promise<{ id: string; n: string }> }) => {
  rateLimit(req, "qa", 10);
  const { id, n } = await params;
  return ok({ qa: await testVersion(id, Number(n)) });
});

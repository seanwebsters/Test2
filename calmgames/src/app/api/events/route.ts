import { z } from "zod";
import { body, ok, rateLimit, route } from "@/lib/http";
import { repo } from "@/lib/store";
import { newId, nowIso } from "@/lib/ids";

const ALLOWED = ["session_start", "level_start", "level_complete", "game_complete", "restart", "interaction", "error"] as const;
const schema = z.object({
  gameId: z.string().max(80),
  version: z.number().int().min(1),
  sessionId: z.string().max(80),
  events: z
    .array(z.object({ name: z.enum(ALLOWED), level: z.number().int().min(0).max(50).optional(), data: z.record(z.string(), z.unknown()).optional() }))
    .min(1)
    .max(100),
});

/** Play-session events relayed by the studio from the sandboxed game iframe. */
export const POST = route(async (req) => {
  rateLimit(req, "events", 240);
  const input = await body(req, schema);
  const at = nowIso();
  await (await repo()).addEvents(
    input.events.map((e) => ({ id: newId("ev"), gameId: input.gameId, version: input.version, sessionId: input.sessionId, name: e.name, level: e.level, data: e.data ? JSON.parse(JSON.stringify(e.data).slice(0, 2000) || "{}") : undefined, at })),
  );
  return ok({ stored: input.events.length });
});

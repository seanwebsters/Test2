import { signIn } from "@/lib/server/auth";
import { assertSameOrigin, handle, json, parseBody } from "@/lib/server/http";
import { z } from "zod";

export const POST = handle(async (req: Request) => {
  assertSameOrigin(req);
  const body = await parseBody(req, z.object({ email: z.string().trim().email("Please enter a valid email.").max(200), password: z.string().min(1).max(200) }));
  await signIn(body.email, body.password);
  return json({ ok: true });
});

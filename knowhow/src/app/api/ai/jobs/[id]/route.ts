import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { HttpError, sessionUserId } from "@/lib/auth";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

export const GET = handler(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const job = await store.getJob(id);
  if (!job || job.ownerId !== (await sessionUserId())) throw new HttpError(404, "Job not found");
  return NextResponse.json(job);
});

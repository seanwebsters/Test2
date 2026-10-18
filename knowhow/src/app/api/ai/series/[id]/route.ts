import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { ownedAiSeries, publicAiSeries } from "@/lib/ai/access";

export const dynamic = "force-dynamic";

export const GET = handler(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  return NextResponse.json(publicAiSeries(await ownedAiSeries(id)));
});

import { z } from "zod";
import { body, HttpError, json, route } from "@/lib/api";
import { env } from "@/lib/env";
import { runJob } from "@/lib/jobs/engine";

export const maxDuration = 800;

/**
 * Worker entry point for the Trigger.dev driver: the `calm-production-job`
 * task POSTs { jobId } here with the CRON_SECRET bearer token.
 */
export const POST = route(async (req) => {
  if (!env.cronSecret || req.headers.get("authorization") !== `Bearer ${env.cronSecret}`) throw new HttpError(401, "Unauthorized");
  const { jobId } = await body(req, z.object({ jobId: z.string() }));
  const job = await runJob(jobId);
  return json({ status: job?.status ?? "missing" });
}, { limit: 60, bucket: "jobs-run" });

/**
 * Trigger.dev task (v3+) that executes a Calm Stories production job.
 * Not compiled by the Next.js app – deploy with the Trigger.dev CLI after
 * `npm i @trigger.dev/sdk`. See docs/INTEGRATIONS.md.
 */
// @ts-nocheck – @trigger.dev/sdk is an optional dependency.
import { task } from "@trigger.dev/sdk/v3";

export const runCalmJob = task({
  id: "calm-run-job",
  maxDuration: 3600,
  retry: { maxAttempts: 1 }, // step-level retries are handled by the Calm job runner
  run: async (payload: { jobId: string }) => {
    await import("../src/lib/jobs/workflows");
    const { runJob } = await import("../src/lib/jobs/runner");
    await runJob(payload.jobId);
    return { jobId: payload.jobId };
  },
});

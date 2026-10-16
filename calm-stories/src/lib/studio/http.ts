import "server-only";
import { badRequest } from "@/lib/errors";
import { BlockedError, StepFailure } from "./errors";

/** Map studio errors to 400s with their readable message. */
export async function studioAction<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof StepFailure || err instanceof BlockedError) throw badRequest(err.message);
    throw err;
  }
}

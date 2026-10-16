/** A step can't proceed until a person connects a credential or makes a decision. */
export class BlockedError extends Error {
  constructor(
    readonly needs: string,
    message: string,
  ) {
    super(message);
  }
}

/** Provider rate limit – the engine reschedules the step without counting an attempt. */
export class RateLimitedError extends Error {
  constructor(
    readonly provider: string,
    readonly retryAfterMs: number,
  ) {
    super(`${provider} rate limit reached – retrying in ${Math.ceil(retryAfterMs / 1000)}s.`);
  }
}

/** A step failed; `retryable` failures are retried with backoff up to the attempt limit. */
export class StepFailure extends Error {
  constructor(
    message: string,
    readonly retryable = false,
  ) {
    super(message);
  }
}

/** Spending more would exceed the run budget. */
export class BudgetError extends BlockedError {
  constructor(message: string) {
    super("budget", message);
  }
}

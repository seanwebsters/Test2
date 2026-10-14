export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
  }
}

export const unauthorized = (msg = "Please sign in to continue.") => new HttpError(401, msg, "unauthorized");
export const forbidden = (msg = "You don't have access to this.") => new HttpError(403, msg, "forbidden");
export const notFound = (msg = "Not found.") => new HttpError(404, msg, "not_found");
export const badRequest = (msg: string) => new HttpError(400, msg, "bad_request");
export const conflict = (msg: string) => new HttpError(409, msg, "conflict");
export const tooMany = (msg = "Too many requests – please slow down.") => new HttpError(429, msg, "rate_limited");

"use client";

export class ApiError extends Error {
  constructor(public code: string, message: string, public status: number) {
    super(message);
  }
}

export async function post<T = unknown>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string; message?: string };
  if (!res.ok) throw new ApiError(data.error ?? "error", data.message ?? "Something went wrong", res.status);
  return data;
}

export function track(name: string, universeId?: string, props?: Record<string, string | number | boolean>) {
  post("/api/events", { name, universeId, props }).catch(() => undefined);
}

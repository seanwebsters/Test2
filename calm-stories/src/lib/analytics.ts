import "server-only";
import { env } from "@/lib/env";

/**
 * Server-side analytics. Sends to PostHog when POSTHOG_KEY is configured;
 * otherwise events are only stored in the listening_events table (no-op here).
 * Never blocks the request path.
 */
export function track(distinctId: string, event: string, properties: Record<string, unknown> = {}) {
  if (!env.posthogKey) return;
  void fetch(`${env.posthogHost}/capture/`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ api_key: env.posthogKey, event, distinct_id: distinctId, properties: { ...properties, app: "calm-stories", env: env.appEnv } }),
  }).catch(() => undefined);
}

export function analyticsStatus() {
  return { provider: env.posthogKey ? "posthog" : "local-only", configured: !!env.posthogKey };
}

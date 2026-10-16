import "server-only";
import { env } from "@/lib/env";
import { log } from "@/lib/log";

/**
 * Product analytics sink. Listening events are always stored in our own
 * database (listening_events) for creator dashboards; this module forwards
 * product events to PostHog when POSTHOG_KEY is configured.
 */
export type AnalyticsEvent =
  | "episode_play"
  | "episode_pause"
  | "episode_complete"
  | "sleep_timer_set"
  | "series_saved"
  | "series_followed"
  | "creator_followed"
  | "episode_approved"
  | "episode_released"
  | "subscription_upsell_viewed"
  | "subscription_entitlement_checked";

export async function track(event: AnalyticsEvent, distinctId: string, properties: Record<string, unknown> = {}) {
  if (!env.posthogKey) {
    log.debug("analytics", event, { distinctId, ...properties, sink: "local-only" });
    return;
  }
  try {
    await fetch(`${env.posthogHost.replace(/\/$/, "")}/capture/`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ api_key: env.posthogKey, event, distinct_id: distinctId, properties: { ...properties, app: "calm-stories" } }),
    });
  } catch (err) {
    log.warn("analytics", "PostHog capture failed", { event, error: String(err) });
  }
}

export function analyticsStatus() {
  return { provider: env.posthogKey ? "posthog" : "local", configured: Boolean(env.posthogKey) };
}

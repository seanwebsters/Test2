import "server-only";

const DEV_SECRET = "direction-dev-secret-change-me-in-production";

/** Environment configuration, read lazily so tests can override it. */
export const env = {
  get dataDir() {
    return process.env.DATA_DIR || ".data";
  },
  get sessionSecret() {
    const s = process.env.SESSION_SECRET;
    if (!s && process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
      console.warn("[direction] SESSION_SECRET is not set. Using an insecure development secret.");
    }
    return s || DEV_SECRET;
  },
  get supabaseUrl() {
    return process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  },
  get supabaseAnonKey() {
    return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  },
  get supabaseServiceRoleKey() {
    return process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  },
  get anthropicKey() {
    return process.env.ANTHROPIC_API_KEY || "";
  },
  get aiModel() {
    return process.env.AI_MODEL || "claude-opus-5-5";
  },
  get stripeSecretKey() {
    return process.env.STRIPE_SECRET_KEY || "";
  },
  get stripePriceId() {
    return process.env.STRIPE_PRICE_ID || "";
  },
  get stripeWebhookSecret() {
    return process.env.STRIPE_WEBHOOK_SECRET || "";
  },
  get adzunaAppId() {
    return process.env.ADZUNA_APP_ID || "";
  },
  get adzunaAppKey() {
    return process.env.ADZUNA_APP_KEY || "";
  },
  get appUrl() {
    return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  },
  get demoEnabled() {
    return process.env.DEMO_MODE !== "off";
  },
};

export function backend(): "supabase" | "local" {
  return env.supabaseUrl && env.supabaseAnonKey ? "supabase" : "local";
}

export function aiConfigured(): boolean {
  return !!env.anthropicKey;
}

export function billingMode(): "stripe" | "mock" {
  return env.stripeSecretKey && env.stripePriceId ? "stripe" : "mock";
}

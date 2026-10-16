/**
 * Central, typed access to environment configuration.
 * Server-only secrets are never read from client components.
 */
import "server-only";

function opt(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim().length > 0 ? v.trim() : undefined;
}

export const env = {
  appEnv: (opt("APP_ENV") ?? (process.env.NODE_ENV === "production" ? "production" : "development")) as
    | "development"
    | "production"
    | "test",
  dataBackend: (opt("DATA_BACKEND") ?? "local") as "local" | "supabase",
  dataDir: opt("DATA_DIR") ?? ".data",
  get sessionSecret(): string {
    const v = opt("SESSION_SECRET");
    if (v) return v;
    if (process.env.NODE_ENV === "production" && opt("APP_ENV") !== "development" && process.env.NEXT_PHASE !== "phase-production-build") {
      throw new Error("SESSION_SECRET must be set in production.");
    }
    return "dev-only-insecure-session-secret-change-me";
  },
  authProvider: (opt("AUTH_PROVIDER") ?? "demo") as "demo" | "supabase",

  supabaseUrl: opt("SUPABASE_URL") ?? opt("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: opt("SUPABASE_ANON_KEY") ?? opt("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: opt("SUPABASE_SERVICE_ROLE_KEY"),

  storageBackend: (opt("STORAGE_BACKEND") ?? "local") as "local" | "r2" | "supabase",
  r2AccountId: opt("R2_ACCOUNT_ID"),
  r2AccessKeyId: opt("R2_ACCESS_KEY_ID"),
  r2SecretAccessKey: opt("R2_SECRET_ACCESS_KEY"),
  r2Bucket: opt("R2_BUCKET"),
  r2PublicBaseUrl: opt("R2_PUBLIC_BASE_URL"),
  supabaseStorageBucket: opt("SUPABASE_STORAGE_BUCKET") ?? "calm-stories",

  ffmpegPath: opt("FFMPEG_PATH"),

  posthogKey: opt("POSTHOG_KEY"),
  posthogHost: opt("POSTHOG_HOST") ?? "https://eu.i.posthog.com",

  cronSecret: opt("CRON_SECRET"),
};

export type Env = typeof env;

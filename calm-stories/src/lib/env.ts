/**
 * Central, typed access to environment configuration.
 * Server-only secrets are never read from client components.
 */
import "server-only";
import { randomBytes } from "node:crypto";

let ephemeralSecret: string | null = null;

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
  // Serverless platforms (Vercel) only allow writes under /tmp.
  // Railway volumes expose their mount path; Vercel only has a throwaway /tmp.
  dataDir: opt("DATA_DIR") ?? opt("RAILWAY_VOLUME_MOUNT_PATH") ?? (process.env.VERCEL ? "/tmp/calm-stories" : ".data"),
  get sessionSecret(): string {
    const v = opt("SESSION_SECRET");
    if (v) return v;
    if (process.env.NODE_ENV === "production" && opt("APP_ENV") !== "development" && process.env.NEXT_PHASE !== "phase-production-build") {
      // Never fall back to a guessable secret in production. A random per-process
      // secret keeps the app working, but sign-ins won't survive restarts.
      if (!ephemeralSecret) {
        ephemeralSecret = randomBytes(32).toString("hex");
        console.warn(JSON.stringify({ level: "warn", scope: "env", message: "SESSION_SECRET is not set – using a temporary random secret. Set SESSION_SECRET so sign-ins persist." }));
      }
      return ephemeralSecret;
    }
    return "dev-only-insecure-session-secret-change-me";
  },
  authProvider: (opt("AUTH_PROVIDER") ?? "demo") as "demo" | "supabase",
  /** Temporary: the footer "dev" link opens the studio without a login. Set DEV_ACCESS=off to disable. */
  get devAccess(): boolean {
    return opt("DEV_ACCESS") !== "off" && (opt("AUTH_PROVIDER") ?? "demo") === "demo";
  },

  supabaseUrl: opt("SUPABASE_URL") ?? opt("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: opt("SUPABASE_ANON_KEY") ?? opt("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: opt("SUPABASE_SERVICE_ROLE_KEY"),

  /** Writing agents (Claude). */
  anthropicApiKey: opt("ANTHROPIC_API_KEY"),
  /** Narration + ambience agents. */
  elevenLabsApiKey: opt("ELEVENLABS_API_KEY"),
  /** Art agent ("Nano Banana" – Gemini image generation). */
  geminiApiKey: opt("GEMINI_API_KEY") ?? opt("GOOGLE_API_KEY"),
  /** Alternative route to Nano Banana via fal.ai (used when no Gemini key is set). */
  falKey: opt("FAL_KEY") ?? opt("FAL_API_KEY"),

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

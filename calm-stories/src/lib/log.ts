/** Structured logger. JSON lines in production, readable lines in development. */
type Level = "debug" | "info" | "warn" | "error";

function emit(level: Level, scope: string, message: string, extra?: unknown) {
  const err = extra instanceof Error ? { error: extra.message, stack: extra.stack } : extra !== undefined ? { extra } : {};
  if (process.env.NODE_ENV === "production") {
    console[level === "debug" ? "log" : level](JSON.stringify({ level, scope, message, at: new Date().toISOString(), ...err }));
  } else if (level !== "debug" || process.env.DEBUG) {
    console[level === "debug" ? "log" : level](`[${scope}] ${message}`, extra ?? "");
  }
}

export const log = {
  debug: (scope: string, msg: string, extra?: unknown) => emit("debug", scope, msg, extra),
  info: (scope: string, msg: string, extra?: unknown) => emit("info", scope, msg, extra),
  warn: (scope: string, msg: string, extra?: unknown) => emit("warn", scope, msg, extra),
  error: (scope: string, msg: string, extra?: unknown) => emit("error", scope, msg, extra),
};

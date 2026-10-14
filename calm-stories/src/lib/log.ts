/** Structured JSON logging (picked up by Vercel / any log drain). */
type Level = "debug" | "info" | "warn" | "error";

function write(level: Level, scope: string, message: string, data?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "test" && level === "debug") return;
  const line = JSON.stringify({ t: new Date().toISOString(), level, scope, message, ...data });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const log = {
  debug: (scope: string, message: string, data?: Record<string, unknown>) => write("debug", scope, message, data),
  info: (scope: string, message: string, data?: Record<string, unknown>) => write("info", scope, message, data),
  warn: (scope: string, message: string, data?: Record<string, unknown>) => write("warn", scope, message, data),
  error: (scope: string, message: string, data?: Record<string, unknown>) => write("error", scope, message, data),
};

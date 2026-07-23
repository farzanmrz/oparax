/** One-line JSON structured logging — Railway's log viewer parses JSON lines natively, and
 *  this keeps the worker dependency-free for something this small. */

type Level = "info" | "warn" | "error" | "fatal";

function log(level: Level, message: string, meta?: Record<string, unknown>): void {
  const line = {
    ts: new Date().toISOString(),
    level,
    message,
    ...(meta ? { meta } : {}),
  };
  const out = level === "error" || level === "fatal" ? console.error : console.log;
  out(JSON.stringify(line));
}

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => log("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => log("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log("error", message, meta),
  fatal: (message: string, meta?: Record<string, unknown>) => log("fatal", message, meta),
};

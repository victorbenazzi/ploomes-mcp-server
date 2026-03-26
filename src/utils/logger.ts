/**
 * Simple logger that writes to stderr (required for stdio MCP transport).
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private level: number;

  constructor() {
    const env = (process.env.LOG_LEVEL ?? "info").toLowerCase() as LogLevel;
    this.level = LEVELS[env] ?? LEVELS.info;
  }

  private log(level: LogLevel, ...args: unknown[]): void {
    if (LEVELS[level] >= this.level) {
      const ts = new Date().toISOString();
      const msg = args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
      process.stderr.write(`[${ts}] [${level.toUpperCase()}] ${msg}\n`);
    }
  }

  debug(...args: unknown[]): void { this.log("debug", ...args); }
  info(...args: unknown[]): void { this.log("info", ...args); }
  warn(...args: unknown[]): void { this.log("warn", ...args); }
  error(...args: unknown[]): void { this.log("error", ...args); }
}

export const logger = new Logger();

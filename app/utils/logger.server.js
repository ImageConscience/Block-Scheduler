/**
 * Structured logger for server-side code.
 * Log level is driven by LOG_LEVEL env var: debug | info | warn | error
 * Default: info in production, debug in development
 */
const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const defaultLevel = process.env.NODE_ENV === "production" ? "info" : "debug";
const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL?.toLowerCase()] ?? LOG_LEVELS[defaultLevel];

const shouldLog = (level) => LOG_LEVELS[level] >= currentLevel;

export const logger = {
  debug: (...args) => {
    if (shouldLog("debug")) console.log("[DEBUG]", ...args);
  },
  info: (...args) => {
    if (shouldLog("info")) console.log("[INFO]", ...args);
  },
  warn: (...args) => {
    if (shouldLog("warn")) console.warn("[WARN]", ...args);
  },
  error: (...args) => {
    if (shouldLog("error")) console.error("[ERROR]", ...args);
  },
};

/**
 * @file requestLogger.ts
 * @description
 *   Coloured, concise HTTP request logger middleware.
 *   Uses morgan under the hood with a custom token format so every request
 *   prints method + url + status + response-time in the terminal.
 *
 *   Example output (dev):
 *     → GET /api/v1/files/tree  200  12ms
 *     → DELETE /api/v1/files/delete  200  45ms
 */

import morgan, { StreamOptions } from 'morgan';
import { env } from '../config/env';

// ─── Custom Morgan Token ──────────────────────────────────────────────────────

/** ANSI colour helpers — only active in non-production environments */
const colour = (code: number, text: string) =>
  env.NODE_ENV !== 'production' ? `\x1b[${code}m${text}\x1b[0m` : text;

const STATUS_COLOURS: Record<number, (s: string) => string> = {
  2: (s) => colour(32, s),  // green  → 2xx
  3: (s) => colour(36, s),  // cyan   → 3xx
  4: (s) => colour(33, s),  // yellow → 4xx
  5: (s) => colour(31, s),  // red    → 5xx
};

function colourStatus(status: number): string {
  const fn = STATUS_COLOURS[Math.floor(status / 100)] ?? ((s: string) => s);
  return fn(String(status));
}

// Register a custom token that produces a coloured status code
morgan.token('coloured-status', (_req, res) => colourStatus(res.statusCode));

// ─── Logger Middleware ────────────────────────────────────────────────────────

const stream: StreamOptions = {
  write: (message) => process.stdout.write(message),
};

/**
 * Request logger middleware.
 * In production uses the compact "combined" Apache-style format.
 * In development uses a concise custom format with coloured status codes.
 */
export const requestLogger = morgan(
  env.NODE_ENV === 'production'
    ? 'combined'
    : '  → :method :url :coloured-status :response-time ms',
  { stream }
);

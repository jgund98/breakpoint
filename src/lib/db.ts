/**
 * The one database connection.
 *
 * Server-only. DATABASE_URL is Neon's pooled string, so the pool here
 * stays at a single client per serverless instance and lets pgbouncer do
 * the real pooling. Cached on globalThis because Next re-evaluates
 * modules per route in dev, and a pool per hot reload exhausts the
 * connection quota in an afternoon.
 */
import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __bpPool: Pool | undefined;
}

export function db(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Locally: npx vercel env pull .env.local --environment=development",
    );
  }
  if (!globalThis.__bpPool) {
    globalThis.__bpPool = new Pool({ connectionString: url, max: 1 });
  }
  return globalThis.__bpPool;
}

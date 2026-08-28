import { db } from "@/lib/db";
import { rows } from "@/lib/portfolio";

/**
 * The client registry, database-backed.
 *
 * Every admin surface resolves a client through here — nothing on the
 * admin side may assume which client exists. The one hardcode left is
 * PORTFOLIOS: which orgs have a dataset imported into the monitoring
 * engine. That map shrinks to nothing when portfolios go relational;
 * until then a client without an entry is real but "awaiting import,"
 * and its board renders in setup state.
 */

export type OrgRow = {
  id: string;
  slug: string;
  name: string;
  status: "onboarding" | "live" | "paused";
  descriptor: string | null;
  created_at: string;
  account_manager: string | null;
  contract_start: string | null;
  contract_renewal: string | null;
};

/** Datasets wired into the engine so far, keyed by org slug. */
export const PORTFOLIOS: Record<string, { locations: number; centers: number }> = {
  "abercrombie-fitch": {
    locations: rows.length,
    centers: new Set(rows.map((r) => r.center.id)).size,
  },
};

export async function orgBySlug(slug: string): Promise<OrgRow | null> {
  const clean = (slug ?? "").trim().slice(0, 64);
  if (!clean) return null;
  const { rows: found } = await db().query(
    `select id, slug, name, status, descriptor, created_at,
            account_manager, contract_start, contract_renewal
       from org where slug = $1`,
    [clean],
  );
  return (found[0] as OrgRow) ?? null;
}

export { sanitizeSlug } from "@/lib/slug";

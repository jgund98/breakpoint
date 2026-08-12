/**
 * ============================================================
 * THE DATA BOUNDARY
 * ============================================================
 *
 * Everything in the workspace currently reads `lib/portfolio`, which
 * loads one JSON file at module scope and evaluates the whole portfolio
 * as a set of constants. That is fine for one hardcoded client and
 * impossible for two: it is synchronous, it is baked at build time, and
 * nothing in it is scoped to an org.
 *
 * This is the seam. Pages and lib modules ask the repository for a
 * portfolio; the repository decides where it comes from. Today that is
 * the imported JSON. Next it is Postgres, and the swap is this file
 * rather than nineteen others.
 *
 * The interface is deliberately narrow. It returns the same shapes the
 * clause engine already speaks, so the engine never learns what a
 * database is.
 *
 * MIGRATION ORDER, so this does not turn into a rewrite:
 *
 *   1. this file, backed by the JSON            <- done
 *   2. derived modules (activity, coverage, clause-value, theo, ...)
 *      take a portfolio argument instead of importing constants
 *   3. pages become async and await getPortfolio(orgId)
 *   4. a Postgres adapter lands here and step 1's adapter is deleted
 *
 * Steps 2 and 3 are mechanical once this exists. Step 4 needs a
 * connection string and nothing else.
 */

import type { Row } from "./portfolio";
import {
  DATA_SOURCE,
  TIMELINE,
  TODAY,
  org as demoOrg,
  pendingMatches as demoPendingMatches,
  rows as demoRows,
} from "./portfolio";
import type { PendingMatch } from "./matching";

/** Who is asking, and on whose behalf. */
export type OrgRef = { id: string; slug: string };

export type PortfolioSnapshot = {
  org: {
    id: string;
    name: string;
    descriptor: string;
    totalDoors: number;
    watched: number;
    contractStart: string;
    plan: string;
    team: { name: string; role: string; initials: string }[];
  };
  /** The evaluation date. Never later than the data behind it. */
  asOf: string;
  /** Months covered, oldest first. */
  timeline: string[];
  /** Where this portfolio came from, for the record. */
  source: string;
  rows: Row[];
  pendingMatches: PendingMatch[];
};

export interface PortfolioRepository {
  getPortfolio(org: OrgRef): Promise<PortfolioSnapshot>;
  /**
   * Record what a scan saw at one center. The first customers are served
   * by a person reading a directory and entering it here, which is why
   * this takes suite statuses rather than a crawler payload.
   */
  recordObservation(input: {
    org: OrgRef;
    centerId: string;
    observedOn: string;
    method: "manual" | "directory_crawl" | "places_api" | "import";
    statuses: { suiteId: string; status: string }[];
    performedBy?: string;
  }): Promise<{ scanId: string; changed: number }>;
  /** Confirm that a lease's wording refers to a particular store. */
  confirmTenantMatch(input: {
    org: OrgRef;
    leaseName: string;
    suiteId: string;
    confirmedBy?: string;
  }): Promise<void>;
}

/* ------------------------------------------------------------------
   adapter: the imported sample, for as long as there is one client
   ------------------------------------------------------------------ */

const DEMO_ORG_ID = "af-pilot";

class StaticPortfolioRepository implements PortfolioRepository {
  async getPortfolio(): Promise<PortfolioSnapshot> {
    return {
      org: { id: DEMO_ORG_ID, ...demoOrg },
      asOf: TODAY,
      timeline: TIMELINE,
      source: DATA_SOURCE,
      rows: demoRows,
      pendingMatches: demoPendingMatches,
    };
  }

  async recordObservation(): Promise<{ scanId: string; changed: number }> {
    /* Writes need somewhere to write to. Kept explicit rather than
       silently succeeding, so the first caller fails loudly instead of
       appearing to save and losing the entry. */
    throw new Error(
      "recordObservation requires the database adapter. See db/001_initial.sql.",
    );
  }

  async confirmTenantMatch(): Promise<void> {
    throw new Error(
      "confirmTenantMatch requires the database adapter. See db/001_initial.sql.",
    );
  }
}

/**
 * The single place that decides where data comes from. When the Postgres
 * adapter lands, this is the line that changes.
 */
export const repo: PortfolioRepository = new StaticPortfolioRepository();

/** The org a request belongs to. Real sessions replace this. */
export function currentOrg(): OrgRef {
  return { id: DEMO_ORG_ID, slug: "abercrombie-fitch" };
}

/**
 * ============================================================
 * THE PORTFOLIO
 * ============================================================
 *
 * Abercrombie & Fitch across twenty centers, from the dataset our
 * co-tenancy partner supplied: real malls, real published tenant
 * directories, real landlords, with synthetic occupancy, clauses and
 * sales layered on top. It is a sample of exactly what arrives when a
 * client is onboarded, which is why it replaced the invented portfolio
 * that used to live here.
 *
 * Regenerate with:
 *   node --experimental-strip-types scripts/af-import.ts
 *
 * Two properties of the source shape the product:
 *
 * 1. The full tenant roster of each center is present, because a mall
 *    publishes its directory. A tenant does not need the landlord's
 *    rent roll to know who trades there. Occupancy is therefore
 *    computable from data we can actually obtain, which is a stronger
 *    position than we previously assumed. What a directory will not
 *    tell you is leased-but-dark, or exact leasable area, so the
 *    reporting rights in the clause still matter.
 *
 * 2. Status is monthly across twenty-four months. Monitoring is a time
 *    series per store, not a snapshot.
 */

import {
  type CenterFacts,
  type Clause,
  type ClaimStatus,
  type Evidence,
  type LeaseEconomics,
  clauseInForce,
  evaluateClause,
} from "./clause";
import type { PendingMatch } from "./matching";
import raw from "./data/af-portfolio.json";

/* ------------------------------------------------------------------
   types
   ------------------------------------------------------------------ */

export type MonthPoint = {
  month: string;
  inline: number;
  total: number;
  zone: number;
  closed: number;
};

export type Location = {
  id: string;
  storeNumber: string;
  unit: string;
  region: string;
  center: CenterFacts;
  econ: LeaseEconomics;
  /** Every version of the co-tenancy provision, oldest first. */
  clauses: Clause[];
  claim: ClaimStatus;
  evidence: Evidence[];
  /** "unknown" when the client's own store could not be resolved in the
      center directory. Not the same as trading. */
  ownStatus: "open" | "dark" | "remodeling" | "unknown";
  monthlySeries: MonthPoint[];
};

const file = raw as unknown as {
  today: string;
  timeline: string[];
  source: string;
  locations: Location[];
  pendingMatches: PendingMatch[];
};

/** The evaluation date: mid-month of the last period in the series. */
export const TODAY = file.today;
export const TIMELINE = file.timeline;
export const DATA_SOURCE = file.source;

export const portfolio: Location[] = file.locations;

/**
 * Tenant names in the leases that the center directories do not carry
 * under that exact wording. Each one is a decision for a person, and
 * until it is made the tests that depend on it are reported as not
 * computable rather than scored on a guess. See lib/matching.ts.
 */
export const pendingMatches: PendingMatch[] = file.pendingMatches ?? [];

export const org = {
  name: "Abercrombie & Fitch",
  descriptor: "Specialty apparel",
  totalDoors: portfolio.length,
  watched: portfolio.length,
  contractStart: `${file.timeline[0]}-01`,
  plan: "Portfolio",
  team: [
    { name: "D. Okonkwo", role: "VP, Real Estate", initials: "DO" },
    { name: "R. Alvarez", role: "Director, Lease Administration", initials: "RA" },
    { name: "S. Pratt", role: "Associate General Counsel", initials: "SP" },
  ],
};

/* ------------------------------------------------------------------
   evaluation
   ------------------------------------------------------------------ */

/** The version governing today. Undated clauses count as in force. */
export function activeClause(loc: Location): Clause {
  return clauseInForce(loc.clauses, TODAY) ?? loc.clauses[0];
}

export function evaluationFor(loc: Location) {
  return evaluateClause(activeClause(loc), loc.center, loc.econ, loc.claim, TODAY);
}

/** A location with the clause in force today already resolved. */
export type Row = Location & {
  clause: Clause;
  evaluation: ReturnType<typeof evaluateClause>;
};

export const rows: Row[] = portfolio.map((l) => ({
  ...l,
  clause: activeClause(l),
  evaluation: evaluationFor(l),
}));

export function rowById(id: string) {
  return rows.find((r) => r.id === id);
}

/* ------------------------------------------------------------------
   derived views
   ------------------------------------------------------------------ */

export const summary = (() => {
  const byState = new Map<string, number>();
  let atRiskAnnual = 0;
  let activeMonthly = 0;
  let potentialMissed = 0;
  let cumulativeAtRisk = 0;
  let watchCount = 0;

  for (const r of rows) {
    byState.set(r.evaluation.state, (byState.get(r.evaluation.state) ?? 0) + 1);
    const d = r.evaluation.monthlyDelta ?? 0;
    if (r.evaluation.state === "claimable" || r.evaluation.state === "election_open") {
      atRiskAnnual += d * 12;
      potentialMissed += r.evaluation.potentialMissed ?? 0;
    }
    /*
     * What the remedies have been worth so far, month by month on each
     * month's own sales. This replaced annualizing the current month:
     * these stores swing hard enough seasonally that one month times
     * twelve was off by a factor, in either direction depending on when
     * you looked.
     */
    if (r.evaluation.state !== "compliant" && r.evaluation.state !== "watch") {
      cumulativeAtRisk += r.evaluation.cumulativeAtRisk ?? 0;
    }
    if (r.evaluation.state === "remedy_active") activeMonthly += d;
    if (r.evaluation.state === "watch" || r.evaluation.state === "curing") watchCount += 1;
  }

  return {
    byState,
    atRiskAnnual,
    activeMonthly,
    activeAnnual: activeMonthly * 12,
    potentialMissed,
    cumulativeAtRisk,
    watchCount,
    centers: new Set(rows.map((r) => r.center.name)).size,
    states: new Set(rows.map((r) => r.center.state)).size,
  };
})();

/** Every observation across the portfolio, newest first. */
export const signalFeed = rows
  .flatMap((r) =>
    r.evidence.map((e) => ({
      ...e,
      locationId: r.id,
      centerName: r.center.name,
      city: `${r.center.city}, ${r.center.state}`,
      unitName: r.center.suites.find((s) => s.id === e.unitId)?.name ?? e.unitId,
      state: r.evaluation.state,
    })),
  )
  .sort((a, b) => (a.observedAt < b.observedAt ? 1 : -1));

/** Portfolio-wide occupancy by month, for the monitoring history. */
export const portfolioSeries: { month: string; changed: number }[] =
  file.timeline.map((month, i) => {
    let changed = 0;
    for (const l of portfolio) {
      const prev = l.monthlySeries[i - 1];
      const cur = l.monthlySeries[i];
      if (prev && cur && cur.closed !== prev.closed) changed += Math.abs(cur.closed - prev.closed);
    }
    return { month, changed };
  });

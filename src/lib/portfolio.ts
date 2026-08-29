/**
 * ============================================================
 * THE PORTFOLIO
 * ============================================================
 *
 * One portfolio bundle per client org: same math, same shapes,
 * different data. `buildPortfolio` is the factory; the module-level
 * exports below are the Abercrombie & Fitch instance, kept intact so
 * every existing consumer works unchanged. New, org-aware consumers
 * resolve a bundle through lib/portfolios.ts by org slug — that module
 * is server-only, so a client bundle never carries another org's data.
 *
 * The A&F sample comes from the partner-supplied dataset: real malls,
 * real published tenant directories, real landlords, with synthetic
 * occupancy, clauses and sales layered on top. Regenerate with:
 *   node --experimental-strip-types scripts/af-import.ts
 *
 * Two properties of the source shape the product:
 *
 * 1. The full tenant roster of each center is present, because a mall
 *    publishes its directory. A tenant does not need the landlord's
 *    rent roll to know who trades there. Occupancy is therefore
 *    computable from data we can actually obtain. What a directory
 *    will not tell you is leased-but-dark, or exact leasable area, so
 *    the reporting rights in the clause still matter.
 *
 * 2. Status is monthly across the timeline. Monitoring is a time
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

export type PortfolioFile = {
  today: string;
  timeline: string[];
  source: string;
  locations: Location[];
  pendingMatches: PendingMatch[];
};

export type OrgMeta = {
  name: string;
  slug: string;
  descriptor: string;
  team: { name: string; role: string; initials: string }[];
};

/** A location with the clause in force today already resolved. */
export type Row = Location & {
  clause: Clause;
  evaluation: ReturnType<typeof evaluateClause>;
};

/* ------------------------------------------------------------------
   the factory
   ------------------------------------------------------------------ */

export function buildPortfolio(fileIn: PortfolioFile, meta: OrgMeta) {
  const TODAY = fileIn.today;
  const TIMELINE = fileIn.timeline;
  const DATA_SOURCE = fileIn.source;
  const portfolio: Location[] = fileIn.locations;
  const pendingMatches: PendingMatch[] = fileIn.pendingMatches ?? [];

  const org = {
    ...meta,
    totalDoors: portfolio.length,
    watched: portfolio.length,
    contractStart: `${fileIn.timeline[0]}-01`,
    plan: "Portfolio",
  };

  /** The version governing today. Undated clauses count as in force. */
  const activeClause = (loc: Location): Clause =>
    clauseInForce(loc.clauses, TODAY) ?? loc.clauses[0];

  const evaluationFor = (loc: Location) =>
    evaluateClause(activeClause(loc), loc.center, loc.econ, loc.claim, TODAY);

  const rows: Row[] = portfolio.map((l) => ({
    ...l,
    clause: activeClause(l),
    evaluation: evaluationFor(l),
  }));

  const rowById = (id: string) => rows.find((r) => r.id === id);

  const summary = (() => {
    const byState = new Map<string, number>();
    let atRiskAnnual = 0;
    let activeMonthly = 0;
    let potentialMissed = 0;
    let cumulativeAtRisk = 0;
    let watchCount = 0;

    for (const r of rows) {
      byState.set(r.evaluation.state, (byState.get(r.evaluation.state) ?? 0) + 1);
      const d = r.evaluation.monthlyDelta ?? 0;
      if (
        r.evaluation.state === "claimable" ||
        r.evaluation.state === "election_open"
      ) {
        atRiskAnnual += d * 12;
        potentialMissed += r.evaluation.potentialMissed ?? 0;
      }
      /*
       * Cumulative on each month's own sales, never annualized: these
       * stores swing hard enough seasonally that one month times twelve
       * was off by a factor, in either direction.
       */
      if (r.evaluation.state !== "compliant" && r.evaluation.state !== "watch") {
        cumulativeAtRisk += r.evaluation.cumulativeAtRisk ?? 0;
      }
      if (r.evaluation.state === "remedy_active") activeMonthly += d;
      if (r.evaluation.state === "watch" || r.evaluation.state === "curing")
        watchCount += 1;
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
  const signalFeed = rows
    .flatMap((r) =>
      r.evidence.map((e) => ({
        ...e,
        locationId: r.id,
        centerName: r.center.name,
        city: `${r.center.city}, ${r.center.state}`,
        unitName:
          r.center.suites.find((s) => s.id === e.unitId)?.name ?? e.unitId,
        state: r.evaluation.state,
      })),
    )
    .sort((a, b) => (a.observedAt < b.observedAt ? 1 : -1));

  /** Portfolio-wide change count by month, for the monitoring history. */
  const portfolioSeries: { month: string; changed: number }[] =
    fileIn.timeline.map((month, i) => {
      let changed = 0;
      for (const l of portfolio) {
        const prev = l.monthlySeries[i - 1];
        const cur = l.monthlySeries[i];
        if (prev && cur && cur.closed !== prev.closed)
          changed += Math.abs(cur.closed - prev.closed);
      }
      return { month, changed };
    });

  return {
    TODAY,
    TIMELINE,
    DATA_SOURCE,
    portfolio,
    pendingMatches,
    org,
    activeClause,
    evaluationFor,
    rows,
    rowById,
    summary,
    signalFeed,
    portfolioSeries,
  };
}

export type PortfolioBundle = ReturnType<typeof buildPortfolio>;

/* ------------------------------------------------------------------
   the A&F instance — the module-level exports every existing consumer
   already speaks
   ------------------------------------------------------------------ */

export const afBundle = buildPortfolio(raw as unknown as PortfolioFile, {
  name: "Abercrombie & Fitch",
  /* Must match the org registry slug: it keys every org-scoped
     database row and the client board's URL. */
  slug: "abercrombie-fitch",
  descriptor: "Specialty apparel",
  team: [
    { name: "D. Okonkwo", role: "VP, Real Estate", initials: "DO" },
    { name: "S. Aggarwal", role: "Director, Lease Administration", initials: "SA" },
    { name: "S. Pratt", role: "Associate General Counsel", initials: "SP" },
  ],
});

export const TODAY = afBundle.TODAY;
export const TIMELINE = afBundle.TIMELINE;
export const DATA_SOURCE = afBundle.DATA_SOURCE;
export const portfolio = afBundle.portfolio;
export const pendingMatches = afBundle.pendingMatches;
export const org = afBundle.org;
export const rows = afBundle.rows;
export const summary = afBundle.summary;
export const signalFeed = afBundle.signalFeed;
export const portfolioSeries = afBundle.portfolioSeries;

export function activeClause(loc: Location): Clause {
  return afBundle.activeClause(loc);
}
export function evaluationFor(loc: Location) {
  return afBundle.evaluationFor(loc);
}
export function rowById(id: string) {
  return afBundle.rowById(id);
}

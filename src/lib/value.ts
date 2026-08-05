/**
 * VALUE REALIZED, and FORWARD RISK.
 *
 * Two questions a real estate VP has to answer to their CFO at
 * renewal, neither of which any lease administration system answers
 * today:
 *
 *   "What did this find us?"   -> the ledger below
 *   "What is coming?"          -> the rollover model below
 *
 * The ledger is deliberately conservative and split into identified,
 * secured, and at risk of lapsing. Nothing here is presented as money
 * owed. Identified is an estimate of co-tenancy rent a verified condition makes
 * available. Secured is relief actually running under a served notice.
 * Lapsing is value that disappears if an election window closes.
 */

import { monthsBetween } from "./clause";
import { TODAY, org, rows, type Row } from "./portfolio";

/* ------------------------------------------------------------------
   commercial terms
   ------------------------------------------------------------------ */

/**
 * Illustrative contract. Per watched door with a floor, which is the
 * shape this should actually be sold in: a flat fee underprices the
 * large portfolios that cost the most to serve.
 */
export const contract = {
  perDoorAnnual: 340,
  floorAnnual: 14_000,
  get annualFee() {
    return Math.max(this.floorAnnual, this.perDoorAnnual * org.watched);
  },
  startedOn: org.contractStart,
} as const;

/* ------------------------------------------------------------------
   the ledger
   ------------------------------------------------------------------ */

export type Ledger = {
  annualFee: number;
  monthsElapsed: number;
  feeToDate: number;

  /** Relief a verified failing condition currently makes available. */
  identifiedAnnual: number;
  identifiedCount: number;

  /** Relief actually running under a served notice. */
  securedMonthly: number;
  securedToDate: number;
  securedCount: number;

  /** Value that disappears if an election window closes unexercised. */
  lapsingValue: number;
  lapsingCount: number;
  soonestLapseDays: number | null;

  /** Relief in months that elapsed before notice could be served. */
  detectionGap: number;

  /** Secured plus identified, against fee. */
  multiple: number;

  /* the quiet-year receipt */
  sweeps: number;
  storefrontsConfirmed: number;
  clauseTestsEvaluated: number;
  centersSurveyed: number;
};

export function buildLedger(data: Row[] = rows): Ledger {
  const monthsElapsed = Math.max(
    1,
    monthsBetween(new Date(contract.startedOn), new Date(TODAY)),
  );

  let identifiedAnnual = 0;
  let identifiedCount = 0;
  let securedMonthly = 0;
  let securedToDate = 0;
  let securedCount = 0;
  let lapsingValue = 0;
  let lapsingCount = 0;
  let soonestLapseDays: number | null = null;
  let detectionGap = 0;
  let storefrontsConfirmed = 0;
  let clauseTestsEvaluated = 0;

  // One sweep per week since the contract began.
  const sweeps = Math.round((monthsElapsed * 30.44) / 7);

  for (const r of data) {
    const ev = r.evaluation;

    /*
     * Only the tenants a clause actually depends on. Those are the
     * stores we can name from the lease and verify in the field.
     * Counting every open suite in every center would claim coverage
     * we do not have, and this figure goes in front of a CFO.
     */
    const named = new Set<string>();
    for (const t of r.clause.triggers) {
      if (t.kind === "named_tenant") t.names.forEach((n) => named.add(n));
      else if (t.kind === "tenant_count") t.pool.forEach((n) => named.add(n));
    }
    storefrontsConfirmed += [...named].filter(
      (id) => r.center.suites.find((s) => s.id === id)?.status === "open",
    ).length;
    clauseTestsEvaluated += ev.triggers.length * sweeps;

    const monthly = ev.monthlyDelta ?? 0;

    if (ev.state === "claimable") {
      identifiedAnnual += monthly * 12;
      identifiedCount += 1;
    }

    if (ev.state === "remedy_active") {
      securedMonthly += monthly;
      securedCount += 1;
      if (r.claim.noticeServedAt) {
        const running = Math.max(
          0,
          monthsBetween(new Date(r.claim.noticeServedAt), new Date(TODAY)),
        );
        securedToDate += monthly * running;
      }
    }

    if (ev.state === "election_open") {
      lapsingValue += monthly * 12;
      lapsingCount += 1;
      if (
        ev.daysUntilElection != null &&
        (soonestLapseDays == null || ev.daysUntilElection < soonestLapseDays)
      ) {
        soonestLapseDays = ev.daysUntilElection;
      }
    }

    detectionGap += ev.potentialMissed ?? 0;
  }

  const feeToDate = (contract.annualFee / 12) * monthsElapsed;
  const realized = securedToDate + identifiedAnnual;

  return {
    annualFee: contract.annualFee,
    monthsElapsed,
    feeToDate,
    identifiedAnnual,
    identifiedCount,
    securedMonthly,
    securedToDate,
    securedCount,
    lapsingValue,
    lapsingCount,
    soonestLapseDays,
    detectionGap,
    multiple: feeToDate > 0 ? realized / feeToDate : 0,
    sweeps,
    storefrontsConfirmed,
    clauseTestsEvaluated,
    centersSurveyed: new Set(data.map((r) => r.center.name)).size,
  };
}

export const ledger = buildLedger();

/* ------------------------------------------------------------------
   forward risk: anchors rolling inside the window
   ------------------------------------------------------------------ */

export type RolloverRisk = {
  operator: string;
  /** Soonest expiry across the centers where this operator is named. */
  soonestExpiry: string;
  daysToSoonest: number;
  /** Locations whose clause names this operator or counts it in a pool. */
  namedInLeases: number;
  centers: string[];
  /** Monthly relief that would become available if it did not renew. */
  monthlyAtStake: number;
  /** True where losing this one operator alone would trip a test. */
  singlePointOfFailure: boolean;
};

const WINDOW_DAYS = 730;

export function rolloverRisks(data: Row[] = rows): RolloverRisk[] {
  const today = new Date(TODAY);
  const byOperator = new Map<
    string,
    {
      soonest: string;
      leases: number;
      centers: Set<string>;
      monthly: number;
      spof: boolean;
    }
  >();

  for (const r of data) {
    // Which suites does this lease's clause actually depend on?
    const dependsOn = new Set<string>();
    let headroom = Infinity;

    for (const t of r.clause.triggers) {
      if (t.kind === "named_tenant") {
        t.names.forEach((n) => dependsOn.add(n));
        headroom = 0;
      } else if (t.kind === "tenant_count") {
        t.pool.forEach((n) => dependsOn.add(n));
        const open = t.pool
          .map((id) => r.center.suites.find((s) => s.id === id))
          .filter((s) => s && s.status === "open").length;
        headroom = Math.min(headroom, open - t.requiredCount);
      }
    }

    for (const id of dependsOn) {
      const suite = r.center.suites.find((s) => s.id === id);
      if (!suite || suite.status !== "open" || !suite.leaseExpiry) continue;

      const days = Math.floor(
        (new Date(suite.leaseExpiry).getTime() - today.getTime()) / 86_400_000,
      );
      if (days < 0 || days > WINDOW_DAYS) continue;

      const entry = byOperator.get(suite.name) ?? {
        soonest: suite.leaseExpiry,
        leases: 0,
        centers: new Set<string>(),
        monthly: 0,
        spof: false,
      };

      if (suite.leaseExpiry < entry.soonest) entry.soonest = suite.leaseExpiry;
      entry.leases += 1;
      entry.centers.add(r.center.name);
      entry.monthly += r.evaluation.monthlyDelta ?? 0;
      if (headroom <= 0) entry.spof = true;

      byOperator.set(suite.name, entry);
    }
  }

  return [...byOperator.entries()]
    .map(([operator, e]) => ({
      operator,
      soonestExpiry: e.soonest,
      daysToSoonest: Math.floor(
        (new Date(e.soonest).getTime() - today.getTime()) / 86_400_000,
      ),
      namedInLeases: e.leases,
      centers: [...e.centers],
      monthlyAtStake: e.monthly,
      singlePointOfFailure: e.spof,
    }))
    .sort(
      (a, b) =>
        Number(b.singlePointOfFailure) - Number(a.singlePointOfFailure) ||
        a.daysToSoonest - b.daysToSoonest,
    );
}

export const rollovers = rolloverRisks();

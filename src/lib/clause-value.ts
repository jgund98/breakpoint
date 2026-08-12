/**
 * ============================================================
 * WHAT EACH CLAUSE IS ACTUALLY WORTH
 * ============================================================
 *
 * Monitoring answers "has it tripped". This answers the question a real
 * estate team asks at renewal, which is "if it trips, does it pay, and
 * should I be signing this language again".
 *
 * Two findings out of the pilot portfolio drive it, and both are
 * counter-intuitive enough that nobody prices them at signing:
 *
 * 1. A clause whose limbs must ALL fail before the requirement fails is
 *    close to unenforceable. Across twenty-four months of this
 *    portfolio the conjunctive ones never once produced a remedy, and
 *    that includes centers whose occupancy fell below the threshold and
 *    whose anchors went dark. They just never did both at the same
 *    time.
 *
 * 2. A percentage-of-sales remedy is worth nothing to a store that
 *    sells well. "The lesser of minimum rent or 5% of gross sales" only
 *    reduces rent while 5% of sales is under the rent. Above that the
 *    clause fires and the tenant pays exactly what it paid before. An
 *    abatement has no such ceiling.
 *
 * Everything here is computed from the portfolio and the clause terms.
 * Nothing is benchmarked against outside data we do not hold.
 */

import {
  type Clause,
  type LeaseEconomics,
  altRentMonthly,
  baseRentMonthly,
} from "./clause";
import { rows, type Row } from "./portfolio";

/* ------------------------------------------------------------------
   would the remedy pay
   ------------------------------------------------------------------ */

export type PayoutVerdict = "pays" | "no_saving" | "not_computable";

export type ClauseValue = {
  row: Row;
  /** Fixed rent per month under the lease. */
  baseMonthly: number;
  /** What the tenant would pay if the remedy ran today. */
  remedyMonthly: number | null;
  /** The monthly difference, floored at zero. */
  savingMonthly: number | null;
  verdict: PayoutVerdict;
  /** True where every limb must fail before the requirement fails. */
  conjunctiveTrigger: boolean;
  /** Plain reason, for the reader rather than the engine. */
  reason: string;
};

/**
 * A requirement written as a disjunction fails only when every limb
 * fails. That is the landlord-favorable form, and it is the single
 * strongest predictor in this portfolio of a clause that never pays.
 */
function triggerShape(clause: Clause): "single" | "conjunctive" | "disjunctive" {
  const l = clause.logic;
  if (!l || l.kind !== "group" || l.children.length < 2) return "single";
  /* A requirement written as a disjunction fails only once every limb
     fails, which is the landlord-favorable form. */
  return l.op === "or" ? "conjunctive" : "disjunctive";
}

function isConjunctiveTrigger(clause: Clause): boolean {
  return triggerShape(clause) === "conjunctive";
}

function valueOf(row: Row): ClauseValue {
  const clause = row.clause;
  const econ: LeaseEconomics = row.econ;
  const base = baseRentMonthly(econ);
  const conjunctive = isConjunctiveTrigger(clause);

  const r = clause.remedy;
  let remedy: number | null = null;

  if (r.altRent) remedy = altRentMonthly(econ, r.altRent);
  else if (r.abatementPct != null) remedy = base * (1 - r.abatementPct / 100);

  const saving = remedy == null ? null : Math.max(0, base - remedy);

  const verdict: PayoutVerdict =
    saving == null ? "not_computable" : saving > 0 ? "pays" : "no_saving";

  const reason =
    verdict === "not_computable"
      ? "This remedy defers the opening rather than reducing rent."
      : verdict === "no_saving"
        ? `${r.altRent?.pctOfGrossSales}% of this store's reported sales is above its fixed rent, so the remedy reduces nothing at current volume.`
        : r.abatementPct != null
          ? `Abatement of ${r.abatementPct}% applies to fixed rent and does not move with sales.`
          : `${r.altRent?.pctOfGrossSales}% of reported sales sits below fixed rent, so the remedy reduces the monthly bill.`;

  return {
    row,
    baseMonthly: base,
    remedyMonthly: remedy,
    savingMonthly: saving,
    verdict,
    conjunctiveTrigger: conjunctive,
    reason,
  };
}

export const clauseValues: ClauseValue[] = rows
  .map(valueOf)
  .sort((a, b) => (b.savingMonthly ?? -1) - (a.savingMonthly ?? -1));

/* ------------------------------------------------------------------
   how each structure has performed
   ------------------------------------------------------------------ */

export type StructureRow = {
  key: string;
  label: string;
  description: string;
  centers: number;
  everTriggered: number;
  toDate: number;
};

/** Has this location's right actually arisen at any point we hold? */
function hasTriggered(r: Row) {
  return (
    r.evaluation.state === "claimable" ||
    r.evaluation.state === "remedy_active" ||
    r.evaluation.state === "election_open" ||
    r.evaluation.state === "lapsed" ||
    (r.evaluation.cumulativeAtRisk ?? 0) > 0
  );
}

export const byStructure: StructureRow[] = (() => {
  const groups: Record<string, StructureRow> = {
    disjunctive: {
      key: "disjunctive",
      label: "Any limb fails",
      description: "One failing test is enough to fail the requirement.",
      centers: 0,
      everTriggered: 0,
      toDate: 0,
    },
    conjunctive: {
      key: "conjunctive",
      label: "Every limb must fail",
      description: "The requirement holds while any single test still passes.",
      centers: 0,
      everTriggered: 0,
      toDate: 0,
    },
    single: {
      key: "single",
      label: "Single test",
      description: "One condition, nothing to combine.",
      centers: 0,
      everTriggered: 0,
      toDate: 0,
    },
  };

  for (const r of rows) {
    const k = triggerShape(r.clause);
    groups[k].centers += 1;
    if (hasTriggered(r)) groups[k].everTriggered += 1;
    groups[k].toDate += r.evaluation.cumulativeAtRisk ?? 0;
  }

  return Object.values(groups).filter((g) => g.centers > 0);
})();

/* ------------------------------------------------------------------
   how each remedy type has performed
   ------------------------------------------------------------------ */

export type RemedyRow = {
  kind: string;
  label: string;
  centers: number;
  paying: number;
  toDate: number;
};

const REMEDY_LABEL: Record<string, string> = {
  abatement: "Abatement of fixed rent",
  alternative_rent: "Percentage of gross sales",
  sequenced: "Percentage, then termination",
  opening: "Deferred opening",
};

export const byRemedy: RemedyRow[] = (() => {
  const m = new Map<string, RemedyRow>();
  for (const v of clauseValues) {
    const kind =
      v.row.clause.type === "opening" ? "opening" : v.row.clause.remedy.kind;
    const e =
      m.get(kind) ??
      ({
        kind,
        label: REMEDY_LABEL[kind] ?? kind,
        centers: 0,
        paying: 0,
        toDate: 0,
      } as RemedyRow);
    e.centers += 1;
    if (v.verdict === "pays") e.paying += 1;
    e.toDate += v.row.evaluation.cumulativeAtRisk ?? 0;
    m.set(kind, e);
  }
  return [...m.values()].sort((a, b) => b.toDate - a.toDate);
})();

/* ------------------------------------------------------------------
   what to raise at renewal
   ------------------------------------------------------------------ */

export type RenewalPoint = { issue: string; ask: string };

export type RenewalFlag = {
  row: Row;
  /** Annual fixed rent, which is what makes one worth raising first. */
  annualRent: number;
  points: RenewalPoint[];
};

/**
 * A location is worth raising when the language, not the center, is
 * what stands between the tenant and a remedy.
 *
 * Grouped by location. A clause can be weak in more than one way at
 * once, and listing the same center twice makes a fourteen-line list
 * read as if the portfolio had twice the problems it has.
 */
export const renewalFlags: RenewalFlag[] = clauseValues
  .map((v): RenewalFlag => {
    const points: RenewalPoint[] = [];
    if (v.conjunctiveTrigger)
      points.push({
        issue: "Every limb must fail before the requirement does",
        ask: "Rewrite the trigger so either test failing is enough.",
      });
    if (v.verdict === "no_saving")
      points.push({
        issue: "The remedy reduces nothing at this store's sales",
        ask: "Ask for an abatement of fixed rent instead of a percentage of sales.",
      });
    return {
      row: v.row,
      annualRent: v.row.econ.gla * v.row.econ.rentPsf,
      points,
    };
  })
  .filter((f) => f.points.length > 0)
  .sort((a, b) => b.annualRent - a.annualRent);

export const valueSummary = {
  centers: rows.length,
  paying: clauseValues.filter((v) => v.verdict === "pays").length,
  noSaving: clauseValues.filter((v) => v.verdict === "no_saving").length,
  conjunctive: clauseValues.filter((v) => v.conjunctiveTrigger).length,
  conjunctiveTriggered: clauseValues.filter(
    (v) => v.conjunctiveTrigger && hasTriggered(v.row),
  ).length,
  toDate: rows.reduce((s, r) => s + (r.evaluation.cumulativeAtRisk ?? 0), 0),
};

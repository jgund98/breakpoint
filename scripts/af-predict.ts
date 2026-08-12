/**
 * BLIND RUN AGAINST THE AF PORTFOLIO TEST SET.
 *
 *   node --experimental-strip-types scripts/af-predict.ts [dataset.json]
 *
 * Loads the partner's synthetic portfolio, adapts each mall into our
 * engine's types, evaluates every month of the 24-month timeline, and
 * writes our answers to shots/af-predictions.json.
 *
 * The answer key is deliberately not read here and has not been read at
 * all. A held-out set is only worth something once: if the engine is
 * tuned against answers someone has already seen, the score measures
 * nothing. Produce predictions first, score second, diagnose third.
 *
 * It also cross-checks our own occupancy arithmetic against the
 * percentages the dataset computed independently. If those disagree the
 * engine is wrong before any clause logic is even considered.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import {
  type CenterFacts,
  type Clause,
  type Suite,
  type Trigger,
  type TriggerNode,
  evaluateClause,
} from "../src/lib/clause.ts";

/* ------------------------------------------------------------------
   their shape
   ------------------------------------------------------------------ */

type Limb =
  | { id: string; type: "named"; name: string }
  | { id: string; type: "count"; required: number; pool: string[] }
  | { id: string; type: "pct"; threshold: number; basis: string };

type Mall = {
  mall: string;
  city: string;
  state: string;
  landlord: string;
  tier: string;
  clause: {
    template: string;
    limbs: Limb[];
    combine: "OR" | "AND" | "ANY" | "AND_OPEN";
    duration_m: number;
    notice_driven: boolean;
    remedy: {
      type: string;
      alt: string | null;
      alt_pct: number | null;
      cap_m: number | null;
      post_cap: string | null;
    };
    info_right: string | null;
  };
  roster: { store: string; category: string; gla: number; anchor: boolean; zone: boolean }[];
  months: {
    month: string;
    inline_open_pct: number;
    inline_open_pct_deemed: number;
    total_open_pct: number;
    zone_open_pct: number;
    closed_stores: string[];
    n_open: number;
    n_total: number;
  }[];
  af_store: { gla: number; fmr_psf: number; annual_fmr: number; monthly_sales_k: number[] };
};

const path = process.argv[2] ?? "C:/Users/Lucky/Desktop/af_portfolio_dataset (1).json";
const data = JSON.parse(readFileSync(path, "utf8")) as {
  timeline: string[];
  malls: Record<string, Mall>;
};

/* ------------------------------------------------------------------
   ASSUMPTION, stated loudly because getting it backwards inverts
   every answer in the file.
   ------------------------------------------------------------------

   `combine` describes how the limbs produce a FAILURE. We model the
   REQUIREMENT, so the operators invert:

     OR   failure if any limb fails      -> requirement = AND
     ANY  same                           -> requirement = AND
     AND  failure only if all fail       -> requirement = OR
     AND_OPEN  all must hold to open     -> requirement = AND

   If the partner intended `combine` to describe the requirement rather
   than the failure, AND and OR swap and the predictions for those
   malls flip. Flagged in the output so it can be checked before
   scoring rather than argued about after.
*/
function requirementOp(combine: Mall["clause"]["combine"]): "and" | "or" {
  return combine === "AND" ? "or" : "and";
}

const BASIS_FIELD: Record<string, keyof Mall["months"][number]> = {
  total: "total_open_pct",
  inline: "inline_open_pct",
  zone: "zone_open_pct",
};

/* ------------------------------------------------------------------
   adapt
   ------------------------------------------------------------------ */

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

function buildSuites(m: Mall, monthIdx: number): Suite[] {
  const closed = new Set(m.months[monthIdx].closed_stores);
  return m.roster.map((r) => ({
    id: slug(r.store),
    name: r.store,
    gla: r.gla,
    status: closed.has(r.store) ? ("dark" as const) : ("open" as const),
    kind: r.anchor ? ("anchor" as const) : ("inline" as const),
  }));
}

function buildClause(m: Mall): { clause: Clause; pctBases: Record<string, string> } {
  const triggers: Trigger[] = [];
  const pctBases: Record<string, string> = {};

  for (const l of m.clause.limbs) {
    if (l.type === "named") {
      triggers.push({
        id: l.id,
        kind: "named_tenant",
        cite: l.id,
        names: [slug(l.name)],
        replacementStandard: { kind: "named_only", text: "per template" },
        deemedOpen: [],
      });
    } else if (l.type === "count") {
      triggers.push({
        id: l.id,
        kind: "tenant_count",
        cite: l.id,
        requiredCount: l.required,
        pool: l.pool.map(slug),
        poolLabel: "Named",
        replacementStandard: { kind: "named_only", text: "per template" },
        deemedOpen: [],
      });
    } else {
      pctBases[l.id] = l.basis;
      triggers.push({
        id: l.id,
        kind: "occupancy_pct",
        cite: l.id,
        thresholdPct: l.threshold,
        basis: "open_and_operating",
        areaBasis: l.basis === "inline" ? "inline_gla" : l.basis === "zone" ? "defined_area" : "total_gla",
        exclusions: l.basis === "inline" ? ["anchor"] : [],
        deemedOpen: [],
      });
    }
  }

  const logic: TriggerNode = {
    kind: "group",
    op: requirementOp(m.clause.combine),
    children: triggers.map((t) => ({ kind: "test", triggerId: t.id }) as const),
  };

  const r = m.clause.remedy;

  const clause: Clause = {
    id: slug(m.mall),
    type: r.type === "deferred_opening" ? "opening" : "operating",
    locations: [m.clause.template],
    sourceText: m.clause.template,
    triggers,
    triggerLogic: "any",
    logic,
    remedy: {
      kind:
        r.type === "abatement"
          ? "abatement"
          : r.type === "alternative_rent"
            ? "alternative_rent"
            : "sequenced",
      // Their durations are months; ours are days.
      cureDays: m.clause.duration_m * 30,
      cureBasis: "consecutive",
      clockStartsAt: m.clause.notice_driven ? "tenant_notice" : "failure",
      noticeRequired: m.clause.notice_driven,
      reliefRunsFrom: m.clause.notice_driven ? "notice" : "failure",
      capMonths: r.cap_m ?? undefined,
      unamortizedReimbursement: false,
      altRent:
        r.alt_pct != null
          ? { pctOfGrossSales: r.alt_pct, selector: "lesser_of", text: r.alt ?? "" }
          : undefined,
      abatementPct: /50%/.test(r.alt ?? "") ? 50 : undefined,
    },
    preconditions: [],
    definedTerms: [],
    confidence: 1,
    ambiguityNotes: [],
    amendments: [],
  };

  return { clause, pctBases };
}

/* ------------------------------------------------------------------
   run
   ------------------------------------------------------------------ */

type Prediction = {
  mall: string;
  city: string;
  tier: string;
  template: string;
  combine: string;
  requirementOp: "and" | "or";
  firstFailMonth: string | null;
  monthsFailing: number;
  cureElapsedMonth: string | null;
  remedyStartMonth: string | null;
  monthlyCoTenancyRent: number | null;
  annualFmr: number;
  infoRight: string | null;
  /** our computed occupancy vs theirs, worst absolute gap across months */
  occupancyMaxDelta: number | null;
};

const predictions: Prediction[] = [];
let occChecks = 0;
let occMismatches = 0;

for (const key of Object.keys(data.malls)) {
  const m = data.malls[key];
  const { clause, pctBases } = buildClause(m);

  let firstFail: string | null = null;
  let monthsFailing = 0;
  let maxDelta: number | null = null;

  for (let i = 0; i < m.months.length; i++) {
    const suites = buildSuites(m, i);
    const center: CenterFacts = {
      id: key,
      name: m.mall,
      city: m.city,
      state: m.state,
      format: m.tier,
      owner: m.landlord,
      suites,
      rentRollCoverage: 1,
      rentRollAsOf: m.months[i].month + "-01",
    };

    const ev = evaluateClause(
      clause,
      center,
      {
        gla: m.af_store.gla,
        rentPsf: m.af_store.fmr_psf,
        ttmGrossSales: m.af_store.monthly_sales_k[i] * 1000 * 12,
        salesEstimated: false,
        commencement: "2020-01-01",
        expiration: "2030-01-01",
      },
      { failedPreconditions: [], firstObservedAt: firstFail ? firstFail + "-01" : undefined },
      m.months[i].month + "-15",
    );

    // cross-check our occupancy arithmetic against theirs
    for (const t of ev.triggers) {
      const basis = pctBases[t.id];
      if (!basis) continue;
      const theirs = m.months[i][BASIS_FIELD[basis]] as number;
      const ours = Number(/([\d.]+)%/.exec(t.observed)?.[1] ?? NaN);
      if (!Number.isNaN(ours) && typeof theirs === "number") {
        occChecks++;
        const delta = Math.abs(ours - theirs);
        maxDelta = maxDelta == null ? delta : Math.max(maxDelta, delta);
        if (delta > 1) occMismatches++;
      }
    }

    if (ev.anyFailing) {
      if (!firstFail) firstFail = m.months[i].month;
      monthsFailing++;
    }
  }

  const cureMonths = m.clause.duration_m;
  const firstIdx = firstFail ? m.months.findIndex((x) => x.month === firstFail) : -1;
  const cureIdx = firstIdx >= 0 ? firstIdx + cureMonths : -1;
  const monthlySales = m.af_store.monthly_sales_k;

  const monthlyFmr = m.af_store.annual_fmr / 12;
  let coTenancyRent: number | null = null;
  const r = m.clause.remedy;
  if (r.alt_pct != null && cureIdx >= 0 && cureIdx < monthlySales.length) {
    coTenancyRent = Math.round(
      monthlyFmr - Math.min(monthlyFmr, monthlySales[cureIdx] * 1000 * (r.alt_pct / 100)),
    );
  } else if (/50%/.test(r.alt ?? "")) {
    coTenancyRent = Math.round(monthlyFmr * 0.5);
  }

  predictions.push({
    mall: m.mall,
    city: `${m.city}, ${m.state}`,
    tier: m.tier,
    template: m.clause.template,
    combine: m.clause.combine,
    requirementOp: requirementOp(m.clause.combine),
    firstFailMonth: firstFail,
    monthsFailing,
    cureElapsedMonth:
      cureIdx >= 0 && cureIdx < m.months.length ? m.months[cureIdx].month : null,
    remedyStartMonth:
      cureIdx >= 0 && cureIdx < m.months.length ? m.months[cureIdx].month : null,
    monthlyCoTenancyRent: coTenancyRent,
    annualFmr: m.af_store.annual_fmr,
    infoRight: m.clause.info_right,
    occupancyMaxDelta: maxDelta,
  });
}

mkdirSync("shots", { recursive: true });
writeFileSync(
  "shots/af-predictions.json",
  JSON.stringify(
    {
      generated: "blind run, answer key not read",
      assumption:
        "combine describes how limbs produce a FAILURE, so requirement operators are inverted (OR/ANY -> requirement AND, AND -> requirement OR)",
      predictions,
    },
    null,
    2,
  ),
);

/* ------------------------------------------------------------------
   report
   ------------------------------------------------------------------ */

console.log(`\nOccupancy cross-check: ${occChecks} comparisons, ${occMismatches} off by more than a point.`);
const worst = predictions
  .filter((p) => p.occupancyMaxDelta != null)
  .sort((a, b) => (b.occupancyMaxDelta ?? 0) - (a.occupancyMaxDelta ?? 0))[0];
if (worst)
  console.log(
    `Largest gap: ${worst.occupancyMaxDelta?.toFixed(2)} points at ${worst.mall}.`,
  );

console.log(`\n${"Mall".padEnd(30)}${"Tier".padEnd(10)}${"First fail".padEnd(12)}${"Cure ends".padEnd(12)}Co-tenancy rent`);
console.log("-".repeat(86));
for (const p of predictions) {
  console.log(
    p.mall.slice(0, 28).padEnd(30) +
      p.tier.padEnd(10) +
      (p.firstFailMonth ?? "never").padEnd(12) +
      (p.cureElapsedMonth ?? "-").padEnd(12) +
      /*
       * Zero is a real answer here, not a missing one. Under "lesser of
       * minimum rent or X% of gross sales", a store selling well enough
       * that the percentage exceeds its fixed rent gets no reduction, so
       * this prints the outcome rather than a dollar sign on nothing.
       */
      (p.monthlyCoTenancyRent == null
        ? "-"
        : p.monthlyCoTenancyRent <= 0
          ? "no saving"
          : "$" + p.monthlyCoTenancyRent.toLocaleString("en-US") + "/mo"),
  );
}

const failing = predictions.filter((p) => p.firstFailMonth);
console.log(
  `\n${failing.length} of ${predictions.length} malls trip at some point in the 24 months.`,
);
console.log("Predictions written to shots/af-predictions.json\n");

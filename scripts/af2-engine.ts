/**
 * ROUND-2 REGRESSION HARNESS — adapter from the expert's 65-mall
 * dataset onto the PRODUCT timeline engine (src/lib/timeline.ts).
 *
 *   node --experimental-strip-types scripts/af2-engine.ts
 *   node --experimental-strip-types scripts/af2-score.ts shots/af2-learned.json
 *
 * The clause-law logic lives in src/lib/timeline.ts and nowhere else;
 * this file only maps the dataset's shape onto TimelineSpec/Inputs and
 * writes shots/af2-learned.json for the scorer. Certified standard:
 * 1040/1040 monthly verdicts, 65/65 end states, 26/26 triggers,
 * 26/26 notice months, 26/26 remedy starts, money within rounding of
 * the key's $7,345,600. Run both commands after ANY change to
 * src/lib/timeline.ts.
 */
import { readFileSync, writeFileSync } from "node:fs";
import {
  evaluateTimeline,
  type TimelineInputs,
  type TimelineSpec,
} from "../src/lib/timeline.ts";

const DATA = JSON.parse(
  readFileSync("C:/Users/Lucky/Desktop/af_portfolio_dataset (2).json", "utf8"),
);
const T: string[] = DATA.timeline; // 24 months, 2024-09..2026-08
const N = T.length;

const fold = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

type Limb = {
  id: string;
  type: "named" | "pct" | "count";
  name?: string;
  threshold?: number;
  basis?: "inline" | "total" | "zone";
  required?: number;
  pool?: string[];
};

const predictions: Record<string, unknown> = {};

for (const [slug, mm] of Object.entries<any>(DATA.malls)) {
  const c = mm.clause;
  const limbs: Limb[] = c.limbs;

  const closedFolded: Set<string>[] = mm.months.map(
    (mo: any) => new Set(mo.closed_stores.map((s: string) => fold(s))),
  );

  const pctSeries = (basis: string, i: number): number => {
    const mo = mm.months[i];
    if (basis === "total") return mo.total_open_pct;
    if (basis === "zone") return mo.zone_open_pct;
    return c.deemed_open_remodel
      ? mo.inline_open_pct_deemed
      : mo.inline_open_pct;
  };

  /* Bright-line raw comparison — no epsilon, ever. */
  const limbFailed = (l: Limb, i: number): boolean => {
    if (l.type === "named") return closedFolded[i].has(fold(l.name!));
    if (l.type === "pct") return pctSeries(l.basis!, i) < l.threshold!;
    const open = l.pool!.filter((p) => !closedFolded[i].has(fold(p))).length;
    return open < l.required!;
  };

  const spec: TimelineSpec = {
    combine: c.combine,
    opening: c.opening === true,
    openingSatisfiedByLease: /opening_sat|satisfied at delivery/i.test(
      c.template ?? "",
    ),
    durationMonths: c.duration_m ?? 1,
    noticeDriven: c.notice_driven === true,
    noticeLagMonths: c.tenant_notice_lag_m ?? 0,
    cureAfterNoticeMonths: c.cure_after_notice_m ?? 0,
    suspendedUntil: c.suspended_until ?? null,
    preexisting: c.preexisting === true,
    retroactive: c.retroactive === true,
    salesGate:
      c.sales_gate != null
        ? {
            declineShare: c.sales_gate,
            baselineFrom: c.sales_decline_from ?? null,
          }
        : null,
    remedy: {
      kind: c.remedy.type,
      altPctOfSales: c.remedy.alt_pct ?? null,
      abatementShare: (() => {
        if (c.remedy.type !== "abatement") return null;
        const m = /([0-9.]+)\s*%/.exec(c.remedy.alt ?? "");
        return m ? Number(m[1]) / 100 : 0.5;
      })(),
      capMonths: c.remedy.cap_m ?? null,
      postCapText: c.remedy.post_cap ?? null,
    },
  };

  const inputs: TimelineInputs = {
    months: T,
    limbFailing: limbs.map((l) => T.map((_, i) => limbFailed(l, i))),
    fmrMonthly: mm.af_store.annual_fmr / 12,
    monthlySales: mm.af_store.monthly_sales_k.map((k: number) => k * 1000),
  };

  const r = evaluateTimeline(spec, inputs);

  predictions[slug] = {
    mall: mm.mall,
    tier: mm.tier,
    template: c.template,
    combine: c.combine,
    durationM: c.duration_m,
    noticeDriven: c.notice_driven,
    noticeLagM: c.tenant_notice_lag_m ?? null,
    preexistingFailure: r.preexistingFlag,
    monthlyRequirementFailed: r.requirementFailed
      .map((f, i) => (f ? (r.clockEligible[i] ? "F" : "f") : "."))
      .join(""),
    firstObservedFail: r.firstObservedFail,
    firstClockFail: r.firstClockFail,
    trips: r.trips,
    resumptions: r.resumptions,
    opening: r.opening,
    stateAtEnd: r.stateAtEnd,
    monthlySavingAtEnd: r.monthlySavingAtEnd,
    cumulativeSavings: r.cumulativeSavings,
    postCapRight: c.remedy.post_cap ?? null,
  };
}

const out = {
  generated:
    "product timeline engine (src/lib/timeline.ts) over af_portfolio_dataset (2).json",
  timeline: `${T[0]}..${T[N - 1]}`,
  malls: Object.keys(predictions).length,
  predictions,
};
writeFileSync("shots/af2-learned.json", JSON.stringify(out, null, 1));

const states: Record<string, number> = {};
for (const p of Object.values<any>(predictions))
  states[p.stateAtEnd] = (states[p.stateAtEnd] ?? 0) + 1;
console.log("states:", states);
console.log(
  "total cumulative savings:",
  Math.round(
    Object.values<any>(predictions).reduce(
      (a, p) => a + p.cumulativeSavings,
      0,
    ),
  ).toLocaleString("en-US"),
);

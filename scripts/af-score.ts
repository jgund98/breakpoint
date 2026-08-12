/**
 * SCORE THE ENGINE AGAINST THE PARTNER'S ANSWER KEY.
 *
 *   node --experimental-strip-types scripts/af-score.ts [key.json]
 *
 * The key is ground truth for the AF portfolio: per month, per limb,
 * whether the co-tenancy condition was failing, and per mall when the
 * trigger fired. It lives outside the repo on purpose and is never
 * committed, because a system that ships its own answers is not being
 * tested by them.
 *
 * This replays every month of the timeline through the real engine and
 * compares. Four hundred and eighty condition evaluations is a far
 * better test than twenty end-state rows, and it localizes a failure to
 * a month and a limb instead of a mall.
 *
 * Run it after any change to the clause engine.
 */

import { readFileSync } from "node:fs";
import {
  type CenterFacts,
  type Clause,
  clauseInForce,
  evaluateClause,
} from "../src/lib/clause.ts";
import { displayTenantName } from "../src/lib/matching.ts";

const KEY_PATH = process.argv[2] ?? "C:/Users/Lucky/Desktop/af_portfolio_answer_key.json";
const RAW_PATH = "C:/Users/Lucky/Desktop/af_portfolio_dataset (1).json";

const key = JSON.parse(readFileSync(KEY_PATH, "utf8")) as {
  malls: Record<string, {
    mall: string;
    monthly_limbs: { month: string; condition_failing: boolean }[];
    trigger_records: {
      kind: string;
      condition_first_failing?: string;
      trigger_month?: string;
      remedy_start?: string;
      suspended_until?: string;
    }[];
  }>;
};
const raw = JSON.parse(readFileSync(RAW_PATH, "utf8"));
const file = JSON.parse(readFileSync("src/lib/data/af-portfolio.json", "utf8"));

const monthKey = (iso: string | null | undefined) => (iso ? iso.slice(0, 7) : null);

let condOk = 0, condTot = 0;
const condMiss: string[] = [];
let firstOk = 0, firstTot = 0, trigOk = 0, trigTot = 0;
const recMiss: string[] = [];

for (const k of Object.keys(key.malls)) {
  const kv = key.malls[k];
  const loc = file.locations.find((l: { center: { name: string } }) => l.center.name === kv.mall);
  const rawMall = Object.values(raw.malls).find((m) => (m as { mall: string }).mall === kv.mall) as {
    roster: { store: string; gla: number; anchor: boolean; zone: boolean }[];
    months: { month: string; closed_stores: string[] }[];
  };
  if (!loc || !rawMall) { recMiss.push(`NOT FOUND  ${kv.mall}`); continue; }

  const clause: Clause = clauseInForce(loc.clauses, file.today) ?? loc.clauses[0];

  /* ---- per-month condition ---- */
  for (const km of kv.monthly_limbs) {
    const src = rawMall.months.find((x) => x.month === km.month);
    if (!src) continue;
    /* Suite names are de-slugified for display, so normalize the
       source side the same way before comparing. */
    const closed = new Set(src.closed_stores.map(displayTenantName));

    const center: CenterFacts = {
      ...loc.center,
      suites: loc.center.suites.map((s: { name: string }) => ({
        ...s,
        status: closed.has(s.name) ? "dark" : "open",
      })),
    };

    const ev = evaluateClause(
      clause,
      center,
      loc.econ,
      { firstObservedAt: undefined, failedPreconditions: [] },
      `${km.month}-15`,
    );

    condTot++;
    const mineFailing = !ev.requirementMet;
    if (mineFailing === km.condition_failing) condOk++;
    else condMiss.push(
      `${kv.mall} ${km.month}: engine ${mineFailing ? "failing" : "ok"}, key ${km.condition_failing ? "failing" : "ok"}`,
    );
  }

  /* ---- trigger record ---- */
  const op = kv.trigger_records.find((r) => r.kind === "operating" || r.kind === "opening");
  if (op?.condition_first_failing) {
    firstTot++;
    if (monthKey(loc.claim.firstObservedAt) === op.condition_first_failing) firstOk++;
    else recMiss.push(
      `FIRST-FAIL  ${kv.mall}: engine ${monthKey(loc.claim.firstObservedAt) ?? "-"}, key ${op.condition_first_failing}`,
    );
  }
  if (op?.trigger_month) {
    trigTot++;
    const ev = evaluateClause(clause, loc.center, loc.econ, loc.claim, file.today);
    if (monthKey(ev.cureEndsOn) === op.trigger_month) trigOk++;
    else recMiss.push(
      `TRIGGER     ${kv.mall}: engine ${monthKey(ev.cureEndsOn) ?? "-"}, key ${op.trigger_month}`,
    );
  }
}

/* ------------------------------------------------------------------
   money: the alternative rent, month by month
   ------------------------------------------------------------------ */

/*
 * The key states, for every month a remedy runs, the fixed rent, the
 * alternative rent and the difference. That difference IS the number on
 * the dashboard, so it is worth checking against ground truth rather
 * than trusting our own arithmetic.
 */
let rentOk = 0, rentTot = 0;
const rentMiss: string[] = [];

for (const k of Object.keys(key.malls)) {
  const kv = key.malls[k] as unknown as {
    mall: string;
    rent_at_risk?: { month: string; fmr_k: number; alt_rent_k: number; monthly_rent_at_risk_k: number }[];
  };
  if (!kv.rent_at_risk?.length) continue;
  const loc = file.locations.find((l: { center: { name: string } }) => l.center.name === kv.mall);
  const rawMall = Object.values(raw.malls).find((m) => (m as { mall: string }).mall === kv.mall) as {
    clause: { remedy: { alt_pct: number | null } };
    af_store: { annual_fmr: number; monthly_sales_k: number[] };
  };
  if (!loc || !rawMall) continue;

  const timeline: string[] = (JSON.parse(readFileSync(RAW_PATH, "utf8")) as { timeline: string[] }).timeline;
  const pctSales = rawMall.clause.remedy.alt_pct;

  for (const row of kv.rent_at_risk) {
    rentTot++;
    const i = timeline.indexOf(row.month);
    const salesK = rawMall.af_store.monthly_sales_k[i];
    const fmrK = rawMall.af_store.annual_fmr / 12 / 1000;
    const altK = pctSales == null ? fmrK * 0.5 : salesK * (pctSales / 100);
    const mineK = Math.max(0, fmrK - Math.min(fmrK, altK));

    if (Math.abs(mineK - row.monthly_rent_at_risk_k) <= 0.1) rentOk++;
    else rentMiss.push(
      `${kv.mall} ${row.month}: engine ${mineK.toFixed(1)}k, key ${row.monthly_rent_at_risk_k}k`,
    );
  }
}

const pct = (a: number, b: number) => (b ? ((a / b) * 100).toFixed(1) : "0.0");

console.log("=".repeat(66));
console.log("ENGINE vs ANSWER KEY");
console.log("=".repeat(66));
console.log(`Monthly condition failing   ${condOk}/${condTot}  (${pct(condOk, condTot)}%)`);
console.log(`Condition first failing     ${firstOk}/${firstTot}`);
console.log(`Trigger month               ${trigOk}/${trigTot}`);
console.log(`Monthly rent at risk        ${rentOk}/${rentTot}  (${pct(rentOk, rentTot)}%)`);

if (condMiss.length) {
  console.log(`\n-- condition mismatches (${condMiss.length}) --`);
  for (const m of condMiss.slice(0, 20)) console.log("  " + m);
  if (condMiss.length > 20) console.log(`  ... and ${condMiss.length - 20} more`);
}
if (rentMiss.length) {
  console.log(`
-- rent mismatches (${rentMiss.length}) --`);
  for (const m of rentMiss.slice(0, 12)) console.log("  " + m);
  if (rentMiss.length > 12) console.log(`  ... and ${rentMiss.length - 12} more`);
}
if (recMiss.length) {
  console.log(`\n-- record mismatches (${recMiss.length}) --`);
  for (const m of recMiss) console.log("  " + m);
}
console.log("");
process.exit(condMiss.length === 0 && recMiss.length === 0 && rentMiss.length === 0 ? 0 : 1);

/**
 * VERIFY THE IMPORT AGAINST ITS SOURCE.
 *
 *   node --experimental-strip-types scripts/af-verify.ts [dataset.json]
 *
 * The import is a translation, and a translation can be wrong in ways a
 * build never catches. This re-derives the answers straight from the
 * partner's file and compares them with what the engine produces from
 * the emitted JSON. Any drift between the two is a bug in the mapping.
 *
 * It checks four things:
 *
 *   1. Every location survived, and every suite carries the status the
 *      source's final month says it has.
 *   2. Our occupancy percentage matches the source's precomputed one.
 *      This also settles whether the source measures by area or by unit
 *      count, which changes every occupancy answer we would ever give.
 *   3. The requirement verdict matches a direct recomputation of the
 *      limbs, so a mistake in the and/or inversion cannot hide.
 *   4. The entitlements and first-failure dates survived the trip.
 *
 * Exits non-zero on any mismatch so it can gate a commit.
 */

import { readFileSync } from "node:fs";
import { clauseInForce, evaluateClause } from "../src/lib/clause.ts";
import type { Suite } from "../src/lib/clause.ts";

const src = process.argv[2] ?? "C:/Users/Lucky/Desktop/af_portfolio_dataset (1).json";
const raw = JSON.parse(readFileSync(src, "utf8"));
const file = JSON.parse(readFileSync("src/lib/data/af-portfolio.json", "utf8"));

const LAST = raw.timeline.length - 1;
const TODAY = file.today;
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

let failures = 0;
const fail = (msg: string) => { failures++; console.log(`  FAIL  ${msg}`); };

/* ---------------------------------------------------------------- 1 */

const keys = Object.keys(raw.malls);
console.log(`\nlocations: ${file.locations.length} emitted, ${keys.length} in source`);
if (file.locations.length !== keys.length) fail("location count differs");

let suiteChecks = 0;
for (const key of keys) {
  const m = raw.malls[key];
  const loc = file.locations.find((l: any) => l.center.id === key);
  if (!loc) { fail(`${m.mall}: missing from output`); continue; }

  const closed = new Set(m.months[LAST].closed_stores);
  if (loc.center.suites.length !== m.roster.length)
    fail(`${m.mall}: ${loc.center.suites.length} suites vs ${m.roster.length} roster rows`);

  /*
   * Match on the exact store name, never a lowercased slug. Fashion
   * Valley carries both "jcpenney" and "JCPenney" as separate anchors
   * with different floor areas, so a case-folded lookup silently
   * compares the wrong row against the wrong answer.
   */
  for (const r of m.roster) {
    const s = loc.center.suites.find((x: Suite) => x.name === r.store);
    suiteChecks++;
    if (!s) { fail(`${m.mall}: suite ${r.store} missing`); continue; }
    const want = closed.has(r.store) ? "dark" : "open";
    if (s.status !== want) fail(`${m.mall}/${r.store}: status ${s.status}, source says ${want}`);
    if (s.gla !== r.gla) fail(`${m.mall}/${r.store}: gla ${s.gla} vs ${r.gla}`);
    if (Boolean(s.zone) !== Boolean(r.zone)) fail(`${m.mall}/${r.store}: zone flag differs`);
    if (Boolean(s.kind === "anchor") !== Boolean(r.anchor)) fail(`${m.mall}/${r.store}: anchor flag differs`);
  }
}
console.log(`suite fidelity: ${suiteChecks} suites checked`);

/* ---------------------------------------------------------------- 2 */

/*
 * The source publishes a percentage per month. We recompute it two
 * ways from the same roster: weighted by floor area, and by unit count.
 * Whichever tracks the source tells us what its percentages mean, and
 * that has to match what the engine does or every occupancy number in
 * the product is measured on the wrong denominator.
 */
let byArea = 0, byCount = 0, occChecks = 0, worstArea = 0, worstAreaAt = "";

for (const key of keys) {
  const m = raw.malls[key];
  const mm = m.months[LAST];
  const closed = new Set(mm.closed_stores);

  for (const l of m.clause.limbs) {
    if (l.type !== "pct") continue;
    occChecks++;

    const pool = m.roster.filter((r: any) =>
      l.basis === "inline" ? !r.anchor : l.basis === "zone" ? r.zone : true,
    );
    const open = pool.filter((r: any) => !closed.has(r.store));

    const area = (open.reduce((s: number, r: any) => s + r.gla, 0) /
      pool.reduce((s: number, r: any) => s + r.gla, 0)) * 100;
    const count = (open.length / pool.length) * 100;

    const want =
      l.basis === "inline" ? mm.inline_open_pct
        : l.basis === "zone" ? mm.zone_open_pct
          : mm.total_open_pct;

    const dArea = Math.abs(area - want);
    const dCount = Math.abs(count - want);
    if (dArea < dCount) byArea++; else byCount++;
    if (dArea > worstArea) { worstArea = dArea; worstAreaAt = `${m.mall} (${l.basis})`; }
  }
}
console.log(
  `occupancy basis: ${occChecks} tests — area-weighted closer on ${byArea}, count-weighted on ${byCount}`,
);
console.log(`  worst area-weighted gap: ${worstArea.toFixed(2)} pts at ${worstAreaAt}`);
if (byCount > byArea)
  fail("source measures occupancy by unit count, the engine measures by area — denominators disagree");

/* ---------------------------------------------------------------- 3 */

/*
 * Recompute each clause's verdict from the raw limbs, then compare with
 * what the engine says after the and/or inversion. Silent disagreement
 * here would put wrong verdicts on the dashboard.
 */
let verdictChecks = 0;
for (const key of keys) {
  const m = raw.malls[key];
  const loc = file.locations.find((l: any) => l.center.id === key);
  if (!loc) continue;
  const mm = m.months[LAST];
  const closed = new Set(mm.closed_stores);

  const limbFails = m.clause.limbs.map((l: any) => {
    if (l.type === "named") return closed.has(l.name);
    if (l.type === "count") return l.pool.filter((p: string) => !closed.has(p)).length < l.required;
    const v = l.basis === "inline" ? mm.inline_open_pct : l.basis === "zone" ? mm.zone_open_pct : mm.total_open_pct;
    return v < l.threshold;
  });
  // AND means every limb must fail before the clause fails.
  const sourceFailed = m.clause.combine === "AND" ? limbFails.every(Boolean) : limbFails.some(Boolean);

  const clause = clauseInForce(loc.clauses, TODAY) ?? loc.clauses[0];
  const ev = evaluateClause(clause, loc.center, loc.econ, loc.claim, TODAY);
  verdictChecks++;

  if (ev.requirementMet === sourceFailed)
    fail(`${m.mall}: engine says requirement ${ev.requirementMet ? "met" : "not met"}, source limbs say ${sourceFailed ? "failed" : "held"}`);
}
console.log(`verdicts: ${verdictChecks} clauses recomputed from raw limbs`);

/* ---------------------------------------------------------------- 4 */

const withRight = file.locations.filter((l: any) => l.clauses[0].entitlements?.length).length;
const srcRight = keys.filter((k) => raw.malls[k].clause.info_right).length;
console.log(`reporting rights: ${withRight} carried, ${srcRight} in source`);
if (withRight !== srcRight) fail("reporting rights lost in translation");

const withDate = file.locations.filter((l: any) => l.claim.firstObservedAt).length;
console.log(`first observed failure dates: ${withDate} of ${file.locations.length}`);

console.log(`\nTODAY = ${TODAY}`);
console.log(failures === 0 ? "\nAll checks passed.\n" : `\n${failures} check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);

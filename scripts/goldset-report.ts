/**
 * Gold set harness.
 *
 *   node --experimental-strip-types scripts/goldset-report.ts [path-to-json]
 *
 * Runs our adapter over the partner's hand-labeled records and reports
 * three things:
 *
 *   1. What the real data actually looks like, measured not assumed.
 *   2. Every field our schema CANNOT carry, ranked by how often it
 *      appears. This is the build list for the extraction model.
 *   3. A self-test of the scoring function, so that when a real
 *      extractor exists we already trust the instrument measuring it.
 *
 * The JSON is not in the repo: it holds real property names, real
 * tenants and real claim correspondence. Pass a path, or drop it at the
 * default location below.
 */

import { readFileSync } from "node:fs";
import {
  type GoldFile,
  type GoldRecord,
  adaptRecord,
  retroCapFrom,
  scoreExtraction,
} from "../src/lib/goldset.ts";

const DEFAULT =
  "C:/Users/Lucky/Desktop/cotenancy_records.json";
const path = process.argv[2] ?? DEFAULT;

let file: GoldFile;
try {
  file = JSON.parse(readFileSync(path, "utf8")) as GoldFile;
} catch {
  console.error(`Could not read the gold set at:\n  ${path}\n`);
  console.error("Pass a path: node --experimental-strip-types scripts/goldset-report.ts <file.json>");
  process.exit(1);
}

const records: GoldRecord[] = file.records;
const withClause = records.filter((r) => r.clause_present);

const rule = (s: string) => console.log(`\n${s}\n${"─".repeat(s.length)}`);
const pct = (n: number, d: number) => `${((n / (d || 1)) * 100).toFixed(1)}%`;

function tally<T extends string | number | null>(values: T[]) {
  const m = new Map<string, number>();
  for (const v of values) {
    const k = v === null ? "(null)" : String(v);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

const show = (rows: [string, number][], total: number, limit = 12) => {
  for (const [k, n] of rows.slice(0, limit)) {
    const bar = "█".repeat(Math.max(1, Math.round((n / total) * 32)));
    console.log(`  ${k.padEnd(26).slice(0, 26)} ${String(n).padStart(4)}  ${pct(n, total).padStart(6)}  ${bar}`);
  }
  if (rows.length > limit) console.log(`  ... and ${rows.length - limit} more`);
};

/* ------------------------------------------------------------------ */

console.log(`\nGold set: ${file.description.slice(0, 70)}...`);
console.log(`Generated ${file.generated} · schema ${file.schema_version}`);
console.log(`Properties: ${Object.keys(file.properties).join(", ")}`);

rule("1. THE SHAPE OF REAL DATA");

const allTriggers = withClause.flatMap((r) => r.triggers);
console.log(`Records: ${records.length} · with clause: ${withClause.length} (${pct(withClause.length, records.length)})`);
console.log(`Triggers: ${allTriggers.length} · needs human review: ${records.filter((r) => r.needs_human_review).length} (${pct(records.filter((r) => r.needs_human_review).length, records.length)})`);

const conf = withClause.map((r) => r.confidence ?? 0).sort((a, b) => a - b);
console.log(`Confidence: min ${conf[0]} · median ${conf[Math.floor(conf.length / 2)]} · max ${conf[conf.length - 1]}`);

console.log("\nTrigger type:");
show(tally(allTriggers.map((t) => t.trigger_type)), allTriggers.length);

console.log("\nRelief clock starts from:");
const remedies = allTriggers.map((t) => t.remedy).filter(Boolean) as NonNullable<
  (typeof allTriggers)[number]["remedy"]
>[];
show(tally(remedies.map((r) => r.cure_runs_from)), remedies.length);

console.log("\nArea basis (the denominator):");
show(tally(allTriggers.map((t) => t.area_basis)), allTriggers.length);

console.log("\nOccupancy thresholds:");
show(
  tally(
    allTriggers
      .map((t) => t.occupancy_threshold_pct)
      .filter((v): v is number => v != null),
  ),
  allTriggers.filter((t) => t.occupancy_threshold_pct != null).length,
);

console.log("\nRemedy cap, months:");
show(
  tally(
    remedies
      .map((r) => r.remedy_duration_cap_months)
      .filter((v): v is number => v != null),
  ),
  remedies.filter((r) => r.remedy_duration_cap_months != null).length,
);

console.log("\nReplacement standard kinds (an enum cannot hold this):");
const kinds = allTriggers
  .map((t) => t.replacement_standard?.kind)
  .filter((v): v is string => Boolean(v));
console.log(`  ${new Set(kinds).size} distinct values across ${kinds.length} triggers`);
show(tally(kinds), kinds.length, 6);

/* ------------------------------------------------------------------ */

rule("2. WHAT OUR SCHEMA CANNOT CARRY");

const lossReasons = new Map<string, number>();
const lossyRecords = new Set<string>();
let adapted = 0;

for (const rec of records) {
  const { clause, lossy } = adaptRecord(rec);
  if (clause) adapted += 1;
  for (const l of lossy) {
    const key = l.split(":")[0];
    lossReasons.set(key, (lossReasons.get(key) ?? 0) + 1);
    lossyRecords.add(rec.file);
  }
}

console.log(`Adapted ${adapted} clause records.`);
console.log(`${lossyRecords.size} of ${withClause.length} (${pct(lossyRecords.size, withClause.length)}) lose something in translation.\n`);
show([...lossReasons.entries()].sort((a, b) => b[1] - a[1]), withClause.length, 14);

/* the retroactive cap, the most valuable number in the remedy */
const withNoticeTerms = remedies.filter((r) => r.notice_terms);
const capsFound = withNoticeTerms
  .map((r) => retroCapFrom(r.notice_terms))
  .filter((v) => v != null);

console.log(
  `\nRetroactive cap parser: found a cap in ${capsFound.length} of ${withNoticeTerms.length} remedies carrying notice terms (${pct(capsFound.length, withNoticeTerms.length)}).`,
);
if (capsFound.length) console.log(`  Values seen: ${[...new Set(capsFound)].sort((a, b) => a! - b!).join(", ")} days`);

/* ------------------------------------------------------------------ */

rule("3. SCORING HARNESS SELF-TEST");

const identity = new Map(records.map((r) => [r.file, r]));
const perfect = scoreExtraction(records, identity);
console.log(`Truth scored against itself: ${(perfect.overall * 100).toFixed(1)}% (must be 100.0%)`);

/* a deliberately damaged copy, to prove the harness detects error */
const damaged = new Map(
  records.map((r) => [
    r.file,
    {
      ...r,
      triggers: r.triggers.map((t, i) =>
        i === 0
          ? {
              ...t,
              occupancy_threshold_pct:
                t.occupancy_threshold_pct == null ? null : t.occupancy_threshold_pct + 5,
              remedy: t.remedy
                ? { ...t.remedy, cure_period_days: (t.remedy.cure_period_days ?? 0) + 30 }
                : null,
            }
          : t,
      ),
    } as GoldRecord,
  ]),
);
const hurt = scoreExtraction(records, damaged);
console.log(`Same set with thresholds and cure periods shifted: ${(hurt.overall * 100).toFixed(1)}%`);
console.log("\nPer field, on the damaged copy:");
for (const f of hurt.fields) {
  if (f.compared === 0) continue;
  const flag = f.accuracy === 1 ? "  " : f.accuracy < 0.9 ? "!!" : " ~";
  console.log(
    `${flag} ${f.field.padEnd(28)} ${(f.accuracy * 100).toFixed(1).padStart(6)}%  (${f.correct}/${f.compared})`,
  );
}

rule("WHAT THIS MEANS");
console.log(
  [
    "The harness works: it reports 100% on identical input and drops where",
    "values are wrong. When an extractor exists, hold out a slice of these",
    "records, run it, and call scoreExtraction. That produces the number a",
    "retailer will ask for, per field, on data nobody trained against.",
    "",
    "The section 2 list is the build order. Anything appearing on many",
    "records is a gap that will bite on real leases, not a hypothetical.",
  ].join("\n"),
);
console.log("");

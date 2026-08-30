/**
 * Canon tranche three: generalization beyond the pilot datasets.
 *
 *   node scripts/seed-canon-generalization.mjs
 *
 * The first two tranches encoded what the scored datasets taught. This
 * one encodes what NO dataset has exercised yet but every real
 * portfolio will: landlord gamesmanship around measurement, corporate
 * events that mimic closures, property types without directories, and
 * the ways a denominator moves under you. Receipts here are practice
 * and doctrine, not a scored case — each is written as a rule that
 * applies to any client on day one.
 *
 * Idempotent by sort number.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

function loadEnv(file) {
  try {
    return Object.fromEntries(
      readFileSync(file, "utf8")
        .split(/\r?\n/)
        .map((l) => /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(l))
        .filter(Boolean)
        .map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")]),
    );
  } catch {
    return {};
  }
}
const env = { ...loadEnv(".env.local"), ...process.env };
const url = env.DATABASE_URL_UNPOOLED || env.DATABASE_URL;
if (!url) {
  console.error("No DATABASE_URL.");
  process.exit(1);
}

/* topic, sort, body */
const TRANCHE = [
  ["general", 11,
    "Nothing in this canon is scoped to any client, center, or dataset. Named examples are receipts from cases already worked; the rule is the sentence itself, and it applies to every portfolio, every property type, and every landlord identically from day one."],

  ["extraction", 98,
    "Measurement timing is a term, not a detail. Extract WHEN the occupancy condition is tested: continuously (any day it exists), as a monthly state, on the tenant's notice date, or on a defined measurement date. A landlord can time a cure or a count to a favorable day; the lease's convention decides whose day counts, so it must be on the record."],
  ["extraction", 99,
    "The denominator can move. Extract any landlord right to remeasure, restate, demolish, or expand the GLA the percentage is tested against. A restated denominator is an event that re-runs every affected test from the restatement date; treat it as a change to evaluate, never as an error in our numbers."],

  ["matching", 127,
    "Retailers rebrand, merge, and get acquired. A name vanishing from a roster while the storefront trades on under a successor brand is not a closure; it is an alias waiting for confirmation. Queue the successor name for a person to confirm, and remember: a confirmed alias applies portfolio-wide, so the book only grows."],

  ["scanning", 141,
    "Bankruptcy is a process, not a closing. A Chapter 11 filing changes the watch, not the count: debtors routinely operate through the case, and only a court-approved closing or lease-rejection list changes a month. Tighten the cadence on the docket signal; count only what the storefront actually does."],
  ["scanning", 143,
    "Defeat the blink-open: a store that shows open in one sweep after a documented dark streak, especially near a cure deadline or measurement date, routes to field verification before it improves any month. Persistence across sweeps is what cures a month; a single favorable observation never does."],
  ["scanning", 145,
    "Seasonal inflation is real and temporary. Holiday pop-ups can lift a center over an occupancy floor in November and December without any durable change. Where the basis is open-and-operating, watch January: a floor regained only for the season fails again in the new year, and remedy continuity applies to the recurrence."],
  ["scanning", 147,
    "Directory staleness cuts both ways: listings lag openings and closings alike. A directory proves the roster as published on the sweep date, nothing more. When a single month carries money, that month is verified in the field, not read off a webpage."],
  ["scanning", 149,
    "Properties without directories (street retail, outlet centers, unenclosed strips) are watched field-first: store locators, permits, press, and site checks stand in for the directory tier. A missing directory lowers the evidence ceiling for that center; it never lowers the watch cadence."],

  ["notices", 186,
    "Ownership transfers change the addressee. A successor landlord takes subject to the lease, and notice provisions often name entities that no longer exist after a sale. When a watched center trades, re-confirm the notice address against the newest estoppel or SNDA on file BEFORE anything is served; a notice to the wrong entity starts no clock."],
];

const sql = new pg.Client({ connectionString: url });
await sql.connect();
let added = 0;
let skipped = 0;
for (const [topic, sort, body] of TRANCHE) {
  const { rows } = await sql.query(
    `select 1 from agent_directive where scope = 'global' and sort = $1`,
    [sort],
  );
  if (rows.length) {
    skipped++;
    continue;
  }
  await sql.query(
    `insert into agent_directive (scope, topic, sort, body) values ('global', $1, $2, $3)`,
    [topic, sort, body],
  );
  added++;
}
const { rows: total } = await sql.query(
  `select count(*)::int as n from agent_directive where scope = 'global' and active`,
);
console.log(`added ${added}, skipped ${skipped}; global canon now ${total[0].n} active directives`);
await sql.end();

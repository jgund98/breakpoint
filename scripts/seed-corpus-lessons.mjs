/**
 * Corpus lessons: field and canon updates from the expert's 70-lease
 * language corpus (2026-08-31 drop; the corpus itself NEVER enters
 * the repo — this script carries only the adjudicated rules).
 *
 *   node scripts/seed-corpus-lessons.mjs
 *
 * Receipts: the corpus Labeling Guide (29 adjudicated rules incl. 21
 * index discrepancies), record ids cited per rule. Idempotent: field
 * updates match on field_key, canon inserts skip existing sorts.
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
const sql = new pg.Client({ connectionString: url });
await sql.connect();

/* ---- capture-field instruction upgrades (expert labeling rules) ---- */
const FIELD_UPDATES = [
  ["replacement_standard",
    "Any 'or a replacement of comparable quality/size/use' language, verbatim. A 'Required Tenant' / 'Inducement Tenant' / 'Key Tenant' defined by store-count or state-count criteria (e.g. 'operates 50+ stores in 15+ states') is a replacement standard captured verbatim, NOT a named-tenant list. Whether a specific replacement qualifies routes to review."],
  ["area_basis",
    "What area the percentage measures over: total GLA, inline GLA, or a defined area (LFA, 'Future Retail Area'), with the definition's citation. Defined-area denominators in power and strip centers usually exclude the tenant's own premises; record whether they do."],
  ["measurement_basis",
    "open_and_operating, leased, or occupied. Opening conditions can also measure on executed leases or space under construction: 'leases entered into' is a leased basis, never open-and-operating. The same center passes one basis and fails another; never assume."],
  ["tenant_preconditions",
    "Every condition on the tenant's own eligibility: open and operating, not in default, right personal to the named tenant, sales-decline gates with their measuring period. A sales-decline test attached to an occupancy condition GATES the remedy; record it as a gate, never as a separate trigger. A sales gate is a one-time unlock once met."],
  ["compound_logic",
    "How multiple limbs combine, exactly as drafted, preserving the boolean structure: a named-anchor requirement joined to an occupancy floor by AND is ONE compound trigger; joined by OR, each limb independently activates the remedy and is its own trigger. The conjunctive trigger is the landlord-favorable rarity; flag it."],
];
for (const [key, instruction] of FIELD_UPDATES) {
  const r = await sql.query(
    `update extraction_field set instruction = $2, updated_at = now() where field_key = $1`,
    [key, instruction],
  );
  console.log(`field ${key}: ${r.rowCount ? "updated" : "MISSING"}`);
}

/* ---- new field: the landlord-forced election (corpus R16) ---- */
const dup = await sql.query(
  `select 1 from extraction_field where field_key = 'landlord_demand_rights'`,
);
if (!dup.rows.length) {
  await sql.query(
    `insert into extraction_field (field_key, label, instruction, category, required, sort, source)
     values ('landlord_demand_rights', 'Landlord demand rights',
       'Any landlord right to force the tenant''s hand during a remedy: a demand notice requiring the tenant to elect termination or resumption of full rent by a deadline. This is not a tenant termination right; missing the election window can end the remedy, so the deadline belongs on the calendar the day it is extracted.',
       'remedy', true, 95, 'corpus-70')`,
  );
  console.log("field landlord_demand_rights: added");
} else console.log("field landlord_demand_rights: exists");

/* ---- canon tranche four: source fidelity and corpus mechanics ---- */
const TRANCHE = [
  ["general", 2,
    "An index, abstract, CMBS footnote, or court paraphrase is discovery, never authority. In a 70-lease verification corpus, 21 records contradicted their own master index, including an AND/OR trigger inverted and a clause attributed to a lease that does not contain it. A claim that cannot be verified against operative language is recorded as unknown, never copied forward; the discrepancy itself is a finding worth recording."],
  ["general", 4,
    "Verify a document is what it claims before extracting from it: filer, parties, property, and dates must match the lease being abstracted. A corpus source labeled as one retailer's filing was another company's 10-K entirely. A mismatched document is a finding, not an input."],
  ["general", 6,
    "Never quote from a truncated or summarized fetch. Automated summarizers have fabricated lease text on truncated pages; operative language is quoted only when confirmed by two consistent fetches or a complete full-text source. A quote that cannot be double-confirmed is not a quote."],
  ["extraction", 33,
    "A court's characterization of a clause ('the lease provided for 2% substitute rent') is usable evidence but a weaker label than a block quote of the operative text. Cap confidence at 0.75 when the language on file is a paraphrase, and say which it is."],
  ["extraction", 35,
    "A CMBS or servicer abstract labels the EXISTENCE of co-tenancy and its headline numbers, nothing more. Measurement basis, timing, and remedy mechanics are almost never stated there; leave them unspecified and route to the lease rather than guessing from the footnote."],
  ["extraction", 37,
    "Retailer lease forms repeat as families: near-identical co-tenancy language across many properties of one tenant. Recognizing a form accelerates the read and predicts structure, but every instance is read in full; families mutate deal by deal, and the mutation is usually the negotiated term that matters most."],
];
let added = 0;
for (const [topic, sort, body] of TRANCHE) {
  const { rows } = await sql.query(
    `select 1 from agent_directive where scope = 'global' and sort = $1`,
    [sort],
  );
  if (rows.length) continue;
  await sql.query(
    `insert into agent_directive (scope, topic, sort, body) values ('global', $1, $2, $3)`,
    [topic, sort, body],
  );
  added++;
}
const { rows: total } = await sql.query(
  `select count(*)::int as n from agent_directive where scope = 'global' and active`,
);
const { rows: fields } = await sql.query(
  `select count(*)::int as n from extraction_field where active`,
);
console.log(`canon +${added}; ${total[0].n} directives, ${fields[0].n} capture fields`);
await sql.end();

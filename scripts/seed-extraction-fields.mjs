/**
 * Seed the extraction capture checklist from the expert's gold-set
 * schema (their field names, their meanings — theirs is canonical),
 * plus the round-2 mechanics the engine now requires.
 *
 *   node scripts/seed-extraction-fields.mjs
 *
 * Idempotent by field_key: existing rows are never touched, so console
 * edits survive any rerun.
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

/* category, sort, field_key, required, label, instruction, source */
const G = "expert-goldset";
const R2 = "round-2";
const FIELDS = [
  /* ---- identity: which paper, which clause ---- */
  ["identity", 10, "clause_present", true, "Clause present",
    "Whether the lease contains any co-tenancy provision at all. Absence is a finding worth recording, not a failed extraction.", G],
  ["identity", 20, "clause_locations", true, "Clause locations",
    "Every section, article, exhibit, and rider where co-tenancy language appears, cited exactly as the lease numbers them. Amendments count.", G],
  ["identity", 30, "clause_type", true, "Clause type",
    "Opening co-tenancy, operating co-tenancy, or both. Opening conditions gate rent commencement; operating conditions run for the term.", G],
  ["identity", 40, "source_text", true, "Operative language",
    "The operative co-tenancy language verbatim, long enough to stand alone in a notice package. The text is the authority; the structured fields are its index.", G],
  ["identity", 50, "defined_terms", false, "Defined terms",
    "Every capitalized defined term the clause leans on (Anchor, Required Tenants, Occupancy Threshold, GLA) with where each is defined, including exhibit references.", G],

  /* ---- trigger: what has to fail ---- */
  ["trigger", 10, "trigger_type", true, "Trigger type",
    "named_tenant, tenant_count, occupancy_pct, or compound. One clause often carries several limbs; capture each limb separately.", G],
  ["trigger", 20, "named_tenants", true, "Named tenants",
    "The exact tenant names the clause conditions on, verbatim, never normalized. 'Zara Beauty Bar' is not 'Zara'.", G],
  ["trigger", 30, "replacement_standard", true, "Replacement standard",
    "Any 'or a replacement of comparable quality/size/use' language, verbatim. It changes what counts as the named tenant going dark; whether a specific replacement qualifies routes to review.", G],
  ["trigger", 40, "required_count", true, "Required count",
    "For count tests: how many of the pool must be open and operating.", G],
  ["trigger", 50, "count_pool", true, "Count pool",
    "The full list of tenants eligible to satisfy a count test, exactly as drafted.", G],
  ["trigger", 60, "occupancy_threshold_pct", true, "Occupancy threshold",
    "The percentage the occupancy test compares against. Bright line: a month short by any margin fails.", G],
  ["trigger", 70, "measurement_basis", true, "Measurement basis",
    "open_and_operating, leased, or occupied. The same center passes one basis and fails another; never assume.", G],
  ["trigger", 80, "area_basis", true, "Area basis",
    "What area the percentage measures over: total GLA, inline GLA, or a defined area, with the definition's citation (often an exhibit).", G],
  ["trigger", 85, "measurement_timing", true, "Measurement timing",
    "WHEN the occupancy condition is tested: continuously (any day it exists), as a monthly state, on the tenant notice date, or on a defined measurement date. The convention decides whose day counts when a landlord times a cure or a count to a favorable day.", R2],
  ["trigger", 90, "area_exclusions", false, "Area exclusions",
    "Space carved out of the denominator: anchors, outparcels, kiosks, storage, mezzanine. Exclusions swing the math more than the threshold does.", G],
  ["trigger", 100, "deemed_open_rules", true, "Deemed-open rules",
    "Every carve-out that treats a dark store as open: remodel grace with its day cap, casualty, force majeure, seasonal closures. Keep the lease's own words.", G],
  ["trigger", 110, "compound_logic", true, "Compound logic",
    "How multiple limbs combine, exactly as drafted: on failure (OR trips it) or on satisfaction (AND trips it). The conjunctive trigger is the landlord-favorable rarity; flag it.", G],

  /* ---- remedy: what the tenant gets ---- */
  ["remedy", 10, "remedy_type", true, "Remedy type",
    "alternative_rent, abatement, sequenced, deferred_opening, or termination. A sequenced remedy is a ladder; capture every rung with its duration.", G],
  ["remedy", 20, "alt_rent_formula", true, "Alternative rent formula",
    "The substitute rent exactly: percent of gross sales, percent of base rent, or fixed, plus the 'lesser of' framing where present. Percentage rent computes on each month's own sales.", G],
  ["remedy", 30, "in_lieu_of", false, "In lieu of",
    "What the substitute rent replaces: base rent only, or base plus charges (CAM, taxes, marketing). The difference is real money every month.", G],
  ["remedy", 40, "cure_period", true, "Cure or qualifying period",
    "The duration the condition must persist before the right arises, in the lease's own unit (days or months), inclusive of the first failing month. Keep it separate from notice timing.", G],
  ["remedy", 50, "cure_runs_from", true, "Period runs from",
    "Whether the period runs from the condition's onset or from tenant notice. Where relief runs from notice, every unserved day is unrecoverable.", G],
  ["remedy", 60, "notice_required", true, "Notice required",
    "Whether the tenant must give written notice to start or preserve the remedy, and the notice's required content and addresses.", G],
  ["remedy", 70, "retroactive", true, "Retroactive relief",
    "Whether relief reaches back to the first failing month once triggered. Extract it ONLY where the lease grants it in words; never infer it from the remedy's structure.", R2],
  ["remedy", 80, "remedy_duration_cap_months", true, "Remedy cap",
    "How long the reduced rent can run, in months. The cap opens the post-cap election; it never stops rent-at-risk from accruing while the condition persists.", G],
  ["remedy", 90, "post_cap_election", true, "Post-cap election",
    "What happens when the cap expires with the condition persisting: termination right, resume full rent, or landlord cure window. Capture the election's window and mechanics.", G],
  ["remedy", 100, "termination_terms", false, "Termination terms",
    "Termination notice days and window where a termination right exists, plus any construction-cost or unamortized-allowance reimbursement on exit.", G],
  ["remedy", 110, "recurrence", false, "Recurrence",
    "Whether the remedy can trigger again after a cure, and any once-per-term limits. Absent limits, continuity is the default: a recurrence resumes relief with no fresh qualifying period.", G],
  ["remedy", 120, "sunset", false, "Sunset",
    "Any date or event after which the co-tenancy protection expires entirely.", G],
  ["remedy", 130, "suspended_until", true, "Suspension window",
    "Any amendment or side letter suspending the clause, and the month it comes back. A suspended clause is inert; failures during suspension never run the clock.", R2],

  /* ---- preconditions: what the tenant must be ---- */
  ["preconditions", 10, "tenant_preconditions", true, "Tenant preconditions",
    "Every condition on the tenant's own eligibility: open and operating, not in default, right personal to the named tenant, sales-decline gates with their measuring period. A sales gate is a one-time unlock once met.", G],

  /* ---- status: what has already happened ---- */
  ["status", 10, "claim_asserted", true, "Claim asserted",
    "Whether the tenant has already asserted the right: any notice served, when, and what it claimed. Client-supplied history counts; cite the correspondence.", G],
  ["status", 20, "landlord_disputed", true, "Landlord position",
    "Any landlord dispute, acknowledgment, or cure on record, with details and resolution if resolved.", G],

  /* ---- review: honesty about the read ---- */
  ["review", 10, "information_rights", false, "Information rights",
    "Certified occupancy statements, leasing plans, or reports the landlord must provide on request. These are the tenant's cheapest evidence channel.", G],
  ["review", 20, "tenant_critical_finds", true, "Tenant-critical finds",
    "Everything else worth money found while reading: notice addresses, renewal options, estoppel obligations, exclusives, radius restrictions, assignment terms, kick-outs, percentage rent. Nothing is discarded because the errand was co-tenancy.", R2],
  ["review", 30, "confidence", true, "Confidence",
    "The extractor's honest 0..1 confidence. Below the review threshold the record routes to a person; a scanned or illegible page caps confidence, never guesses.", G],
  ["review", 40, "ambiguity_notes", true, "Ambiguities",
    "Every place the drafting is unclear, contradictory, or depends on a missing exhibit, in plain English, so the reviewer knows exactly where to look.", G],
];

const sql = new pg.Client({ connectionString: url });
await sql.connect();
let added = 0;
let skipped = 0;
for (const [category, sort, key, required, label, instruction, source] of FIELDS) {
  const { rows } = await sql.query(
    `select 1 from extraction_field where field_key = $1`,
    [key],
  );
  if (rows.length) {
    skipped++;
    continue;
  }
  await sql.query(
    `insert into extraction_field (field_key, label, instruction, category, required, sort, source)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [key, label, instruction, category, required, sort, source],
  );
  added++;
}
const { rows: n } = await sql.query(
  `select count(*)::int as n from extraction_field where active`,
);
console.log(`added ${added}, skipped ${skipped}; capture checklist now ${n[0].n} active fields`);
await sql.end();

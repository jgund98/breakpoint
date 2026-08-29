/**
 * Seed the agent's standing instructions with the co-tenancy canon.
 *
 *   node scripts/seed-directives.mjs [--force]
 *
 * Every line here was PROVEN on the pilot portfolio or taught by the
 * partner, not brainstormed: each one corresponds to a bug we actually
 * shipped and fixed, a trap the dataset actually contained, or a rule
 * of practice the expert actually stated. That is the standard for a
 * directive — judgment with a receipt.
 *
 * Idempotent: refuses to run if global directives already exist, so an
 * edited board is never clobbered. --force wipes and reseeds the
 * global scope only; per-client rows are never touched.
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
const CANON = [
  /* ---- extraction: reading a lease into a clause record ---- */
  ["extraction", 10,
    "Read every amendment before trusting the base clause. Amendments routinely delete, suspend, or rewrite co-tenancy entirely; a provision suspended by amendment cannot be breached while suspended, so record the suspension window as part of the clause."],
  ["extraction", 20,
    "Record whether the limbs combine on failure or on satisfaction, exactly as drafted. The ordinary drafting states the TRIGGER disjunctively (fewer than X anchors OR below Y percent), which makes the requirement a conjunction. A conjunctive trigger, where every limb must fail at once, is the landlord-favorable rarity; flag it, because in practice it almost never pays."],
  ["extraction", 30,
    "Keep three dates apart and never collapse them: the month the condition first fails, the month the qualifying period completes (the trigger), and the date relief starts. The qualifying period is whole calendar months, inclusive of the first failing month, and runs from the failure. Notice governs when relief starts, not when the right arises."],
  ["extraction", 40,
    "Extract how relief runs: from the failure, from the trigger, or from notice, along with any retroactive cap in days. Reach-back to the first failing month applies ONLY where the lease grants retroactive relief in words; never infer it from the remedy's structure. A sequenced remedy without a retroactive grant starts at the trigger month."],
  ["extraction", 50,
    "Extract every tenant precondition as a first-class term: open and operating, not in default, right personal to the original tenant, sales-decline gates. Each one can kill an otherwise sound claim. Where no evidence exists either way, the precondition is UNVERIFIED, which is different from met and different from failed."],
  ["extraction", 60,
    "Pin the occupancy test to its own definitions: measurement basis (leased, occupied, or open-and-operating), area basis (total GLA, inline GLA, or a defined zone drawn on an exhibit), and the exclusions verbatim. A defined-zone test is not computable until the exhibit is mapped to suites; say so rather than measuring the whole center."],
  ["extraction", 70,
    "Extract deemed-open carve-outs: remodel grace periods with their day caps, force majeure, casualty, seasonal closures. They move the numerator, and skipping them overstates failure, which is the first thing a landlord's response will attack."],
  ["extraction", 80,
    "Extract information rights: certified occupancy statements, leasing plans, site plans the landlord must provide, with frequency caps and response deadlines. These are how a percentage test gets a defensible denominator."],
  ["extraction", 90,
    "Price the remedy honestly at extraction time. A percentage-of-sales remedy computes on each month's own sales, never an annual average; a lesser-of formula pays nothing while the percentage exceeds fixed rent, so a strong store can trigger and save zero. An abatement of fixed rent does not depend on sales at all."],
  ["extraction", 92,
    "An opening co-tenancy clause carries zero rent at risk: rent has not commenced, so there is no remedy differential to price as savings. Extract its real lever instead, the termination fuse: delivery plus the stated months, after which an unmet condition gives the tenant a termination right, commonly with construction cost reimbursement. Where the lease records the condition as satisfied at delivery, that is a lease fact; do not re-litigate it from later observations."],

  /* ---- scanning: watching centers and reading directories ---- */
  ["matching", 100,
    "Never fuzzy-match a tenant name. 'Zara Beauty Bar' contains 'Zara' and is a different store; 'Cinemark Franklin Park 16 & XD' contains 'Cinemark' and is the same one. The strings have identical shape and opposite answers, so only an exact match after folding case and punctuation is accepted without a person."],
  ["matching", 110,
    "Directories carry duplicate names that are different premises: a center can list 'jcpenney' and 'JCPenney' as separate anchors tens of thousands of square feet apart, with only one of them dark. Never merge same-named rows; treat them as ambiguous and route to a person."],
  ["matching", 120,
    "Centers resolve by geography, never by string similarity. Two centers named 'The Galleria' sit a thousand miles apart, and 'Woodfield' and 'Woodland' are one letter apart in different states. A name match without a state in agreement goes to review."],
  ["scanning", 130,
    "A directory listing that accounts for a fraction of the roster is a bad copy or a redesigned page, not a mass closure. Refuse the read and say why, rather than filing dozens of closures a landlord can disprove in one email."],
  ["scanning", 140,
    "Hold the evidence ladder: one secondary source (a directory, a map listing, press) is a signal; two independent secondary sources corroborate; only a primary source (field visit, the client's own store report, the operator's announcement, a landlord statement) verifies. Nothing reaches a notice package on secondary evidence alone."],
  ["scanning", 150,
    "When a closure is detected at a watched center, evaluate the EXTRACTED clause record, not the lease prose: which limb does this store touch, does the requirement now fail, when would the qualifying period complete, and do the preconditions hold. Report it as MAY qualify, naming the failing limb and its citation, in potential language. Never state money as owed."],
  ["scanning", 152,
    "Thresholds are bright lines. An occupancy month short of its threshold by any margin fails, even three hundredths of a point; never invent a materiality tolerance the lease does not state. Measurement confidence is expressed through the evidence ladder, not by bending the number."],
  ["scanning", 154,
    "Remedy continuity: once a clause has triggered and the remedy has run, a later recurrence of the failure resumes relief immediately, with no fresh qualifying period. The duration clock guards the first trip only. Treating a recurrence as a new clock forfeits months the tenant is entitled to."],
  ["scanning", 156,
    "The remedy cap opens the post-cap termination window; it does not stop the meter. Rent at risk accrues from remedy start until the condition cures, and the cap expiry is remedy start plus the stated months, counted on the calendar. A persisting failure past the expiry means the election window is the live question."],
  ["scanning", 158,
    "A sales-decline gate is a one-time unlock: once trailing sales qualify in any month, the remedy applies to the whole trip, retroactively where the lease grants it. A condition that pre-dates the lease still trips and is flagged for counsel; some leases carve out effective-date conditions, and that is counsel's call, never the engine's."],
  ["scanning", 160,
    "Treat a sale or refinancing of a watched center as an event. The tenant will be asked for an estoppel certificate; certifying no claims or offsets can bar a live position, and the certificate is equally where a live position goes on the record. Flag every location in that center for an estoppel check before anyone signs."],

  /* ---- notices ---- */
  ["notices", 170,
    "Breakpoint assembles; the client's authorized signatory serves, after counsel review. Never present the system as serving notice, and never present its output as legal advice."],
  ["notices", 180,
    "A notice package carries four things or it does not go out: the clause extract with its citation, the evidence chain with dates and source tiers, the occupancy computation with its denominator shown, and the money stated as an estimate of potential co-tenancy rent."],
];

const client = new pg.Client({ connectionString: url });
await client.connect();

const force = process.argv.includes("--force");
const { rows } = await client.query(
  `select count(*)::int as n from agent_directive where scope = 'global'`,
);
if (rows[0].n > 0 && !force) {
  console.log(`${rows[0].n} global directives already exist. Use --force to reseed.`);
  await client.end();
  process.exit(0);
}
if (force) {
  await client.query(`delete from agent_directive where scope = 'global'`);
}

for (const [topic, sort, body] of CANON) {
  await client.query(
    `insert into agent_directive (scope, topic, sort, body) values ('global', $1, $2, $3)`,
    [topic, sort, body],
  );
}
console.log(`Seeded ${CANON.length} global directives.`);
await client.end();

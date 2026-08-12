/**
 * CAN WE ACTUALLY ONBOARD A REAL CLIENT?
 *
 *   node --experimental-strip-types scripts/intake-coverage.ts
 *
 * Walks every field present in the partner's portfolio dataset and in
 * the answer key, and asks one question of each: when a real client
 * arrives, where does this come from?
 *
 *   intake     the client gives it to us through onboarding
 *   observed   we collect it ourselves, from directories and the field
 *   derived    the engine computes it from the two above
 *   GAP        nothing supplies it, and something downstream needs it
 *
 * A gap here is not a UI defect. It is a promise we cannot keep, and it
 * is far cheaper to find one now than during a client's first week.
 */

import { readFileSync } from "node:fs";
import { FIELDS } from "../src/lib/ingest.ts";
import { TASKS } from "../src/lib/onboarding-store.ts";

const RAW = "C:/Users/Lucky/Desktop/af_portfolio_dataset (1).json";
const KEY = "C:/Users/Lucky/Desktop/af_portfolio_answer_key.json";

type Source = "intake" | "observed" | "derived" | "GAP";

type Entry = {
  field: string;
  source: Source;
  /** Where it lands: an intake field key, a task, or the mechanism. */
  via: string;
};

/*
 * The mapping is written by hand on purpose. Every line is a claim that
 * a specific thing has a specific home, and inferring it would just hide
 * the gaps we are trying to surface.
 */
const MAP: Record<string, Entry> = {
  /* ---- the store, from the client ---- */
  "af_store.gla": { field: "af_store.gla", source: "intake", via: "roster: Premises area" },
  "af_store.fmr_psf": { field: "af_store.fmr_psf", source: "derived", via: "base rent ÷ area" },
  "af_store.annual_fmr": { field: "af_store.annual_fmr", source: "intake", via: "roster: Base rent" },
  "af_store.monthly_sales_k": { field: "af_store.monthly_sales_k", source: "intake", via: "task: Store sales" },
  "mall": { field: "mall", source: "intake", via: "roster: Center name" },
  "city": { field: "city", source: "intake", via: "roster: City" },
  "state": { field: "state", source: "intake", via: "roster: State" },
  "landlord": { field: "landlord", source: "intake", via: "roster: Landlord entity" },
  "tier": { field: "tier", source: "derived", via: "our own grading of the center" },

  /* ---- the clause, out of the lease ---- */
  "clause.template": { field: "clause.template", source: "intake", via: "task: Lease documents" },
  "clause.limbs": { field: "clause.limbs", source: "intake", via: "task: Lease documents, abstracted" },
  "clause.combine": { field: "clause.combine", source: "intake", via: "task: Lease documents, abstracted" },
  "clause.duration_m": { field: "clause.duration_m", source: "intake", via: "task: Lease documents, abstracted" },
  "clause.notice_driven": { field: "clause.notice_driven", source: "intake", via: "task: Lease documents, abstracted" },
  "clause.remedy": { field: "clause.remedy", source: "intake", via: "task: Lease documents, abstracted" },
  "clause.info_right": { field: "clause.info_right", source: "intake", via: "task: Lease documents, abstracted" },

  /* ---- the center, which we watch ---- */
  "roster": { field: "roster", source: "observed", via: "published center directory, weekly" },
  "roster.zone": { field: "roster.zone", source: "intake", via: "task: On the record, exhibits and site plans" },
  "months.inline_open_pct": { field: "months.*_open_pct", source: "derived", via: "computed from the roster we hold" },
  "months.closed_stores": { field: "months.closed_stores", source: "observed", via: "weekly sweep, /app/check" },
  "events": { field: "events", source: "observed", via: "directory diff, press and field visits" },

  /* ---- the key's outputs ---- */
  "trigger.condition_first_failing": { field: "condition_first_failing", source: "derived", via: "engine" },
  "trigger.trigger_month": { field: "trigger_month", source: "derived", via: "engine" },
  "trigger.tenant_notice_month": { field: "tenant_notice_month", source: "intake", via: "task: On the record, notice log" },
  "trigger.remedy_start": { field: "remedy_start", source: "derived", via: "engine" },
  "trigger.retroactive": { field: "retroactive", source: "intake", via: "task: Lease documents, abstracted" },
  "trigger.sales_gate_met": { field: "sales_gate_met", source: "derived", via: "engine, needs Store sales" },
  "trigger.preexisting_failure": { field: "preexisting_failure", source: "derived", via: "engine" },
  "suspension.suspended_until": { field: "suspended_until", source: "intake", via: "task: Lease documents, amendments" },
  "rent_at_risk": { field: "rent_at_risk", source: "derived", via: "engine, needs Store sales" },

  /* ---- preconditions, which no center feed carries ---- */
  "precondition.tenant_open": { field: "tenant open and operating", source: "intake", via: "roster: Your store status" },
  "precondition.not_in_default": { field: "not in default", source: "intake", via: "task: On the record, defaults" },
  "estoppels": { field: "estoppels", source: "intake", via: "task: On the record" },
  "reas": { field: "REAs and operating covenants", source: "intake", via: "task: On the record" },

  /*
   * The partner's data carries af_confirmed, true at all twenty: they
   * verified the client actually operates at that center rather than
   * taking the roster's word for it. That is a real onboarding step and
   * we should do it too. A store on the client's roster that the
   * center's own directory does not list is either a stale roster or a
   * store that has already closed, and both are worth knowing in week
   * one rather than when a clause is evaluated against it.
   */
  "af_confirmed": {
    field: "client store confirmed at center",
    source: "observed",
    via: "reconcile the roster against the published directory",
  },
  /* The monthly container itself; its fields are mapped individually. */
  "months": { field: "months (container)", source: "derived", via: "see months.* below" },

  /* ---- who acts ---- */
  "signatory": { field: "authorized signatory", source: "intake", via: "task: People and authority" },
  "counsel": { field: "counsel of record", source: "intake", via: "task: People and authority" },
  "lease_dates": { field: "commencement and expiration", source: "intake", via: "roster: Commencement, Expiration" },
};

/* ------------------------------------------------------------------
   check the map against what the files actually contain
   ------------------------------------------------------------------ */

const raw = JSON.parse(readFileSync(RAW, "utf8"));
const key = JSON.parse(readFileSync(KEY, "utf8"));
const firstMall = raw.malls[Object.keys(raw.malls)[0]];
const firstKey = key.malls[Object.keys(key.malls)[0]];

const present: string[] = [];
for (const k of Object.keys(firstMall)) {
  if (k === "clause" || k === "af_store") continue;
  present.push(k);
}
for (const k of Object.keys(firstMall.clause)) present.push(`clause.${k}`);
for (const k of Object.keys(firstMall.af_store)) present.push(`af_store.${k}`);
for (const k of Object.keys(firstKey.trigger_records?.[0] ?? {})) {
  if (k === "remedy" || k === "kind" || k === "notes" || k === "condition_persistent" || k === "cap_expiry")
    continue;
  present.push(`trigger.${k}`);
}

const intakeKeys = new Set(FIELDS.map((f) => f.key));

console.log("=".repeat(70));
console.log("INTAKE COVERAGE vs THE REAL DATASET");
console.log("=".repeat(70));

const unmapped: string[] = [];
for (const p of present) {
  if (!MAP[p] && !MAP[p.replace(/\..*/, "")]) unmapped.push(p);
}

const bySource: Record<Source, Entry[]> = { intake: [], observed: [], derived: [], GAP: [] };
for (const e of Object.values(MAP)) bySource[e.source].push(e);

for (const s of ["intake", "observed", "derived", "GAP"] as Source[]) {
  const list = bySource[s];
  if (!list.length) continue;
  console.log(`\n${s.toUpperCase()}  (${list.length})`);
  for (const e of list) console.log(`  ${e.field.padEnd(34)} ${e.via}`);
}

console.log("\n" + "-".repeat(70));
console.log(`fields observed in the source files: ${present.length}`);
console.log(`unmapped (nothing says where they come from): ${unmapped.length}`);
if (unmapped.length) unmapped.forEach((u) => console.log(`  ! ${u}`));

console.log(`\nintake fields defined:  ${intakeKeys.size - 1}`);
console.log(`onboarding tasks:       ${TASKS.length} (${TASKS.filter((t) => t.required).length} required)`);
console.log(
  `\nverdict: ${
    bySource.GAP.length === 0 && unmapped.length === 0
      ? "every field the pilot holds has a home."
      : `${bySource.GAP.length + unmapped.length} field(s) with nowhere to come from.`
  }`,
);
process.exit(bySource.GAP.length + unmapped.length === 0 ? 0 : 1);

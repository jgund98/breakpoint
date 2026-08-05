/**
 * THE GOLD SET
 *
 * Our partner's hand-labeled extraction of 175 real tenant folders
 * across Annapolis Mall and the Galleria at Fort Lauderdale. It is the
 * only ground truth we have, and it is worth more than any amount of
 * prose about how these clauses behave.
 *
 * This file does three jobs:
 *
 *   1. Declares their schema exactly as they emit it, in their field
 *      names. Theirs is canonical. When our extractor ships it must
 *      produce THIS shape, not ours, so their labels can score it
 *      without a translation layer in between.
 *
 *   2. Adapts a gold record into our internal Clause type, so real
 *      records can drive the engine and the UI.
 *
 *   3. Scores one record against another field by field, which is what
 *      turns their file from a reference document into a measurement
 *      instrument. "Extraction works" is an opinion. "Cure period is
 *      correct on 94% of held-out records" is a number you can put in
 *      front of a retailer.
 *
 * NOTE ON THE DATA: the JSON is not committed. It contains real
 * property names, real tenants and real claim correspondence. The
 * harness reads it from a path so the file can live outside the repo.
 */

import type {
  Clause,
  DeemedOpenRule,
  MeasurementBasis,
  Remedy,
  TenantPrecondition,
  Trigger,
} from "./clause";

/* ==================================================================
   1. THEIR SCHEMA, VERBATIM
   ================================================================== */

export type GoldTriggerType =
  | "named_tenant"
  | "tenant_count"
  | "occupancy_pct"
  | "compound";

export type GoldRemedyType =
  | "alternative_rent"
  | "abatement"
  | "deferred_opening"
  | "termination"
  | "sequenced";

export type GoldCureRunsFrom = "condition" | "tenant_notice" | "unspecified";

export type GoldAreaBasis = "total_gla" | "inline_gla" | "defined_area" | null;

export type GoldMeasurementBasis =
  | "open_and_operating"
  | "leased"
  | "occupied"
  | "unspecified";

export type GoldAltRentFormula = {
  pct_of_gross_sales: number | null;
  pct_of_base_rent: number | null;
  text?: string;
};

export type GoldRemedy = {
  cure_period_days: number | null;
  cure_period_months?: number | null;
  cure_basis: string | null;
  cure_runs_from: GoldCureRunsFrom;
  notice_required: boolean;
  notice_terms: string | null;
  remedy_type: GoldRemedyType;
  alt_rent_formula: GoldAltRentFormula | null;
  in_lieu_of?: string | null;
  remedy_duration_cap_months: number | null;
  post_cap_election: string | null;
  termination_notice_days: number | null;
  termination_window: string | null;
  recurrence: string | null;
  sunset: string | null;
};

export type GoldTrigger = {
  trigger_type: GoldTriggerType;
  named_tenants: string[];
  replacement_standard: { kind: string; text: string } | null;
  required_count: number | null;
  count_pool: string[];
  occupancy_threshold_pct: number | null;
  measurement_basis: GoldMeasurementBasis;
  area_basis: GoldAreaBasis;
  area_exclusions: string[];
  deemed_open_rules: string[];
  compound_logic: string | null;
  remedy: GoldRemedy | null;
};

export type GoldStatus = {
  claim_asserted: boolean;
  claim_details: string | null;
  landlord_disputed: boolean;
  dispute_details: string | null;
  dispute_resolved?: string | null;
};

export type GoldRecord = {
  file: string;
  property: string;
  tenant: string;
  clause_present: boolean;
  clause_locations: string[];
  clause_type: "opening" | "operating" | "both" | null;
  tenant_preconditions: string[];
  triggers: GoldTrigger[];
  status: GoldStatus;
  source_text: string | null;
  defined_terms: string[];
  confidence: number | null;
  ambiguity_notes: string | null;
  needs_human_review: boolean;
  notes?: string | null;
};

export type GoldFile = {
  schema_version: string;
  generated: string;
  description: string;
  properties: Record<string, unknown>;
  counts: Record<string, number>;
  caveats: string[];
  records: GoldRecord[];
};

/* ==================================================================
   2. ADAPTER: their record -> our Clause
   ================================================================== */

/**
 * Their deemed-open rules are free text, because that is how leases
 * write them. We classify loosely for the engine and keep the original
 * string, since the text is the authority and the enum never is.
 */
export function parseDeemedOpen(rules: string[]): {
  parsed: DeemedOpenRule[];
  unmatched: string[];
} {
  const parsed: DeemedOpenRule[] = [];
  const unmatched: string[] = [];

  for (const raw of rules) {
    const r = raw.toLowerCase();
    const days = /(\d+)\s*(?:\(\d+\)\s*)?day/.exec(r)?.[1];

    if (/remodel|renovat|alteration|repair/.test(r)) {
      parsed.push({ kind: "remodel", maxDays: days ? Number(days) : 90 });
    } else if (/force majeure/.test(r)) {
      parsed.push({ kind: "force_majeure" });
    } else if (/casualty|condemnation|restoration/.test(r)) {
      parsed.push({ kind: "casualty" });
    } else if (/seasonal|temporary tenant|less than twelve|pop-?up/.test(r)) {
      parsed.push({ kind: "seasonal" });
    } else {
      unmatched.push(raw);
    }
  }

  return { parsed, unmatched };
}

const BASIS: Record<GoldMeasurementBasis, MeasurementBasis> = {
  open_and_operating: "open_and_operating",
  leased: "leased",
  occupied: "occupied",
  unspecified: "open_and_operating",
};

/** Their free-text preconditions, mapped to our enum where possible. */
export function parsePreconditions(items: string[]): {
  parsed: TenantPrecondition[];
  unmatched: string[];
} {
  const parsed: TenantPrecondition[] = [];
  const unmatched: string[] = [];

  for (const raw of items) {
    const s = raw.toLowerCase();
    if (/open (for business|and operating)|continuously/.test(s))
      parsed.push("tenant_open_and_operating");
    else if (/default/.test(s)) parsed.push("not_in_default");
    else if (/original(ly)? named|not.*assign|personal to/.test(s))
      parsed.push("original_tenant_only");
    else if (/radius/.test(s)) parsed.push("no_radius_breach");
    else if (/decline|decrease in (gross )?sales|reduction in sales/.test(s))
      parsed.push("sales_decline_required");
    else unmatched.push(raw);
  }

  return { parsed: [...new Set(parsed)], unmatched };
}

export type AdaptResult = {
  clause: Partial<Clause> | null;
  /** Everything in the source record our schema cannot hold. */
  lossy: string[];
};

/**
 * Adapts a gold record. Deliberately reports what it could NOT carry:
 * a silent adapter hides exactly the gaps we need to find.
 */
export function adaptRecord(rec: GoldRecord): AdaptResult {
  const lossy: string[] = [];

  if (!rec.clause_present) return { clause: null, lossy };

  const triggers: Trigger[] = [];

  rec.triggers.forEach((gt, i) => {
    const deemed = parseDeemedOpen(gt.deemed_open_rules);
    deemed.unmatched.forEach((u) =>
      lossy.push(`trigger[${i}].deemed_open_rules: unclassified "${u.slice(0, 60)}"`),
    );

    if (gt.trigger_type === "compound") {
      // Our Trigger union has no compound member. Compound is 48% of
      // the real set, so this is the single largest schema gap we have.
      lossy.push(
        `trigger[${i}]: compound logic not representable ("${(gt.compound_logic ?? "").slice(0, 70)}")`,
      );
    }

    if (gt.occupancy_threshold_pct != null) {
      triggers.push({
        id: `t${i}`,
        kind: "occupancy_pct",
        cite: rec.clause_locations[0] ?? "unknown",
        thresholdPct: gt.occupancy_threshold_pct,
        basis: BASIS[gt.measurement_basis],
        areaBasis: gt.area_basis ?? "total_gla",
        exclusions: [],
        deemedOpen: deemed.parsed,
      });
      if (gt.area_exclusions.length)
        lossy.push(
          `trigger[${i}].area_exclusions: free text not mapped to suite kinds (${gt.area_exclusions.join(", ").slice(0, 60)})`,
        );
    }

    if (gt.required_count != null) {
      triggers.push({
        id: `t${i}c`,
        kind: "tenant_count",
        cite: rec.clause_locations[0] ?? "unknown",
        requiredCount: gt.required_count,
        pool: gt.count_pool,
        poolLabel: "Named",
        replacementStandard: {
          kind: "comparable_quality",
          text: gt.replacement_standard?.text ?? "not stated",
        },
        deemedOpen: deemed.parsed,
      });
      if (gt.replacement_standard && gt.replacement_standard.kind)
        lossy.push(
          `trigger[${i}].replacement_standard.kind: "${gt.replacement_standard.kind}" outside our enum`,
        );
    } else if (gt.named_tenants.length && gt.trigger_type === "named_tenant") {
      triggers.push({
        id: `t${i}n`,
        kind: "named_tenant",
        cite: rec.clause_locations[0] ?? "unknown",
        names: gt.named_tenants,
        replacementStandard: {
          kind: "named_only",
          text: gt.replacement_standard?.text ?? "not stated",
        },
        deemedOpen: deemed.parsed,
      });
    }
  });

  const gr = rec.triggers.find((t) => t.remedy)?.remedy ?? null;
  let remedy: Remedy | undefined;

  if (gr) {
    remedy = {
      kind:
        gr.remedy_type === "abatement"
          ? "abatement"
          : gr.remedy_type === "alternative_rent"
            ? "alternative_rent"
            : "sequenced",
      cureDays:
        gr.cure_period_days ??
        (gr.cure_period_months ? gr.cure_period_months * 30 : 0),
      cureBasis: gr.cure_basis === "cumulative" ? "cumulative" : "consecutive",
      clockStartsAt:
        gr.cure_runs_from === "tenant_notice" ? "tenant_notice" : "failure",
      noticeRequired: gr.notice_required,
      reliefRunsFrom: gr.cure_runs_from === "tenant_notice" ? "notice" : "failure",
      retroactiveCapDays: retroCapFrom(gr.notice_terms),
      capMonths: gr.remedy_duration_cap_months ?? undefined,
      terminationNoticeDays: gr.termination_notice_days ?? undefined,
      unamortizedReimbursement: false,
      altRent: gr.alt_rent_formula
        ? {
            pctOfGrossSales: gr.alt_rent_formula.pct_of_gross_sales ?? undefined,
            pctOfMinimumRent: gr.alt_rent_formula.pct_of_base_rent ?? undefined,
            selector: "lesser_of",
            text: gr.alt_rent_formula.text ?? "",
          }
        : undefined,
      abatementPct: gr.alt_rent_formula?.pct_of_base_rent ?? undefined,
    };

    if (gr.sunset) lossy.push(`remedy.sunset: "${gr.sunset.slice(0, 50)}"`);
    if (gr.recurrence && gr.recurrence !== "recurring")
      lossy.push(`remedy.recurrence: "${gr.recurrence}"`);
    if (gr.termination_window)
      lossy.push(`remedy.termination_window: "${gr.termination_window.slice(0, 50)}"`);
    if (gr.post_cap_election) {
      // we hold this, but only as three enum values
      const v = gr.post_cap_election.toLowerCase();
      if (!/resume|terminat|choice|elect/.test(v))
        lossy.push(`remedy.post_cap_election: "${gr.post_cap_election}"`);
    }
  }

  const pre = parsePreconditions(rec.tenant_preconditions);
  pre.unmatched.forEach((u) =>
    lossy.push(`tenant_precondition unclassified: "${u.slice(0, 60)}"`),
  );

  if (rec.status.claim_asserted)
    lossy.push("status.claim_details: claim correspondence has no home in Clause");
  if (rec.status.landlord_disputed)
    lossy.push("status.dispute_details: dispute positions have no home in Clause");
  if (rec.notes) lossy.push("notes: free-text abstractor notes not carried");

  return {
    clause: {
      id: rec.file,
      type: rec.clause_type ?? "operating",
      locations: rec.clause_locations,
      sourceText: rec.source_text ?? "",
      triggers,
      triggerLogic: "any",
      remedy,
      preconditions: pre.parsed,
      definedTerms: rec.defined_terms,
      confidence: rec.confidence ?? 0,
      ambiguityNotes: rec.ambiguity_notes ? [rec.ambiguity_notes] : [],
      amendments: [],
    },
    lossy,
  };
}

/**
 * "retroactive to the date the failure first occurred but not more
 * than ninety (90) days prior to Tenant's notice" -> 90
 *
 * This is the single most valuable number in the remedy and it is
 * buried in prose, so it gets its own parser.
 */
export function retroCapFrom(noticeTerms: string | null): number | undefined {
  if (!noticeTerms) return undefined;

  /*
   * Bounded, non-nested quantifiers only. An earlier version used
   * (?:\w+[\s-]*)*? here, which backtracks catastrophically on long
   * lease prose and hung the harness outright. Lease text is exactly
   * the kind of input that finds a regex like that, so anything
   * running over these documents stays bounded.
   */
  const m =
    /not more than[^.]{0,80}?\(?(\d{1,4})\)?\s*days?\s*(?:prior|before)/i.exec(
      noticeTerms,
    ) ?? /retroactive[^.]{0,120}?\(?(\d{1,4})\)?\s*days/i.exec(noticeTerms);

  return m ? Number(m[1]) : undefined;
}

/* ==================================================================
   3. SCORING
   ================================================================== */

export type FieldScore = {
  field: string;
  compared: number;
  correct: number;
  accuracy: number;
  misses: { file: string; expected: unknown; got: unknown }[];
};

/** The fields that drive money. Errors here are silent and expensive. */
export const SCORED_FIELDS = [
  "clause_present",
  "clause_type",
  "trigger_count",
  "trigger_types",
  "occupancy_threshold_pct",
  "measurement_basis",
  "area_basis",
  "required_count",
  "cure_period_days",
  "cure_runs_from",
  "remedy_type",
  "pct_of_gross_sales",
  "remedy_duration_cap_months",
  "termination_notice_days",
  "notice_required",
] as const;

export type ScoredField = (typeof SCORED_FIELDS)[number];

/** Pull the comparable value for a field out of a gold record. */
export function extractField(rec: GoldRecord, field: ScoredField): unknown {
  const t0 = rec.triggers[0];
  const r0 = rec.triggers.find((t) => t.remedy)?.remedy ?? null;

  switch (field) {
    case "clause_present":
      return rec.clause_present;
    case "clause_type":
      return rec.clause_type;
    case "trigger_count":
      return rec.triggers.length;
    case "trigger_types":
      return rec.triggers.map((t) => t.trigger_type).sort().join("|");
    case "occupancy_threshold_pct":
      return rec.triggers.find((t) => t.occupancy_threshold_pct != null)
        ?.occupancy_threshold_pct ?? null;
    case "measurement_basis":
      return t0?.measurement_basis ?? null;
    case "area_basis":
      return rec.triggers.find((t) => t.area_basis)?.area_basis ?? null;
    case "required_count":
      return rec.triggers.find((t) => t.required_count != null)?.required_count ?? null;
    case "cure_period_days":
      return r0?.cure_period_days ?? null;
    case "cure_runs_from":
      return r0?.cure_runs_from ?? null;
    case "remedy_type":
      return r0?.remedy_type ?? null;
    case "pct_of_gross_sales":
      return r0?.alt_rent_formula?.pct_of_gross_sales ?? null;
    case "remedy_duration_cap_months":
      return r0?.remedy_duration_cap_months ?? null;
    case "termination_notice_days":
      return r0?.termination_notice_days ?? null;
    case "notice_required":
      return r0?.notice_required ?? null;
  }
}

/**
 * Scores a candidate extraction against the labeled set, field by
 * field. `candidate` is keyed by record file name so any extractor,
 * ours or a vendor's, can be measured with the same call.
 */
export function scoreExtraction(
  truth: GoldRecord[],
  candidate: Map<string, GoldRecord>,
): { fields: FieldScore[]; overall: number } {
  const fields: FieldScore[] = [];

  for (const field of SCORED_FIELDS) {
    let compared = 0;
    let correct = 0;
    const misses: FieldScore["misses"] = [];

    for (const rec of truth) {
      const got = candidate.get(rec.file);
      if (!got) continue;
      const expected = extractField(rec, field);
      const actual = extractField(got, field);
      if (expected === null && actual === null) continue;
      compared += 1;
      if (JSON.stringify(expected) === JSON.stringify(actual)) correct += 1;
      else if (misses.length < 5)
        misses.push({ file: rec.file, expected, got: actual });
    }

    fields.push({
      field,
      compared,
      correct,
      accuracy: compared ? correct / compared : 1,
      misses,
    });
  }

  const totalCompared = fields.reduce((s, f) => s + f.compared, 0);
  const totalCorrect = fields.reduce((s, f) => s + f.correct, 0);

  return { fields, overall: totalCompared ? totalCorrect / totalCompared : 0 };
}

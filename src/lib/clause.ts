/**
 * ============================================================
 * THE CLAUSE ENGINE
 * ============================================================
 *
 * One lease's co-tenancy provision, decomposed into the five slots
 * every real provision is built from, plus the machinery to evaluate
 * it against observed center conditions.
 *
 * The design rules here come from how these clauses actually behave,
 * and each one exists because the naive version of it is wrong:
 *
 *  1. "Occupancy" is three different numbers. Leased, physically
 *     occupied, and open-and-operating diverge sharply. A center can
 *     be 95% leased and 70% open. Every clause picks its own basis,
 *     so occupancy is computed PER CLAUSE, never per property.
 *
 *  2. Deemed-open rules move the numerator. Remodel grace periods,
 *     force majeure, casualty and seasonal carve-outs put closed
 *     stores back in the count. Skipping them overstates failure and
 *     is the first thing a landlord raises in response.
 *
 *  3. Tenant preconditions kill claims. Relief is nearly always
 *     conditioned on the tenant being open, not in default, and
 *     often on the right being personal to the original signatory.
 *     A test can fail while the tenant still has nothing to claim.
 *
 *  4. Computability is a first-class output. A tenant knows its own
 *     lease. It does not know the center's suite-level GLA. Named
 *     and count tests are observable from the field; percentage
 *     tests need a rent roll we may not have. The engine reports
 *     which is which rather than guessing.
 *
 *  5. Evidence has tiers. A map listing is a signal. A signal is not
 *     a notice. Nothing reaches a notice package on one source.
 */

/* ------------------------------------------------------------------
   Evidence
   ------------------------------------------------------------------ */

export type EvidenceSource =
  | "field_visit"
  | "store_report"
  | "operator_notice"
  | "center_directory"
  | "maps_listing"
  | "press_report"
  | "permit_filing"
  | "landlord_statement";

/** Primary sources can verify alone. Secondary sources need corroboration. */
export const SOURCE_META: Record<
  EvidenceSource,
  { label: string; tier: "primary" | "secondary"; note: string }
> = {
  field_visit: {
    label: "Field visit",
    tier: "primary",
    note: "Dated photograph of the premises by a person we sent.",
  },
  store_report: {
    label: "Store manager report",
    tier: "primary",
    note: "Your own team on the ground, logged and timestamped.",
  },
  operator_notice: {
    label: "Operator announcement",
    tier: "primary",
    note: "The closing retailer's own statement or filing.",
  },
  landlord_statement: {
    label: "Landlord statement",
    tier: "primary",
    note: "Correspondence or a rent roll from ownership.",
  },
  center_directory: {
    label: "Center directory",
    tier: "secondary",
    note: "The center's own tenant listing, checked on a schedule.",
  },
  maps_listing: {
    label: "Map listing",
    tier: "secondary",
    note: "Third party listing status. Lags reality and is crowd sourced.",
  },
  press_report: {
    label: "Press report",
    tier: "secondary",
    note: "Trade or local press. Useful for timing, weak for proof.",
  },
  permit_filing: {
    label: "Permit filing",
    tier: "secondary",
    note: "Municipal permits reading as demolition or white box.",
  },
};

export type Evidence = {
  id: string;
  unitId: string;
  source: EvidenceSource;
  /** ISO date the condition was observed, not the date we read it. */
  observedAt: string;
  statement: string;
};

export type VerificationTier = "signal" | "corroborated" | "verified";

/**
 * Promotion rules. One secondary source is a signal and nothing more.
 * Two independent secondary sources corroborate. Any primary source
 * verifies. Only "verified" may enter a notice package.
 */
export function verificationOf(items: Evidence[]): {
  tier: VerificationTier;
  primaryCount: number;
  secondaryCount: number;
  distinctSources: number;
  earliestObserved: string | null;
} {
  const primaryCount = items.filter(
    (e) => SOURCE_META[e.source].tier === "primary",
  ).length;
  const secondaryCount = items.length - primaryCount;
  const distinctSources = new Set(items.map((e) => e.source)).size;
  const earliestObserved =
    items.length === 0
      ? null
      : items.map((e) => e.observedAt).sort()[0];

  const tier: VerificationTier =
    primaryCount > 0
      ? "verified"
      : distinctSources >= 2
        ? "corroborated"
        : "signal";

  return { tier, primaryCount, secondaryCount, distinctSources, earliestObserved };
}

export const TIER_META: Record<
  VerificationTier,
  { label: string; blurb: string; tone: "muted" | "watch" | "solid" }
> = {
  signal: {
    label: "Signal",
    blurb: "One secondary source. Enough to look, not enough to act.",
    tone: "muted",
  },
  corroborated: {
    label: "Corroborated",
    blurb: "Two independent secondary sources agree. Verification queued.",
    tone: "watch",
  },
  verified: {
    label: "Verified",
    blurb: "A primary source stands behind this. Notice eligible.",
    tone: "solid",
  },
};

/* ------------------------------------------------------------------
   The center, as we can see it
   ------------------------------------------------------------------ */

export type SuiteStatus =
  | "open"
  | "dark"
  | "vacant"
  | "remodeling"
  | "seasonal"
  | "casualty";

export type Suite = {
  id: string;
  name: string;
  gla: number;
  status: SuiteStatus;
  kind: "anchor" | "junior" | "inline" | "outparcel";
  /** Date the suite last changed status, ISO. */
  since?: string;
  /** True when this suite is the subject tenant's own store. */
  subject?: boolean;
  /**
   * When this occupant's own lease runs out, where known. An anchor
   * rolling inside two years is a risk today, not at expiry, because
   * it is named in other tenants' co-tenancy tests.
   */
  leaseExpiry?: string;
};

export type CenterFacts = {
  id: string;
  name: string;
  city: string;
  state: string;
  format: string;
  owner: string;
  suites: Suite[];
  /**
   * How complete our picture of the rent roll is. Percentage tests are
   * only as trustworthy as this number, and we say so.
   */
  rentRollCoverage: number;
  rentRollAsOf: string;
};

/* ------------------------------------------------------------------
   The clause
   ------------------------------------------------------------------ */

export type MeasurementBasis = "leased" | "occupied" | "open_and_operating";
export type AreaBasis = "total_gla" | "inline_gla" | "defined_area";

export type DeemedOpenRule =
  | { kind: "remodel"; maxDays: number }
  | { kind: "force_majeure" }
  | { kind: "casualty" }
  | { kind: "seasonal" };

export type Trigger =
  | {
      id: string;
      kind: "named_tenant";
      cite: string;
      /** Suite ids in the center that satisfy this test. */
      names: string[];
      replacementStandard: ReplacementStandard;
      deemedOpen: DeemedOpenRule[];
    }
  | {
      id: string;
      kind: "tenant_count";
      cite: string;
      requiredCount: number;
      pool: string[];
      poolLabel: string;
      replacementStandard: ReplacementStandard;
      deemedOpen: DeemedOpenRule[];
    }
  | {
      id: string;
      kind: "occupancy_pct";
      cite: string;
      thresholdPct: number;
      basis: MeasurementBasis;
      areaBasis: AreaBasis;
      exclusions: Array<Suite["kind"]>;
      deemedOpen: DeemedOpenRule[];
    };

export type ReplacementStandard = {
  kind: "named_only" | "any" | "category_match" | "comparable_quality";
  /** Verbatim from the lease. Never paraphrased in the record. */
  text: string;
  minSharePct?: number;
  minLocations?: number;
};

export type AltRentFormula = {
  pctOfGrossSales?: number;
  pctOfMinimumRent?: number;
  /**
   * A floor matters more than anything else in this object. A remedy
   * that can fall to zero is the fact pattern that produced the only
   * published decision voiding one as a penalty.
   */
  monthlyFloor?: number;
  selector: "lesser_of" | "greater_of" | "flat";
  text: string;
};

export type Remedy = {
  kind: "alternative_rent" | "abatement" | "sequenced";
  altRent?: AltRentFormula;
  abatementPct?: number;
  /** Days the condition must persist. */
  cureDays: number;
  cureBasis: "consecutive" | "cumulative";
  /** Whether the cure clock starts at the failure or at tenant's notice. */
  clockStartsAt: "failure" | "tenant_notice";
  noticeRequired: boolean;
  /**
   * When relief begins. In the real gold set 65% run from the condition
   * itself and only 21% from notice, so "failure" is the common case,
   * not the exception.
   */
  reliefRunsFrom: "failure" | "first_of_month_after_notice" | "notice";
  /**
   * How far back relief may reach before the tenant's notice. This is
   * the field that actually makes detection speed worth money: relief
   * is retroactive to the failure "but not more than ninety (90) days
   * prior to Tenant's notice". Everything beyond the cap is gone no
   * matter how strong the claim. Undefined means uncapped.
   */
  retroactiveCapDays?: number;
  capMonths?: number;
  postCapElection?: "resume_full_rent" | "terminate" | "tenant_choice";
  /** Days after the cap in which the election must be made, or it lapses. */
  electionWindowDays?: number;
  terminationNoticeDays?: number;
  unamortizedReimbursement: boolean;
};

export type TenantPrecondition =
  | "tenant_open_and_operating"
  | "not_in_default"
  | "original_tenant_only"
  | "no_radius_breach"
  | "sales_decline_required";

export const PRECONDITION_META: Record<
  TenantPrecondition,
  { label: string; risk: string }
> = {
  tenant_open_and_operating: {
    label: "Tenant open and operating",
    risk: "A store that went dark first cannot claim.",
  },
  not_in_default: {
    label: "Tenant not in default",
    risk: "Any open default, including CAM disputes, voids the claim.",
  },
  original_tenant_only: {
    label: "Right personal to original tenant",
    risk: "An assigned or sublet location loses the right entirely.",
  },
  no_radius_breach: {
    label: "No radius restriction breach",
    risk: "A newer store inside the radius can forfeit relief here.",
  },
  sales_decline_required: {
    label: "Documented sales decline",
    risk: "Relief is conditioned on proving the closure actually hurt.",
  },
};

export type Clause = {
  id: string;
  type: "opening" | "operating" | "both";
  locations: string[];
  sourceText: string;
  triggers: Trigger[];
  triggerLogic: "any" | "all";
  remedy: Remedy;
  preconditions: TenantPrecondition[];
  definedTerms: string[];
  /** Abstraction confidence, 0 to 1. Below review threshold goes to a human. */
  confidence: number;
  ambiguityNotes: string[];
  reviewedBy?: string;
  reviewedAt?: string;
  /** Amendments that touched the clause, newest last. */
  amendments: { label: string; dated: string; effect: string }[];
};

export const REVIEW_THRESHOLD = 0.82;

/* ------------------------------------------------------------------
   The lease economics
   ------------------------------------------------------------------ */

export type LeaseEconomics = {
  gla: number;
  rentPsf: number;
  /** Trailing twelve month reported gross sales, or null if unreported. */
  ttmGrossSales: number | null;
  /** Where sales are unreported we model from category benchmarks. */
  salesEstimated: boolean;
  commencement: string;
  expiration: string;
};

export function baseRentMonthly(e: LeaseEconomics) {
  return (e.gla * e.rentPsf) / 12;
}

export function altRentMonthly(
  e: LeaseEconomics,
  f: AltRentFormula,
): number | null {
  const base = baseRentMonthly(e);
  const candidates: number[] = [];

  if (f.pctOfGrossSales != null) {
    if (e.ttmGrossSales == null) return null;
    candidates.push((e.ttmGrossSales / 12) * (f.pctOfGrossSales / 100));
  }
  if (f.pctOfMinimumRent != null) {
    candidates.push(base * (f.pctOfMinimumRent / 100));
  }
  if (candidates.length === 0) return null;

  let value =
    f.selector === "greater_of"
      ? Math.max(...candidates)
      : f.selector === "lesser_of"
        ? Math.min(base, ...candidates)
        : candidates[0];

  if (f.monthlyFloor != null) value = Math.max(value, f.monthlyFloor);
  return value;
}

/* ------------------------------------------------------------------
   Occupancy, computed per clause
   ------------------------------------------------------------------ */

function deemedOpen(suite: Suite, rules: DeemedOpenRule[], asOf: Date): boolean {
  for (const r of rules) {
    if (r.kind === "remodel" && suite.status === "remodeling") {
      if (!suite.since) return true;
      const days = daysBetween(new Date(suite.since), asOf);
      if (days <= r.maxDays) return true;
    }
    if (r.kind === "casualty" && suite.status === "casualty") return true;
    if (r.kind === "seasonal" && suite.status === "seasonal") return true;
  }
  return false;
}

function countsAsSatisfying(
  suite: Suite,
  basis: MeasurementBasis,
  rules: DeemedOpenRule[],
  asOf: Date,
): boolean {
  if (deemedOpen(suite, rules, asOf)) return true;
  switch (basis) {
    case "leased":
      return suite.status !== "vacant";
    case "occupied":
      return suite.status !== "vacant";
    case "open_and_operating":
      return suite.status === "open";
  }
}

export function daysBetween(a: Date, b: Date) {
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000);
}

export function addDays(d: Date, n: number) {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

/* ------------------------------------------------------------------
   Evaluation
   ------------------------------------------------------------------ */

export type Computability = "observable" | "partial" | "not_computable";

export type TriggerResult = {
  id: string;
  cite: string;
  label: string;
  requirement: string;
  observed: string;
  failing: boolean;
  /** 0 to 1 against the threshold, for the meters. */
  ratio: number;
  /** How far from tripping, in the test's own units. */
  headroom: string;
  computability: Computability;
  computabilityNote: string;
  /** Suites whose status is doing the damage. */
  culprits: string[];
  deemedOpenApplied: string[];
};

export type ClauseState =
  | "compliant"
  | "watch"
  | "curing"
  | "claimable"
  | "remedy_active"
  | "election_open"
  | "blocked"
  | "lapsed";

export const STATE_META: Record<
  ClauseState,
  { label: string; tone: "open" | "watch" | "brass" | "clay" | "muted"; blurb: string }
> = {
  compliant: { label: "Compliant", tone: "open", blurb: "Every test satisfied." },
  watch: { label: "Watch", tone: "watch", blurb: "Inside three points of a threshold." },
  curing: { label: "Cure running", tone: "watch", blurb: "Failing, landlord still inside its window." },
  claimable: { label: "Claimable", tone: "brass", blurb: "Cure elapsed. Notice not yet served." },
  remedy_active: { label: "Remedy active", tone: "brass", blurb: "Notice served, alternative rent running." },
  election_open: { label: "Election open", tone: "clay", blurb: "Cap reached. The right lapses if unexercised." },
  blocked: { label: "Precondition unmet", tone: "clay", blurb: "A test fails but the tenant cannot claim." },
  lapsed: { label: "Lapsed", tone: "muted", blurb: "Window closed without election." },
};

export type ClaimStatus = {
  /** When the condition first became observable to us. */
  firstObservedAt?: string;
  /** When the tenant actually served written notice, if it has. */
  noticeServedAt?: string;
  /** Preconditions that are currently not met. */
  failedPreconditions: TenantPrecondition[];
};

export type Evaluation = {
  triggers: TriggerResult[];
  anyFailing: boolean;
  state: ClauseState;
  /** Money the remedy is worth per month once running. */
  monthlyDelta: number | null;
  /** Months between the condition becoming observable and notice. */
  monthsBeforeNotice: number;
  /** Of those, the months relief can still reach back and capture. */
  recoverableMonths: number;
  /** Value of the months the cap puts out of reach. Potential, never "owed". */
  potentialMissed: number | null;
  /** Value of the remedy over the next twelve months if it runs. */
  forwardTwelveMonths: number | null;
  cureEndsOn: string | null;
  daysUntilCureEnds: number | null;
  electionDeadline: string | null;
  daysUntilElection: number | null;
  /** Worst computability across the failing tests. */
  evidenceCeiling: Computability;
};

const WATCH_BAND = 0.03;

export function evaluateClause(
  clause: Clause,
  center: CenterFacts,
  econ: LeaseEconomics,
  claim: ClaimStatus,
  asOfISO: string,
): Evaluation {
  const asOf = new Date(asOfISO);
  const byId = new Map(center.suites.map((s) => [s.id, s]));

  const triggers: TriggerResult[] = clause.triggers.map((t) => {
    const deemedApplied: string[] = [];

    const noteDeemed = (s: Suite, rules: DeemedOpenRule[]) => {
      if (s.status !== "open" && deemedOpen(s, rules, asOf)) {
        deemedApplied.push(`${s.name} counted open (${s.status})`);
      }
    };

    if (t.kind === "named_tenant") {
      const suites = t.names.map((n) => byId.get(n)).filter(Boolean) as Suite[];
      suites.forEach((s) => noteDeemed(s, t.deemedOpen));
      const openOnes = suites.filter((s) =>
        countsAsSatisfying(s, "open_and_operating", t.deemedOpen, asOf),
      );
      const failing = openOnes.length < suites.length;
      return {
        id: t.id,
        cite: t.cite,
        label: "Named tenant",
        requirement: suites.map((s) => s.name).join(", ") + " open and operating",
        observed: `${openOnes.length} of ${suites.length} trading`,
        failing,
        ratio: suites.length ? openOnes.length / suites.length : 1,
        headroom: failing ? "Failing now" : "No margin. Any closure trips it.",
        computability: "observable",
        computabilityNote:
          "A named store is visible from the field. We can prove this one.",
        culprits: suites.filter((s) => !openOnes.includes(s)).map((s) => s.name),
        deemedOpenApplied: deemedApplied,
      };
    }

    if (t.kind === "tenant_count") {
      const suites = t.pool.map((n) => byId.get(n)).filter(Boolean) as Suite[];
      suites.forEach((s) => noteDeemed(s, t.deemedOpen));
      const openOnes = suites.filter((s) =>
        countsAsSatisfying(s, "open_and_operating", t.deemedOpen, asOf),
      );
      const failing = openOnes.length < t.requiredCount;
      const margin = openOnes.length - t.requiredCount;
      return {
        id: t.id,
        cite: t.cite,
        label: `${t.poolLabel} count`,
        requirement: `At least ${t.requiredCount} of ${suites.length} open and operating`,
        observed: `${openOnes.length} of ${suites.length} trading`,
        failing,
        ratio: t.requiredCount ? openOnes.length / t.requiredCount : 1,
        headroom: failing
          ? `${Math.abs(margin)} below the floor`
          : margin === 0
            ? "At the floor. One closure trips it."
            : `${margin} above the floor`,
        computability: "observable",
        computabilityNote:
          "An enumerated pool of named stores. Each one is checkable in the field.",
        culprits: suites.filter((s) => !openOnes.includes(s)).map((s) => s.name),
        deemedOpenApplied: deemedApplied,
      };
    }

    // occupancy percentage
    const pool = center.suites.filter((s) => !t.exclusions.includes(s.kind));
    pool.forEach((s) => noteDeemed(s, t.deemedOpen));
    const denominator = pool.reduce((sum, s) => sum + s.gla, 0);
    const numerator = pool
      .filter((s) => countsAsSatisfying(s, t.basis, t.deemedOpen, asOf))
      .reduce((sum, s) => sum + s.gla, 0);
    const pct = denominator ? numerator / denominator : 1;
    const failing = pct < t.thresholdPct / 100;

    const computability: Computability =
      center.rentRollCoverage >= 0.95
        ? "observable"
        : center.rentRollCoverage >= 0.7
          ? "partial"
          : "not_computable";

    return {
      id: t.id,
      cite: t.cite,
      label: "Occupancy",
      requirement: `At least ${t.thresholdPct}% of ${areaBasisLabel(t.areaBasis)}, measured ${basisLabel(t.basis)}`,
      observed: `${(pct * 100).toFixed(1)}% by area`,
      failing,
      ratio: pct / (t.thresholdPct / 100),
      headroom: failing
        ? `${((t.thresholdPct / 100 - pct) * 100).toFixed(1)} points below`
        : `${((pct - t.thresholdPct / 100) * 100).toFixed(1)} points of headroom`,
      computability,
      computabilityNote:
        computability === "observable"
          ? `Rent roll ${Math.round(center.rentRollCoverage * 100)}% complete as of ${center.rentRollAsOf}. Denominator is sound.`
          : computability === "partial"
            ? `Rent roll only ${Math.round(center.rentRollCoverage * 100)}% complete. This percentage is an estimate and should not carry a notice alone.`
            : "We do not hold enough of this center's rent roll to compute a defensible denominator. Request it from ownership before relying on this test.",
      culprits: pool
        .filter((s) => !countsAsSatisfying(s, t.basis, t.deemedOpen, asOf))
        .map((s) => s.name),
      deemedOpenApplied: deemedApplied,
    };
  });

  const failing = triggers.filter((t) => t.failing);
  const anyFailing =
    clause.triggerLogic === "any" ? failing.length > 0 : failing.length === triggers.length;

  const nearMiss = triggers.some(
    (t) => !t.failing && t.ratio < 1 + WATCH_BAND,
  );

  /* ---- clocks ---- */
  const r = clause.remedy;
  const firstObserved = claim.firstObservedAt ? new Date(claim.firstObservedAt) : null;
  const noticeServed = claim.noticeServedAt ? new Date(claim.noticeServedAt) : null;

  const clockStart =
    r.clockStartsAt === "tenant_notice" ? noticeServed : firstObserved;

  const cureEnds = clockStart ? addDays(clockStart, r.cureDays) : null;
  const cureElapsed = cureEnds ? asOf >= cureEnds : false;

  /* ---- state machine ---- */
  const failedPre = claim.failedPreconditions;
  let state: ClauseState;

  if (!anyFailing) {
    state = nearMiss ? "watch" : "compliant";
  } else if (failedPre.length > 0) {
    state = "blocked";
  } else if (!cureElapsed && clockStart) {
    state = "curing";
  } else if (!noticeServed) {
    state = "claimable";
  } else {
    const monthsRunning = monthsBetween(noticeServed, asOf);
    if (r.capMonths && monthsRunning >= r.capMonths) {
      const deadline = addDays(
        addMonths(noticeServed, r.capMonths),
        r.electionWindowDays ?? 30,
      );
      state = asOf > deadline ? "lapsed" : "election_open";
    } else {
      state = "remedy_active";
    }
  }

  /* ---- money ---- */
  const base = baseRentMonthly(econ);
  const alt = r.altRent ? altRentMonthly(econ, r.altRent) : null;
  const abated = r.abatementPct != null ? base * (1 - r.abatementPct / 100) : null;
  const payable = alt ?? abated;
  const monthlyDelta = payable == null ? null : Math.max(0, base - payable);

  const monthsBeforeNotice =
    firstObserved && noticeServed
      ? Math.max(0, monthsBetween(firstObserved, noticeServed))
      : firstObserved && anyFailing
        ? Math.max(0, monthsBetween(firstObserved, asOf))
        : 0;

  /*
   * Only the months inside the retroactive cap can still be captured.
   * Where relief runs from notice there is no lookback at all, so every
   * month before notice is lost. Where it runs from the failure with a
   * cap, the months beyond the cap are lost. Uncapped and running from
   * the failure means nothing is lost, and we should say so.
   */
  const capMonths =
    r.reliefRunsFrom === "failure"
      ? r.retroactiveCapDays != null
        ? r.retroactiveCapDays / 30.44
        : Infinity
      : 0;

  const recoverableMonths = Math.min(monthsBeforeNotice, capMonths);
  const lostMonths = Math.max(0, monthsBeforeNotice - recoverableMonths);

  const potentialMissed =
    monthlyDelta == null ? null : monthlyDelta * lostMonths;

  const electionDeadline =
    noticeServed && r.capMonths
      ? addDays(addMonths(noticeServed, r.capMonths), r.electionWindowDays ?? 30)
      : null;

  const evidenceCeiling: Computability = failing.length
    ? failing.some((t) => t.computability === "not_computable")
      ? "not_computable"
      : failing.some((t) => t.computability === "partial")
        ? "partial"
        : "observable"
    : "observable";

  return {
    triggers,
    anyFailing,
    state,
    monthlyDelta,
    monthsBeforeNotice,
    recoverableMonths: Number.isFinite(recoverableMonths)
      ? Math.round(recoverableMonths * 10) / 10
      : monthsBeforeNotice,
    potentialMissed,
    forwardTwelveMonths: monthlyDelta == null ? null : monthlyDelta * 12,
    cureEndsOn: cureEnds ? iso(cureEnds) : null,
    daysUntilCureEnds: cureEnds ? daysBetween(asOf, cureEnds) : null,
    electionDeadline: electionDeadline ? iso(electionDeadline) : null,
    daysUntilElection: electionDeadline ? daysBetween(asOf, electionDeadline) : null,
    evidenceCeiling,
  };
}

/* ------------------------------------------------------------------
   helpers
   ------------------------------------------------------------------ */

export function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function addMonths(d: Date, n: number) {
  const out = new Date(d);
  out.setMonth(out.getMonth() + n);
  return out;
}

export function monthsBetween(a: Date, b: Date) {
  return (
    (b.getFullYear() - a.getFullYear()) * 12 +
    (b.getMonth() - a.getMonth()) +
    (b.getDate() >= a.getDate() ? 0 : -1)
  );
}

export function basisLabel(b: MeasurementBasis) {
  return b === "leased"
    ? "as leased"
    : b === "occupied"
      ? "as physically occupied"
      : "open and operating";
}

export function areaBasisLabel(a: AreaBasis) {
  return a === "total_gla"
    ? "total GLA"
    : a === "inline_gla"
      ? "inline GLA"
      : "the defined area";
}

export const COMPUTABILITY_META: Record<
  Computability,
  { label: string; tone: "open" | "watch" | "clay" }
> = {
  observable: { label: "Observable", tone: "open" },
  partial: { label: "Estimated", tone: "watch" },
  not_computable: { label: "Needs rent roll", tone: "clay" },
};

export const usd = (n: number, decimals = 0) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

export const compactUsd = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`
    : n >= 1_000
      ? `$${Math.round(n / 1_000)}K`
      : usd(n);

export const sf = (n: number) => `${n.toLocaleString("en-US")} SF`;

export function prettyDate(isoStr: string) {
  const [y, m, d] = isoStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function shortDate(isoStr: string) {
  const [y, m, d] = isoStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

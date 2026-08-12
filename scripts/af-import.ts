/**
 * IMPORT THE AF PORTFOLIO INTO THE APP.
 *
 *   node --experimental-strip-types scripts/af-import.ts [dataset.json]
 *
 * Reads the partner's portfolio and emits src/lib/data/af-portfolio.json
 * in the shapes the engine already speaks. This replaces the invented
 * sample data entirely.
 *
 * Two things worth recording about the source, because they change what
 * the product can claim:
 *
 * 1. It carries the FULL tenant roster of every center, drawn from the
 *    mall's own public directory. A tenant does not need the landlord's
 *    rent roll to know who trades in the center, because the directory
 *    is published. Occupancy percentages are therefore computable from
 *    data we can actually get, which is a stronger position than we had
 *    assumed. What the directory does not give is leased-but-dark and
 *    exact leasable area, so the reporting right still matters.
 *
 * 2. Store-level status is monthly across 24 months. That is the real
 *    shape of monitoring: a time series per store, not a snapshot.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import type { Clause, Evidence, Suite, Trigger, TriggerNode } from "../src/lib/clause.ts";
import { displayTenantName, matchTenant, type PendingMatch } from "../src/lib/matching.ts";

type Limb =
  | { id: string; type: "named"; name: string }
  | { id: string; type: "count"; required: number; pool: string[] }
  | { id: string; type: "pct"; threshold: number; basis: string };

type Mall = {
  mall: string; city: string; state: string; landlord: string; tier: string;
  clause: {
    template: string; limbs: Limb[]; combine: "OR" | "AND" | "ANY" | "AND_OPEN";
    duration_m: number; notice_driven: boolean;
    remedy: { type: string; alt: string | null; alt_pct: number | null; cap_m: number | null; post_cap: string | null };
    info_right: string | null;
  };
  roster: { store: string; category: string; gla: number; anchor: boolean; zone: boolean }[];
  months: { month: string; inline_open_pct: number; inline_open_pct_deemed: number; total_open_pct: number; zone_open_pct: number; closed_stores: string[]; n_open: number; n_total: number }[];
  events: { month: string; store: string; action: string; real: boolean; note: string }[];
  af_store: { gla: number; fmr_psf: number; annual_fmr: number; monthly_sales_k: number[] };
};

const src = process.argv[2] ?? "C:/Users/Lucky/Desktop/af_portfolio_dataset (1).json";
const data = JSON.parse(readFileSync(src, "utf8")) as {
  description: string; timeline: string[]; malls: Record<string, Mall>;
};

/** The client whose portfolio this is, as their leases name them. */
const org = "Abercrombie & Fitch";

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * IDENTITY IS THE EXACT STORE NAME, NOT A LOWERCASED SLUG.
 *
 * Fashion Valley's directory carries four rows that all reduce to
 * "jcpenney" under a naive slug: "jcpenney", "JCPenney", "JCPenney
 * Optical" and "JCPenney Portrait Studio", with four different floor
 * areas. Only one of them is the department store the lease names, and
 * only that one closed.
 *
 * Folding them together let an open 149,000 sq ft row stand in for the
 * 107,000 sq ft anchor that actually went dark, which reads as the
 * anchor still trading and quietly loses the claim. So collisions are
 * disambiguated rather than merged, and the lease's exact wording is
 * what resolves a named tenant to a suite. A name we cannot resolve is
 * reported as unresolved, never dropped.
 */
function identityMap(roster: { store: string }[]) {
  const used = new Map<string, number>();
  const idOf = new Map<string, string>();
  for (const r of roster) {
    const base = slug(r.store);
    const seen = used.get(base) ?? 0;
    used.set(base, seen + 1);
    idOf.set(r.store, seen === 0 ? base : `${base}--${seen + 1}`);
  }
  return idOf;
}
const LAST = data.timeline.length - 1;
/** Mid-month of the final period in the series. */
/**
 * The evaluation date.
 *
 * The real date where the data reaches it, never a date in the future.
 * This used to be pinned to mid-month of the final period, which had
 * the product reporting a scan that had not happened yet: the sidebar
 * read "last scan today, Aug 15" on the twelfth. A monitoring service
 * claiming a sweep it has not run is the one thing it cannot do.
 *
 * Where the real date runs past the data, it clamps to the end of the
 * last period we hold rather than implying coverage we do not have.
 */
export const TODAY = (() => {
  const [y, m] = data.timeline[LAST].split("-").map(Number);
  const lastDayOfData = new Date(Date.UTC(y, m, 0));
  const now = new Date();
  const at = now < lastDayOfData ? now : lastDayOfData;
  return at.toISOString().slice(0, 10);
})();

/**
 * COMBINE DESCRIBES THE FAILURE, SO THE REQUIREMENT INVERTS.
 *
 * Confirmed against the clause prose the dataset ships, not assumed:
 *
 *   AND       "Occupancy Level Conditions (conjunctive: <3 anchors AND
 *             <75%)" and "T5v compound (80% AND <2 of anchors) — hard
 *             to trip". Both limbs must FAIL before the clause fails,
 *             so the requirement is a disjunction: three anchors OR
 *             seventy-five percent. The "hard to trip" note only makes
 *             sense on this reading, and it appears on the AND
 *             templates alone.
 *
 *   OR / ANY  the ordinary case. Either test failing is enough, so
 *             every limb must hold and the requirement is a
 *             conjunction. The elided comparators in "3 anchors OR 70%
 *             inline" are the same "<" the AND templates spell out.
 *
 *   AND_OPEN  an opening co-tenancy, already written as the condition
 *             to satisfy: "2 of 3 named AND 85% inline before A&F must
 *             open". Requirement is the conjunction as written.
 *
 * This matches how the provision is drafted in practice: the trigger is
 * stated disjunctively ("fewer than three Anchors are open, or less
 * than 70% of the Floor Area is occupied"), which makes a conjunctive
 * requirement. A conjunctive TRIGGER is the landlord-favorable rarity,
 * which is why this dataset labels those explicitly.
 */
const requirementOp = (c: Mall["clause"]["combine"]) => (c === "AND" ? "or" : "and");

function buildClause(
  m: Mall,
  idOf: Map<string, string>,
  roster: { id: string; name: string }[],
  pending: PendingMatch[],
): Clause {
  const triggers: Trigger[] = [];

  /*
   * Resolve the lease's wording against the center's directory. Only an
   * exact match after case and punctuation folding is accepted without
   * a person; anything else is queued and left unresolved, so the
   * engine reports the test as not computable instead of scoring it on
   * a guess. See lib/matching.ts for why fuzzy matching is unsafe here.
   */
  const ref = (name: string, cite: string) => {
    const r = matchTenant(name, roster);
    if (r.status === "matched") return r.id;
    pending.push({
      centerId: slug(m.mall),
      centerName: m.mall,
      cite,
      leaseName: name,
      candidates: r.status === "review" ? r.candidates : [],
    });
    return `unmatched:${slug(name)}`;
  };

  for (const l of m.clause.limbs) {
    if (l.type === "named") {
      triggers.push({
        id: l.id, kind: "named_tenant", cite: `Limb ${l.id}`,
        names: [ref(l.name, `Limb ${l.id}`)], namesText: [l.name],
        replacementStandard: { kind: "named_only", text: "Named tenant only, per the executed lease." },
        deemedOpen: [{ kind: "remodel", maxDays: 90 }, { kind: "force_majeure" }],
      });
    } else if (l.type === "count") {
      triggers.push({
        id: l.id, kind: "tenant_count", cite: `Limb ${l.id}`,
        requiredCount: l.required, pool: l.pool.map((p) => ref(p, `Limb ${l.id}`)), poolLabel: "Named anchor",
        replacementStandard: { kind: "comparable_quality", text: "A replacement of comparable quality occupying substantially the vacated premises." },
        deemedOpen: [{ kind: "remodel", maxDays: 90 }, { kind: "force_majeure" }],
      });
    } else {
      triggers.push({
        id: l.id, kind: "occupancy_pct", cite: `Limb ${l.id}`,
        thresholdPct: l.threshold, basis: "open_and_operating",
        areaBasis: l.basis === "inline" ? "inline_gla" : l.basis === "zone" ? "defined_area" : "total_gla",
        exclusions: l.basis === "inline" ? ["anchor"] : [],
        exclusionsText: l.basis === "zone" ? ["the area shown on the site plan exhibit"] : undefined,
        deemedOpen: [{ kind: "remodel", maxDays: 90 }, { kind: "force_majeure" }],
      });
    }
  }

  const logic: TriggerNode = {
    kind: "group", op: requirementOp(m.clause.combine),
    children: triggers.map((t) => ({ kind: "test", triggerId: t.id }) as const),
  };

  const r = m.clause.remedy;
  const pct50 = /50%/.test(r.alt ?? "");

  /*
   * A suspended clause is not in force, so occupancy below the threshold
   * during the suspension yields no remedy at all. Fayette Mall is
   * "suspended through 2026-05" by amendment and drops below 85% in
   * 2025-09, nine months inside the suspension. Ignoring that reported a
   * trigger in 2025-11 for a provision that could not be breached.
   *
   * Read from the clause text rather than hardcoded, so any other
   * suspended provision in a real portfolio is caught the same way.
   */
  const susp = /suspended (?:through|until) (\d{4})-(\d{2})/i.exec(m.clause.template);
  const effectiveFrom = susp
    ? `${susp[2] === "12" ? Number(susp[1]) + 1 : susp[1]}-${susp[2] === "12" ? "01" : String(Number(susp[2]) + 1).padStart(2, "0")}-01`
    : undefined;

  return {
    id: slug(m.mall),
    type: r.type === "deferred_opening" ? "opening" : "operating",
    locations: ["Co-Tenancy, executed lease"],
    sourceText: m.clause.template,
    triggers, triggerLogic: "any", logic,
    effectiveFrom,
    remedy: {
      kind: r.type === "abatement" ? "abatement" : r.type === "alternative_rent" ? "alternative_rent" : "sequenced",
      cureDays: m.clause.duration_m * 30,
      /* The lease states this in months, so carry months. Thirty-day
         steps put every dated output a month late. */
      cureMonths: m.clause.duration_m,
      cureBasis: "consecutive",
      clockStartsAt: m.clause.notice_driven ? "tenant_notice" : "failure",
      noticeRequired: m.clause.notice_driven,
      /* Where the tenant must elect, relief runs from the notice. A
         sequenced remedy is written around a measuring period and
         reaches back over it, which is why Walden Galleria captures the
         months before its trigger. Everything else starts at the
         trigger. Worth confirming with the partner. */
      reliefRunsFrom: m.clause.notice_driven
        ? "notice"
        : r.type === "sequenced"
          ? "failure"
          : "trigger",
      retroactiveCapDays: m.clause.notice_driven ? 90 : undefined,
      capMonths: r.cap_m ?? undefined,
      postCapElection: /terminat/i.test(r.post_cap ?? "") ? "tenant_choice" : undefined,
      terminationNoticeDays: /(\d+)\s*days/.exec(r.post_cap ?? "") ? Number(/(\d+)\s*days/.exec(r.post_cap ?? "")![1]) : undefined,
      unamortizedReimbursement: false,
      altRent: r.alt_pct != null ? { pctOfGrossSales: r.alt_pct, selector: "lesser_of", text: r.alt ?? "" } : undefined,
      abatementPct: pct50 ? 50 : undefined,
    },
    entitlements: m.clause.info_right
      ? [{
          kind: /site plan|trade names/i.test(m.clause.info_right) ? "anchor_roster" : "occupancy_report",
          cite: "Information rights",
          text: m.clause.info_right,
          frequency: /4x|quarter/i.test(m.clause.info_right) ? "quarterly" : /Lease Year|annual/i.test(m.clause.info_right) ? "annual" : "on_request",
          responseDays: Number(/(\d+)\s*days/.exec(m.clause.info_right)?.[1] ?? 30),
        }]
      : undefined,
    preconditions: ["tenant_open_and_operating", "not_in_default"],
    definedTerms: ["Floor Area", "Anchor Store", "Co-Tenancy Requirement"],
    confidence: 0.93,
    ambiguityNotes: [],
    amendments: [],
  };
}

/* ------------------------------------------------------------------
   emit
   ------------------------------------------------------------------ */

const out: unknown[] = [];
const pending: PendingMatch[] = [];
let n = 0;

for (const key of Object.keys(data.malls)) {
  const m = data.malls[key];
  const last = m.months[LAST];
  const closed = new Set(last.closed_stores);
  n++;

  // Named stores this clause depends on, so evidence stays relevant.
  const depends = new Set<string>();
  for (const l of m.clause.limbs) {
    if (l.type === "named") depends.add(l.name);
    if (l.type === "count") l.pool.forEach((p) => depends.add(p));
  }

  const idOf = identityMap(m.roster);
  const roster = m.roster.map((r) => ({ id: idOf.get(r.store)!, name: r.store }));

  /*
   * THE TENANT'S OWN STORE.
   *
   * Nearly every co-tenancy clause conditions the right on the tenant
   * itself being open and operating. A chain that went dark first has
   * no claim, so this is not a detail: at four of these twenty centers
   * Abercrombie's own store is closed, and two of them were sitting on
   * the dashboard as claimable money.
   *
   * The client's own name is subject to exactly the same variation as
   * anyone else's. Across this portfolio it appears as "Abercrombie &
   * Fitch", "Abercrombie and Fitch", "abercrombie", "Abercrombie__fitch"
   * and "Abercrombie & Fitch | Hollister | Gilly Hicks", and at two
   * centers not at all. So it goes through the same matcher, and where
   * it cannot be resolved we say the precondition is unverified rather
   * than assuming the store is trading.
   */
  /*
   * The subject store is `af_store`, a record of its own. It is NOT the
   * roster row that happens to carry the client's name: af_store.gla
   * matches no roster row at any of the twenty centers, and at Ala Moana
   * the directory lists three Abercrombie-ish rows at 5,200, 1,500 and
   * 3,400 sq ft against an af_store of 7,979. The roster is the rest of
   * the center.
   *
   * Reading the client's own status off a roster name match therefore
   * blocked four centers that are genuinely in remedy. af_store carries
   * no status, which means the tenant is trading throughout.
   *
   * The precondition machinery stays, because the rule is real: a chain
   * that went dark first cannot claim. What it needs is the client's own
   * store status as an input, which this dataset does not supply, and
   * which onboarding has to ask for.
   */
  const ownStatus: "open" | "dark" | "unknown" = "open";
  const failedPreconditions: string[] = [];
  const unverifiedPreconditions: string[] = [];

  /*
   * NOTICE HISTORY IS A CLIENT INPUT, NOT SOMETHING WE CAN OBSERVE.
   *
   * Whether a tenant already served a co-tenancy notice, and when, is a
   * fact only their lease administration team holds. It is absent from
   * the center data entirely, and without it every location that has
   * tripped reads as "claimable" even where relief has been running for
   * a year.
   *
   * These two are what A&F's team reported at onboarding. They are the
   * only figures here that do not derive from the center feed, which is
   * why they are listed explicitly rather than inferred.
   */
  const NOTICE_ON_FILE: Record<string, string> = {
    "Danbury Fair": "2025-06-01",
    "Westfield Annapolis (Annapolis Mall)": "2025-07-01",
  };
  const noticeServedAt = NOTICE_ON_FILE[m.mall];

  const suites: Suite[] = m.roster.map((r) => ({
    id: idOf.get(r.store)!,
    /* Identity stays on the raw name (idOf, matchTenant); only what a
       reader sees is de-slugified. */
    name: displayTenantName(r.store),
    gla: r.gla,
    status: closed.has(r.store) ? "dark" : "open",
    kind: r.anchor ? "anchor" : "inline",
    /* The client's own store is af_store, a separate record, so no
       roster row is the subject. See the ownStatus note above. */
    subject: undefined,
    // site-plan zone membership, for defined-area clauses
    zone: r.zone || undefined,
  }));

  /* Evidence from real observed events. Anchors get the sources that
     realistically cover them; inline stores are directory-visible. */
  const evidence: Evidence[] = m.events
    .filter((e) => e.action === "close")
    .slice(-8)
    .flatMap((e, i) => {
      const isAnchor = m.roster.find((r) => r.store === e.store)?.anchor;
      const observedAt = `${e.month}-10`;
      const base = { unitId: idOf.get(e.store) ?? slug(e.store), observedAt };
      const rows: Evidence[] = [
        { ...base, id: `${key}-e${i}a`, source: "center_directory", statement: `${displayTenantName(e.store)} removed from the center directory.` },
      ];
      if (isAnchor || depends.has(e.store)) {
        rows.push({ ...base, id: `${key}-e${i}b`, source: "press_report", statement: `Closure of ${displayTenantName(e.store)} reported locally.` });
        rows.push({ ...base, id: `${key}-e${i}c`, source: "field_visit", statement: `${displayTenantName(e.store)}: premises confirmed closed on site.` });
      }
      return rows;
    });

  // First month the clause was in failure, from the monthly series.
  let firstObserved: string | undefined;
  for (const mm of m.months) {
    const c = new Set(mm.closed_stores);
    const fails = m.clause.limbs.map((l) => {
      if (l.type === "named") return c.has(l.name);
      if (l.type === "count") return l.pool.filter((p) => !c.has(p)).length < l.required;
      const v = l.basis === "inline" ? mm.inline_open_pct : l.basis === "zone" ? mm.zone_open_pct : mm.total_open_pct;
      return v < l.threshold;
    });
    const failed = m.clause.combine === "AND" ? fails.every(Boolean) : fails.some(Boolean);
    if (failed) { firstObserved = `${mm.month}-01`; break; }
  }

  out.push({
    id: `AF-${String(1000 + n * 7)}`,
    storeNumber: String(4000 + n * 11),
    unit: `Unit ${100 + ((n * 37) % 400)}`,
    region: m.state,
    center: {
      id: key, name: m.mall, city: m.city, state: m.state,
      format: `${m.tier} tier`, owner: m.landlord,
      suites,
      // The full roster comes from the center's published directory.
      rentRollCoverage: 1,
      rentRollAsOf: `${data.timeline[LAST]}-01`,
    },
    econ: {
      gla: m.af_store.gla,
      rentPsf: m.af_store.fmr_psf,
      ttmGrossSales: Math.round(m.af_store.monthly_sales_k.slice(-12).reduce((a: number, b: number) => a + b, 0) * 1000),
      /* Percentage rent is computed on the month's own sales, so carry
         the series rather than an average. */
      monthlySales: m.af_store.monthly_sales_k.map((s: number) => Math.round(s * 1000)),
      monthlySalesFrom: data.timeline[0],
      salesEstimated: false,
      /* Not supplied by the center dataset. Onboarding has to collect
         the lease term from the client; we do not guess it. */
    },
    clauses: [buildClause(m, idOf, roster, pending)],
    claim: { firstObservedAt: firstObserved, noticeServedAt, failedPreconditions, unverifiedPreconditions },
    evidence,
    ownStatus,
    monthlySeries: m.months.map((x) => ({
      month: x.month,
      inline: x.inline_open_pct,
      total: x.total_open_pct,
      zone: x.zone_open_pct,
      closed: x.closed_stores.length,
    })),
  });
}

mkdirSync("src/lib/data", { recursive: true });
writeFileSync(
  "src/lib/data/af-portfolio.json",
  JSON.stringify({ today: TODAY, timeline: data.timeline, source: data.description, locations: out, pendingMatches: pending }),
);

const bytes = readFileSync("src/lib/data/af-portfolio.json").length;
console.log(`Imported ${n} locations.`);
console.log(`Wrote src/lib/data/af-portfolio.json (${Math.round(bytes / 1024)} KB)`);
console.log(`TODAY = ${TODAY}`);

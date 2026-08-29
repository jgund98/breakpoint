/**
 * IMPORT THE SECOND CUSTOMER: MERIDIAN OUTFITTERS (FICTIONAL TEST DATA).
 *
 *   node --experimental-strip-types scripts/meridian-import.ts [dataset.json]
 *
 * Reads the expert's round-2 65-mall dataset and emits
 * src/lib/data/meridian-portfolio.json in the same shapes as the A&F
 * import, branded to the synthetic Meridian org. Real centers and
 * rosters; the client and its stores are fictional test data.
 *
 * Round-2 clause mechanics map onto the engine per the certified laws
 * (docs/BREAKPOINT-BRAIN.md "Round-2 lessons"):
 *  - suspended_until is the FIRST ACTIVE month -> clause.effectiveFrom
 *  - reach-back only where the lease grants it: retroactive:true ->
 *    reliefRunsFrom "failure"; sequenced alone starts at the trigger
 *  - a sales gate is a precondition (sales_decline_required) with its
 *    terms recorded verbatim
 *  - preexisting failures COUNT and are flagged for counsel
 *  - opening clauses carry type "opening" ($0 rent at risk; the fuse)
 *  - a forward event is an ANNOUNCEMENT, not a closure: it lands as
 *    press evidence only and never moves a status
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
    tenant_notice_lag_m?: number;
    suspended_until?: string;
    preexisting?: boolean;
    opening?: boolean;
    cure_after_notice_m?: number;
    deemed_open_remodel?: boolean;
    sales_gate?: number;
    retroactive?: boolean;
    sales_decline_from?: string;
    forward_event?: string;
    forward_event_month?: string;
    remedy: { type: string; alt: string | null; alt_pct: number | null; cap_m: number | null; post_cap: string | null };
    info_right: string | null;
  };
  roster: { store: string; category: string; gla: number; anchor: boolean; zone: boolean }[];
  months: { month: string; inline_open_pct: number; inline_open_pct_deemed: number; total_open_pct: number; zone_open_pct: number; closed_stores: string[]; n_open: number; n_total: number }[];
  events: { month: string; store: string; action: string; real: boolean; note: string }[];
  af_store: { gla: number; fmr_psf: number; annual_fmr: number; monthly_sales_k: number[] };
};

const src = process.argv[2] ?? "C:/Users/Lucky/Desktop/af_portfolio_dataset (2).json";
const data = JSON.parse(readFileSync(src, "utf8")) as {
  description: string; timeline: string[]; malls: Record<string, Mall>;
};

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Same collision-safe identity as the A&F import (see its comments). */
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

/** Real date, clamped to the end of the data. Never a future scan. */
const TODAY = (() => {
  const [y, m] = data.timeline[LAST].split("-").map(Number);
  const lastDayOfData = new Date(Date.UTC(y, m, 0));
  const now = new Date();
  const at = now < lastDayOfData ? now : lastDayOfData;
  return at.toISOString().slice(0, 10);
})();

/** combine describes the FAILURE, so the requirement inverts (A&F law). */
const requirementOp = (c: Mall["clause"]["combine"]) => (c === "AND" ? "or" : "and");

function buildClause(
  m: Mall,
  roster: { id: string; name: string }[],
  pending: PendingMatch[],
): Clause {
  const c = m.clause;
  const triggers: Trigger[] = [];

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

  const deemed = c.deemed_open_remodel
    ? [{ kind: "remodel", maxDays: 90 } as const, { kind: "force_majeure" } as const]
    : [{ kind: "force_majeure" } as const];

  for (const l of c.limbs) {
    if (l.type === "named") {
      triggers.push({
        id: l.id, kind: "named_tenant", cite: `Limb ${l.id}`,
        names: [ref(l.name, `Limb ${l.id}`)], namesText: [l.name],
        replacementStandard: { kind: "named_only", text: "Named tenant only, per the executed lease." },
        deemedOpen: deemed,
      });
    } else if (l.type === "count") {
      triggers.push({
        id: l.id, kind: "tenant_count", cite: `Limb ${l.id}`,
        requiredCount: l.required, pool: l.pool.map((p) => ref(p, `Limb ${l.id}`)), poolLabel: "Named anchor",
        replacementStandard: { kind: "comparable_quality", text: "A replacement of comparable quality occupying substantially the vacated premises." },
        deemedOpen: deemed,
      });
    } else {
      triggers.push({
        id: l.id, kind: "occupancy_pct", cite: `Limb ${l.id}`,
        thresholdPct: l.threshold, basis: "open_and_operating",
        areaBasis: l.basis === "inline" ? "inline_gla" : l.basis === "zone" ? "defined_area" : "total_gla",
        exclusions: l.basis === "inline" ? ["anchor"] : [],
        exclusionsText: l.basis === "zone" ? ["the area shown on the site plan exhibit"] : undefined,
        deemedOpen: deemed,
      });
    }
  }

  const logic: TriggerNode = {
    kind: "group", op: requirementOp(c.combine),
    children: triggers.map((t) => ({ kind: "test", triggerId: t.id }) as const),
  };

  const r = c.remedy;
  const abateShare = r.type === "abatement" ? /([0-9.]+)\s*%/.exec(r.alt ?? "") : null;

  /* suspended_until = first ACTIVE month (certified vs the key). */
  const effectiveFrom = c.suspended_until ? `${c.suspended_until}-01` : undefined;

  const preconditions: Clause["preconditions"] = [
    "tenant_open_and_operating",
    "not_in_default",
  ];
  const additional: string[] = [];
  const ambiguity: string[] = [];

  if (c.sales_gate != null) {
    preconditions.push("sales_decline_required");
    additional.push(
      `Relief is conditioned on a documented trailing sales decline of ${Math.round(c.sales_gate * 100)}%${c.sales_decline_from ? `, measured from ${c.sales_decline_from}` : ""}. Once met, the gate is satisfied for the trip.`,
    );
  }
  if (c.preexisting) {
    ambiguity.push(
      "The failing condition pre-dates the lease. The clock runs conservatively from the start of monitoring and the position trips; whether an effective-date carve-out applies is a question for counsel on the executed lease.",
    );
  }
  if (c.cure_after_notice_m) {
    additional.push(
      `Landlord has ${c.cure_after_notice_m} month${c.cure_after_notice_m === 1 ? "" : "s"} after Tenant's notice to cure before relief begins.`,
    );
  }
  if (c.tenant_notice_lag_m) {
    additional.push(
      `Historical notice practice at this account lags the trigger by about ${c.tenant_notice_lag_m} months; relief here runs from notice, so that lag is money.`,
    );
  }

  return {
    id: slug(m.mall),
    type: c.opening || c.combine === "AND_OPEN" ? "opening" : "operating",
    locations: ["Co-Tenancy, executed lease"],
    sourceText: c.template,
    triggers, triggerLogic: c.combine === "AND" ? "all" : "any", logic,
    effectiveFrom,
    preexistingCondition: c.preexisting || undefined,
    remedy: {
      kind: r.type === "abatement" ? "abatement" : r.type === "alternative_rent" ? "alternative_rent" : "sequenced",
      cureDays: c.duration_m * 30,
      cureMonths: c.duration_m,
      cureBasis: "consecutive",
      /* The qualifying period always runs from the failure; notice
         governs when RELIEF starts (round-1 law, key-confirmed). */
      clockStartsAt: "failure",
      noticeRequired: c.notice_driven,
      /* Reach-back ONLY where the lease grants it (round-2 law). */
      reliefRunsFrom: c.notice_driven
        ? "notice"
        : c.retroactive
          ? "failure"
          : "trigger",
      retroactiveCapDays: c.notice_driven ? 90 : undefined,
      capMonths: r.cap_m ?? undefined,
      postCapElection: /terminat/i.test(r.post_cap ?? "") ? "tenant_choice" : undefined,
      electionWindowDays: (() => {
        const w = /within (\d+)(?:-(\d+))? days/.exec(r.post_cap ?? "");
        return w ? Number(w[2] ?? w[1]) : undefined;
      })(),
      terminationNoticeDays: (() => {
        const t = /on (\d+)(?:-(\d+))? days/.exec(r.post_cap ?? "");
        return t ? Number(t[1]) : undefined;
      })(),
      unamortizedReimbursement: /reimburs|construction cost/i.test(r.post_cap ?? ""),
      altRent: r.alt_pct != null ? { pctOfGrossSales: r.alt_pct, selector: "lesser_of", text: r.alt ?? "" } : undefined,
      abatementPct: abateShare ? Number(abateShare[1]) : undefined,
    },
    entitlements: c.info_right
      ? [{
          kind: /site plan|trade names/i.test(c.info_right) ? "anchor_roster" : "occupancy_report",
          cite: "Information rights",
          text: c.info_right,
          frequency: /4x|quarter/i.test(c.info_right) ? "quarterly" : /Lease Year|annual/i.test(c.info_right) ? "annual" : "on_request",
          responseDays: Number(/(\d+)\s*days/.exec(c.info_right)?.[1] ?? 30),
        }]
      : undefined,
    preconditions,
    additionalPreconditions: additional.length ? additional : undefined,
    definedTerms: ["Floor Area", "Anchor Store", "Co-Tenancy Requirement"],
    confidence: 0.93,
    ambiguityNotes: ambiguity,
    amendments: c.suspended_until
      ? [{
          label: "Suspension amendment",
          dated: `${c.suspended_until}-01`,
          effect: `The co-tenancy provision is suspended until ${c.suspended_until}; the qualifying period runs from that month.`,
        }]
      : [],
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

  const depends = new Set<string>();
  for (const l of m.clause.limbs) {
    if (l.type === "named") depends.add(l.name);
    if (l.type === "count") l.pool.forEach((p) => depends.add(p));
  }

  const idOf = identityMap(m.roster);
  const roster = m.roster.map((r) => ({ id: idOf.get(r.store)!, name: r.store }));

  /* Fresh client: no notice history reported yet — onboarding asks. */
  const suites: Suite[] = m.roster.map((r) => ({
    id: idOf.get(r.store)!,
    name: displayTenantName(r.store),
    gla: r.gla,
    status: closed.has(r.store) ? "dark" : "open",
    kind: r.anchor ? "anchor" : "inline",
    subject: undefined,
    zone: r.zone || undefined,
  }));

  const evidence: Evidence[] = m.events
    .filter((e) => e.action === "close")
    .slice(-8)
    .flatMap((e, i) => {
      const isAnchor = m.roster.find((r) => r.store === e.store)?.anchor;
      const observedAt = `${e.month}-10`;
      const base = { unitId: idOf.get(e.store) ?? slug(e.store), observedAt };
      const rowsE: Evidence[] = [
        { ...base, id: `${key}-e${i}a`, source: "center_directory", statement: `${displayTenantName(e.store)} removed from the center directory.` },
      ];
      if (isAnchor || depends.has(e.store)) {
        rowsE.push({ ...base, id: `${key}-e${i}b`, source: "press_report", statement: `Closure of ${displayTenantName(e.store)} reported locally.` });
        rowsE.push({ ...base, id: `${key}-e${i}c`, source: "field_visit", statement: `${displayTenantName(e.store)}: premises confirmed closed on site.` });
      }
      return rowsE;
    });

  /* A forward event is an ANNOUNCEMENT: press evidence, never a status
     change. The engine must not treat it as a closure (canon). */
  if (m.clause.forward_event && m.clause.forward_event_month) {
    evidence.push({
      id: `${key}-fw`,
      unitId: idOf.get(m.clause.forward_event) ?? slug(m.clause.forward_event),
      observedAt: `${m.clause.forward_event_month}-10`,
      source: "press_report",
      statement: `${displayTenantName(m.clause.forward_event)}: closure ANNOUNCED for a future date. An announcement is not a closure; no test moves until the store actually goes dark.`,
    });
  }

  // First month the clause was in failure, from the monthly series.
  let firstObserved: string | undefined;
  for (const mm of m.months) {
    const cSet = new Set(mm.closed_stores);
    const fails = m.clause.limbs.map((l) => {
      if (l.type === "named") return cSet.has(l.name);
      if (l.type === "count") return l.pool.filter((p) => !cSet.has(p)).length < l.required;
      const v = l.basis === "inline"
        ? (m.clause.deemed_open_remodel ? mm.inline_open_pct_deemed : mm.inline_open_pct)
        : l.basis === "zone" ? mm.zone_open_pct : mm.total_open_pct;
      return v < l.threshold;
    });
    const failed = m.clause.combine === "AND" ? fails.every(Boolean) : fails.some(Boolean);
    if (failed) { firstObserved = `${mm.month}-01`; break; }
  }

  out.push({
    id: `MER-${String(1000 + n * 3)}`,
    storeNumber: String(7000 + n * 13),
    unit: `Unit ${100 + ((n * 41) % 400)}`,
    region: m.state,
    center: {
      id: key, name: m.mall, city: m.city, state: m.state,
      format: `${m.tier} tier`, owner: m.landlord,
      suites,
      rentRollCoverage: 1,
      rentRollAsOf: `${data.timeline[LAST]}-01`,
    },
    econ: {
      gla: m.af_store.gla,
      rentPsf: m.af_store.fmr_psf,
      ttmGrossSales: Math.round(m.af_store.monthly_sales_k.slice(-12).reduce((a: number, b: number) => a + b, 0) * 1000),
      monthlySales: m.af_store.monthly_sales_k.map((s: number) => Math.round(s * 1000)),
      monthlySalesFrom: data.timeline[0],
      salesEstimated: false,
    },
    clauses: [buildClause(m, roster, pending)],
    claim: {
      firstObservedAt: firstObserved,
      failedPreconditions: [],
      unverifiedPreconditions: [],
    },
    evidence,
    ownStatus: "open",
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
  "src/lib/data/meridian-portfolio.json",
  JSON.stringify({
    today: TODAY,
    timeline: data.timeline,
    source: `FICTIONAL TEST DATA — Meridian Outfitters (synthetic client). ${data.description}`,
    locations: out,
    pendingMatches: pending,
  }),
);

const bytes = readFileSync("src/lib/data/meridian-portfolio.json").length;
console.log(`Imported ${n} locations for Meridian Outfitters.`);
console.log(`Wrote src/lib/data/meridian-portfolio.json (${Math.round(bytes / 1024)} KB)`);
console.log(`TODAY = ${TODAY}, pending matches = ${pending.length}`);

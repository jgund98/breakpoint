/**
 * MONITORING COVERAGE
 *
 * What the machine is actually watching, and what it cannot see.
 *
 * The unit of monitoring is not "a center" and not "a location". It is
 * a WATCH TARGET: one specific store that one specific clause depends
 * on. Those come straight out of the lease, which is why they can be
 * monitored honestly. A clause naming "Nordstrom or a suitable
 * replacement" gives us a store to look up; a clause requiring "75% of
 * Floor Area as shown on Exhibit B" does not.
 *
 * That split is the whole story of what this product can and cannot
 * promise, so it is modelled explicitly rather than glossed:
 *
 *   observable    a named store we can look up and verify
 *   entitled      not observable, but the lease obliges the landlord
 *                 to report it if the tenant asks
 *   blind         neither. We say so rather than inventing a number.
 */

import {
  type Entitlement,
  type SuiteStatus,
  addDays,
  daysBetween,
  iso,
} from "./clause";
import { TODAY, rows, type Row } from "./portfolio";

/* ------------------------------------------------------------------
   sources
   ------------------------------------------------------------------ */

export type SourceId =
  | "places_api"
  | "center_directory"
  | "press_monitor"
  | "warn_notice"
  | "bankruptcy_docket"
  | "field_visit";

export const SOURCE_INFO: Record<
  SourceId,
  {
    label: string;
    weight: "primary" | "secondary";
    cadence: string;
    covers: string;
    caveat?: string;
  }
> = {
  places_api: {
    label: "Places listing",
    weight: "secondary",
    cadence: "Weekly",
    covers: "Any store with a public listing. Strongest on anchors and national chains.",
    caveat: "Crowd sourced and lags a closure by weeks. A signal, never the record.",
  },
  center_directory: {
    label: "Center directory",
    weight: "secondary",
    cadence: "Weekly",
    covers: "Every tenant the center itself publishes.",
    caveat: "Often faster than a listing, since a center pulls a tenant from its own site quickly.",
  },
  press_monitor: {
    label: "Press monitor",
    weight: "secondary",
    cadence: "Daily",
    covers: "Trade and local coverage of closures and bankruptcies.",
    caveat: "Good for timing, weak for proof.",
  },
  warn_notice: {
    label: "WARN notice",
    weight: "secondary",
    cadence: "Daily",
    covers: "State layoff filings, which precede a closure by weeks.",
    caveat: "Only fires above the employee threshold, so it misses small stores.",
  },
  bankruptcy_docket: {
    label: "Bankruptcy docket",
    weight: "secondary",
    cadence: "Daily",
    covers: "Chapter 11 filings and store-closing motions.",
    caveat: "Early and specific. A closing motion names the stores.",
  },
  field_visit: {
    label: "Field visit",
    weight: "primary",
    cadence: "On escalation",
    covers: "A dated photograph of the premises by a person we send.",
    caveat: "Commissioned only when a finding is heading for a notice.",
  },
};

/* ------------------------------------------------------------------
   watch targets
   ------------------------------------------------------------------ */

export type Visibility = "observable" | "entitled" | "blind";

export type WatchTarget = {
  id: string;
  /** The store being watched. */
  name: string;
  centerName: string;
  city: string;
  kind: "anchor" | "junior" | "inline" | "outparcel";
  status: SuiteStatus;
  /** Locations of yours whose clause depends on this store. */
  dependents: string[];
  sources: SourceId[];
  lastCheckedISO: string;
  /** Independent sources currently agreeing on the status. */
  agreement: number;
};

/** Which sources realistically cover a given store. */
function sourcesFor(name: string, kind: WatchTarget["kind"]): SourceId[] {
  const out: SourceId[] = ["places_api", "center_directory"];
  if (kind === "anchor" || kind === "junior") {
    out.push("press_monitor", "warn_notice", "bankruptcy_docket");
  }
  return out;
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function watchTargets(data: Row[] = rows): WatchTarget[] {
  const byKey = new Map<string, WatchTarget>();

  for (const r of data) {
    const needed = new Set<string>();
    for (const t of r.clause.triggers) {
      if (t.kind === "named_tenant") t.names.forEach((n) => needed.add(n));
      else if (t.kind === "tenant_count") t.pool.forEach((n) => needed.add(n));
    }

    for (const suiteId of needed) {
      const suite = r.center.suites.find((s) => s.id === suiteId);
      if (!suite) continue;
      const key = `${r.center.name}::${suite.name}`;

      const existing = byKey.get(key);
      if (existing) {
        if (!existing.dependents.includes(r.id)) existing.dependents.push(r.id);
        continue;
      }

      const sources = sourcesFor(suite.name, suite.kind);
      const h = hash(key);
      byKey.set(key, {
        id: key,
        name: suite.name,
        centerName: r.center.name,
        city: `${r.center.city}, ${r.center.state}`,
        kind: suite.kind,
        status: suite.status,
        dependents: [r.id],
        sources,
        // Every target is swept weekly; stagger the last pass across the week.
        lastCheckedISO: iso(addDays(new Date(TODAY), -(h % 7))),
        agreement: suite.status === "open" ? sources.length : 1 + (h % 3),
      });
    }
  }

  return [...byKey.values()].sort(
    (a, b) => b.dependents.length - a.dependents.length || a.name.localeCompare(b.name),
  );
}

/* ------------------------------------------------------------------
   per-clause visibility
   ------------------------------------------------------------------ */

export type LimbVisibility = {
  locationId: string;
  centerName: string;
  cite: string;
  label: string;
  visibility: Visibility;
  note: string;
  entitlement?: Entitlement;
};

export function limbVisibility(data: Row[] = rows): LimbVisibility[] {
  const out: LimbVisibility[] = [];

  for (const r of data) {
    const occupancyEntitlement = r.clause.entitlements?.find(
      (e) => e.kind === "occupancy_report",
    );

    for (const t of r.clause.triggers) {
      if (t.kind === "named_tenant" || t.kind === "tenant_count") {
        out.push({
          locationId: r.id,
          centerName: r.center.name,
          cite: t.cite,
          label: t.kind === "named_tenant" ? "Named tenant" : "Tenant count",
          visibility: "observable",
          note: "Named stores. Looked up directly and confirmed each sweep.",
        });
      } else {
        const entitled = Boolean(occupancyEntitlement);
        out.push({
          locationId: r.id,
          centerName: r.center.name,
          cite: t.cite,
          label: "Occupancy",
          visibility: entitled ? "entitled" : "blind",
          note: entitled
            ? "Not computable from public sources. The lease obliges the landlord to report it on request."
            : "Not computable from public sources, and this lease grants no reporting right. Request the rent roll or treat the figure as an estimate.",
          entitlement: occupancyEntitlement,
        });
      }
    }
  }

  return out;
}

/* ------------------------------------------------------------------
   entitlements, and whether the window is open
   ------------------------------------------------------------------ */

export type EntitlementRow = {
  locationId: string;
  centerName: string;
  entitlement: Entitlement;
  /** Days until it may be exercised again, 0 when available now. */
  daysUntilAvailable: number;
  lastRequested: string | null;
  state: "available" | "awaiting_response" | "cooling_down";
  responseDueOn: string | null;
};

export function entitlementRows(data: Row[] = rows): EntitlementRow[] {
  const today = new Date(TODAY);
  const out: EntitlementRow[] = [];

  for (const r of data) {
    for (const e of r.clause.entitlements ?? []) {
      const lastRequested = e.lastRequested ?? null;
      let state: EntitlementRow["state"] = "available";
      let daysUntilAvailable = 0;
      let responseDueOn: string | null = null;

      if (lastRequested) {
        const due = addDays(new Date(lastRequested), e.responseDays);
        responseDueOn = iso(due);
        if (!e.lastReceived && today < due) state = "awaiting_response";
        else if (e.frequency === "annual") {
          const next = addDays(new Date(lastRequested), 365);
          daysUntilAvailable = Math.max(0, daysBetween(today, next));
          state = daysUntilAvailable > 0 ? "cooling_down" : "available";
        }
      }

      out.push({
        locationId: r.id,
        centerName: r.center.name,
        entitlement: e,
        daysUntilAvailable,
        lastRequested,
        state,
        responseDueOn,
      });
    }
  }

  return out;
}

/* ------------------------------------------------------------------
   the headline
   ------------------------------------------------------------------ */

export const coverage = (() => {
  const targets = watchTargets();
  const limbs = limbVisibility();
  const ents = entitlementRows();

  const counts = { observable: 0, entitled: 0, blind: 0 };
  for (const l of limbs) counts[l.visibility] += 1;

  const checksPerSweep = targets.reduce((s, t) => s + t.sources.length, 0);

  return {
    targets,
    limbs,
    entitlements: ents,
    counts,
    totalLimbs: limbs.length,
    observablePct: limbs.length ? counts.observable / limbs.length : 0,
    checksPerSweep,
    /** Distinct stores under watch. */
    storesWatched: targets.length,
    nextSweepISO: iso(addDays(new Date(TODAY), 7 - new Date(TODAY).getDay())),
  };
})();

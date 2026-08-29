/**
 * OPERATOR CASCADE
 *
 * The question no lease administration system can answer: a retailer
 * announces it is closing nationally. Which of my doors trip, in what
 * order, and what is it worth?
 *
 * One closure is an event. The cascade is the second wave: those
 * closures pull center occupancy down, which trips percentage tests in
 * leases that never named the closing retailer at all. That second
 * wave is where most of the money is, and it is invisible to anyone
 * looking at one lease at a time.
 *
 * This is also the asset that compounds. Every closure observed for
 * one customer sharpens the cascade for every other.
 */

import { evaluateClause, type Suite } from "./clause";
import { TODAY, rows, type Row } from "./portfolio";

export type WaveHit = {
  locationId: string;
  centerName: string;
  city: string;
  stateBefore: string;
  stateAfter: string;
  monthlyBefore: number;
  monthlyAfter: number;
  wave: 1 | 2;
  reason: string;
};

export type CascadeResult = {
  operator: string;
  /** Centers where this operator trades. */
  centersExposed: number;
  locationsExposed: number;
  hits: WaveHit[];
  wave1: number;
  wave2: number;
  monthlyDelta: number;
  annualDelta: number;
  /** Locations that were already claiming before this event. */
  alreadyRunning: number;
};

function darken(row: Row, names: Set<string>): Suite[] {
  return row.center.suites.map((s) =>
    names.has(s.name) && s.status === "open"
      ? { ...s, status: "dark" as const }
      : s,
  );
}

/** Every anchor and junior operator open across the portfolio. */
export function operators(data: Row[] = rows): { name: string; centers: number; locations: number }[] {
  const map = new Map<string, { centers: Set<string>; locations: number }>();
  for (const r of data) {
    for (const s of r.center.suites) {
      if (s.kind !== "anchor" && s.kind !== "junior") continue;
      if (s.status !== "open") continue;
      if (!map.has(s.name)) map.set(s.name, { centers: new Set(), locations: 0 });
      const e = map.get(s.name)!;
      if (!e.centers.has(r.center.name)) {
        e.centers.add(r.center.name);
      }
      e.locations += 1;
    }
  }
  return [...map.entries()]
    .map(([name, e]) => ({
      name,
      centers: e.centers.size,
      locations: e.locations,
    }))
    .sort((a, b) => b.locations - a.locations);
}

export function runCascade(operator: string, data: Row[] = rows, today: string = TODAY): CascadeResult {
  const names = new Set([operator]);
  const hits: WaveHit[] = [];
  let monthlyBeforeTotal = 0;
  let monthlyAfterTotal = 0;
  let alreadyRunning = 0;
  const centers = new Set<string>();
  let locationsExposed = 0;

  for (const r of data) {
    const present = r.center.suites.some(
      (s) => names.has(s.name) && s.status === "open",
    );

    const before = r.evaluation;
    if (before.state === "remedy_active") alreadyRunning += 1;

    if (present) {
      centers.add(r.center.name);
      locationsExposed += 1;
    }

    const suites = darken(r, names);
    const after = evaluateClause(
      r.clause,
      { ...r.center, suites },
      r.econ,
      r.claim,
      today,
    );

    const mBefore = before.anyFailing ? (before.monthlyDelta ?? 0) : 0;
    const mAfter = after.anyFailing ? (after.monthlyDelta ?? 0) : 0;

    monthlyBeforeTotal += mBefore;
    monthlyAfterTotal += mAfter;

    if (!before.anyFailing && after.anyFailing) {
      const newlyFailing = after.triggers.filter(
        (t) => t.failing && !before.triggers.find((b) => b.id === t.id)?.failing,
      );
      const named = newlyFailing.some((t) => t.label !== "Occupancy");
      hits.push({
        locationId: r.id,
        centerName: r.center.name,
        city: `${r.center.city}, ${r.center.state}`,
        stateBefore: before.state,
        stateAfter: after.state,
        monthlyBefore: mBefore,
        monthlyAfter: mAfter,
        wave: named ? 1 : 2,
        reason: named
          ? `${newlyFailing.map((t) => t.label).join(", ")} test fails with ${operator} dark`
          : `Occupancy falls to ${newlyFailing[0]?.observed ?? "below the floor"} once ${operator} goes dark`,
      });
    }
  }

  hits.sort((a, b) => a.wave - b.wave || b.monthlyAfter - a.monthlyAfter);

  return {
    operator,
    centersExposed: centers.size,
    locationsExposed,
    hits,
    wave1: hits.filter((h) => h.wave === 1).length,
    wave2: hits.filter((h) => h.wave === 2).length,
    monthlyDelta: monthlyAfterTotal - monthlyBeforeTotal,
    annualDelta: (monthlyAfterTotal - monthlyBeforeTotal) * 12,
    alreadyRunning,
  };
}

export const cascades: CascadeResult[] = operators()
  .slice(0, 10)
  .map((o) => runCascade(o.name));

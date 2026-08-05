/**
 * THE ANCHOR EXPOSURE MATRIX
 *
 * The question a 400-store retailer actually has, and cannot answer
 * from any lease administration system today:
 *
 *   "How much of my rent roll depends on one retailer staying open?"
 *
 * One row per traffic-driving operator, one column per center you
 * occupy. A cell says whether that operator is named in your lease
 * there, merely present, or already dark. Read across a row and you
 * see concentration. Read down a column and you see how fragile a
 * single center is.
 *
 * This is the portfolio-scale version of the single-center board.
 */

import { runCascade } from "./cascade";
import { rows, type Row } from "./portfolio";
import { rolloverRisks } from "./value";

export type CellState = "named" | "present" | "dark" | "absent";

export type MatrixCell = {
  state: CellState;
  locationIds: string[];
  monthly: number;
};

export type MatrixRow = {
  operator: string;
  cells: Record<string, MatrixCell>;
  /** Leases of yours that name this operator or count it in a pool. */
  namedInLeases: number;
  centersPresent: number;
  darkAt: number;
  /** Relief that would actually become claimable if this operator failed. */
  monthlyAtStake: number;
  /** Locations that would move into a claimable position. */
  wouldTrip: number;
  /** Share of your watched doors exposed to this one operator. */
  concentration: number;
  rolloverDays: number | null;
  rolloverOn: string | null;
};

export type Matrix = {
  centers: { name: string; city: string; doors: number }[];
  operators: MatrixRow[];
  totalDoors: number;
};

/** Suite ids a lease's co-tenancy tests actually depend on. */
function dependencies(r: Row): Set<string> {
  const out = new Set<string>();
  for (const t of r.clause.triggers) {
    if (t.kind === "named_tenant") t.names.forEach((n) => out.add(n));
    else if (t.kind === "tenant_count") t.pool.forEach((n) => out.add(n));
  }
  return out;
}

export function buildMatrix(data: Row[] = rows): Matrix {
  const centerMeta = new Map<string, { city: string; doors: number }>();
  for (const r of data) {
    const e = centerMeta.get(r.center.name);
    if (e) e.doors += 1;
    else
      centerMeta.set(r.center.name, {
        city: `${r.center.city}, ${r.center.state}`,
        doors: 1,
      });
  }

  const centers = [...centerMeta.entries()]
    .map(([name, m]) => ({ name, ...m }))
    .sort((a, b) => b.doors - a.doors || a.name.localeCompare(b.name));

  const rollovers = new Map(
    rolloverRisks(data).map((x) => [x.operator, x]),
  );

  const operators = new Map<string, MatrixRow>();

  for (const r of data) {
    const deps = dependencies(r);
    const monthly = r.evaluation.monthlyDelta ?? 0;

    for (const suite of r.center.suites) {
      if (suite.kind !== "anchor" && suite.kind !== "junior") continue;

      let row = operators.get(suite.name);
      if (!row) {
        const ro = rollovers.get(suite.name);
        row = {
          operator: suite.name,
          cells: {},
          namedInLeases: 0,
          centersPresent: 0,
          darkAt: 0,
          monthlyAtStake: 0,
          wouldTrip: 0,
          concentration: 0,
          rolloverDays: ro?.daysToSoonest ?? null,
          rolloverOn: ro?.soonestExpiry ?? null,
        };
        operators.set(suite.name, row);
      }

      const named = deps.has(suite.id);
      const state: CellState =
        suite.status === "dark" ? "dark" : named ? "named" : "present";

      const cell = row.cells[r.center.name] ?? {
        state: "absent" as CellState,
        locationIds: [],
        monthly: 0,
      };

      // A named dependency outranks mere presence in the display.
      const rank: Record<CellState, number> = {
        dark: 3,
        named: 2,
        present: 1,
        absent: 0,
      };
      if (rank[state] > rank[cell.state]) cell.state = state;
      if (!cell.locationIds.includes(r.id)) cell.locationIds.push(r.id);
      if (named) cell.monthly += monthly;

      row.cells[r.center.name] = cell;

      if (named) {
        row.namedInLeases += 1;
        row.monthlyAtStake += monthly;
      }
    }
  }

  const totalDoors = data.length;

  const list = [...operators.values()].map((row) => {
    row.centersPresent = Object.keys(row.cells).length;
    row.darkAt = Object.values(row.cells).filter((c) => c.state === "dark").length;
    row.concentration = totalDoors ? row.namedInLeases / totalDoors : 0;

    /*
     * At stake is what would actually become claimable if this operator
     * went dark, not the sum of every lease that names it. Most named
     * tests are count tests with margin: losing one of three anchors
     * usually changes nothing, and reporting the full sum would
     * overstate the exposure by an order of magnitude. So the number
     * comes from the same cascade the reader can run below it.
     */
    const cascade = runCascade(row.operator);
    row.monthlyAtStake = cascade.monthlyDelta;
    row.wouldTrip = cascade.hits.length;
    return row;
  });

  list.sort(
    (a, b) =>
      b.namedInLeases - a.namedInLeases ||
      b.centersPresent - a.centersPresent ||
      a.operator.localeCompare(b.operator),
  );

  return { centers, operators: list, totalDoors };
}

export const matrix = buildMatrix();

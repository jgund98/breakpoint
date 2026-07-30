import { PLAN, anchors, inlineRows, type Unit } from "@/lib/center";

export type PlacedUnit = {
  unit: Unit;
  /** Percentages of the plan box, ready for absolute positioning. */
  left: number;
  top: number;
  width: number;
  height: number;
};

const GAP = 3; // viewBox units between storefronts

/**
 * Packs each inline row so a unit's width is proportional to its GLA.
 * The plan then reads as a true area diagram — the way a leasing plan
 * actually does — instead of a decorative row of equal boxes.
 */
export function layoutPlan(units: Unit[]): PlacedUnit[] {
  const byId = new Map(units.map((u) => [u.id, u]));
  const placed: PlacedUnit[] = [];

  for (const anchor of anchors) {
    const unit = byId.get(anchor.id) ?? anchor;
    placed.push({
      unit,
      left: (anchor.box.x / PLAN.w) * 100,
      top: (anchor.box.y / PLAN.h) * 100,
      width: (anchor.box.w / PLAN.w) * 100,
      height: (anchor.box.h / PLAN.h) * 100,
    });
  }

  for (const row of inlineRows) {
    const span = row.x1 - row.x0;
    const available = span - GAP * (row.units.length - 1);
    const totalGla = row.units.reduce((sum, u) => sum + u.gla, 0);

    let cursor = row.x0;
    for (const rowUnit of row.units) {
      const unit = byId.get(rowUnit.id) ?? rowUnit;
      const w = (rowUnit.gla / totalGla) * available;
      placed.push({
        unit,
        left: (cursor / PLAN.w) * 100,
        top: (row.y / PLAN.h) * 100,
        width: (w / PLAN.w) * 100,
        height: (row.h / PLAN.h) * 100,
      });
      cursor += w + GAP;
    }
  }

  return placed;
}

/** The spine corridor, drawn as negative space between the two rows. */
export const corridor = {
  left: (176 / PLAN.w) * 100,
  top: (290 / PLAN.h) * 100,
  width: ((824 - 176) / PLAN.w) * 100,
  height: ((366 - 290) / PLAN.h) * 100,
};

/** Court connecting the north anchor down into the spine. */
export const northCourt = {
  left: (410 / PLAN.w) * 100,
  top: (158 / PLAN.h) * 100,
  width: (68 / PLAN.w) * 100,
  height: ((290 - 158) / PLAN.h) * 100,
};

/** Court connecting the cinema up into the spine. */
export const southCourt = {
  left: (690 / PLAN.w) * 100,
  top: (366 / PLAN.h) * 100,
  width: (68 / PLAN.w) * 100,
  height: ((494 - 366) / PLAN.h) * 100,
};

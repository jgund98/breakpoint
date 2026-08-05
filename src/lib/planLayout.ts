/**
 * Center plan geometry.
 *
 * Turns any CenterFacts into a leasing-plan layout: anchors pinned to
 * the ends and the top, inline shops packed into two rows flanking the
 * spine, each suite's width proportional to its GLA so the drawing
 * reads as a true area diagram rather than a decorative row of boxes.
 *
 * Deterministic. Same center in, same plan out.
 */

import type { CenterFacts, Suite } from "./clause";

export const PLAN = { w: 1000, h: 620 } as const;

export type Box = { x: number; y: number; w: number; h: number };
export type PlacedSuite = Suite & { box: Box };

const SPINE = { x0: 190, x1: 810 };
const ROW_H = 108;
const ROWS = [186, 366] as const;
const GAP = 3;

export type Plan = {
  anchors: PlacedSuite[];
  rows: { y: number; suites: PlacedSuite[] }[];
  overflow: Suite[];
};

export function layoutCenter(center: CenterFacts): Plan {
  const anchors = center.suites.filter((s) => s.kind === "anchor");
  const shops = center.suites.filter((s) => s.kind !== "anchor");

  /* ---- anchors: west, east, north band, south band ---- */
  const anchorBoxes: Box[] = [
    { x: 20, y: 186, w: 150, h: 288 },
    { x: 830, y: 186, w: 150, h: 288 },
    { x: 330, y: 24, w: 250, h: 126 },
    { x: 620, y: 500, w: 240, h: 100 },
    { x: 140, y: 500, w: 240, h: 100 },
  ];

  const placedAnchors: PlacedSuite[] = anchors
    .slice(0, anchorBoxes.length)
    .map((s, i) => ({ ...s, box: anchorBoxes[i] }));

  /* ---- shops: split into two rows by cumulative area ---- */
  const total = shops.reduce((sum, s) => sum + s.gla, 0);
  const half = total / 2;

  const north: Suite[] = [];
  const south: Suite[] = [];
  let running = 0;
  for (const s of shops) {
    if (running < half) {
      north.push(s);
      running += s.gla;
    } else {
      south.push(s);
    }
  }

  /**
   * Widths track GLA so the drawing stays a true area diagram, but a
   * suite narrower than about eighteen pixels stops reading as a shop
   * and the subject store has to be findable at a glance. So minimums
   * are enforced and the surplus is taken back proportionally from the
   * suites that can afford it.
   */
  const MIN_W = 18;
  const MIN_SUBJECT_W = 34;

  const packRow = (suites: Suite[], y: number): PlacedSuite[] => {
    const rowTotal = suites.reduce((sum, s) => sum + s.gla, 0) || 1;
    const usable = SPINE.x1 - SPINE.x0 - GAP * Math.max(0, suites.length - 1);

    const floors = suites.map((s) => (s.subject ? MIN_SUBJECT_W : MIN_W));
    const raw = suites.map((s) => (s.gla / rowTotal) * usable);

    const widths = raw.map((w, i) => Math.max(w, floors[i]));
    const surplus = widths.reduce((a, b) => a + b, 0) - usable;

    if (surplus > 0) {
      // Only suites sitting above their floor can give width back.
      const slack = widths.map((w, i) => Math.max(0, w - floors[i]));
      const slackTotal = slack.reduce((a, b) => a + b, 0);
      if (slackTotal > 0) {
        for (let i = 0; i < widths.length; i++) {
          widths[i] -= (slack[i] / slackTotal) * surplus;
        }
      }
    }

    let x = SPINE.x0;
    return suites.map((s, i) => {
      const box = { x, y, w: widths[i], h: ROW_H };
      x += widths[i] + GAP;
      return { ...s, box };
    });
  };

  return {
    anchors: placedAnchors,
    rows: [
      { y: ROWS[0], suites: packRow(north, ROWS[0]) },
      { y: ROWS[1], suites: packRow(south, ROWS[1]) },
    ],
    overflow: anchors.slice(anchorBoxes.length),
  };
}

/** Fill for a suite, by status. Merchandising color is secondary here;
 *  the operating state is the thing the reader needs at a glance. */
export function suiteFill(status: Suite["status"], subject?: boolean) {
  if (subject) return "var(--color-petrol-600)";
  switch (status) {
    case "open":
      return "#e5eafb";
    case "remodeling":
      return "#fbf1dc";
    case "seasonal":
      return "#fbf1dc";
    case "casualty":
      return "#fbf1dc";
    case "vacant":
      return "#f2f3f9";
    case "dark":
      return "#f6ddd5";
  }
}

export function suiteStroke(status: Suite["status"], subject?: boolean) {
  if (subject) return "var(--color-petrol-800)";
  switch (status) {
    case "dark":
      return "var(--color-clay-500)";
    case "remodeling":
    case "seasonal":
    case "casualty":
      return "var(--color-brass-500)";
    case "vacant":
      return "#d8dae8";
    default:
      return "#dfe3f5";
  }
}

export const STATUS_LABEL: Record<Suite["status"], string> = {
  open: "Open and operating",
  dark: "Dark",
  vacant: "Vacant",
  remodeling: "Remodeling",
  seasonal: "Seasonal",
  casualty: "Casualty",
};

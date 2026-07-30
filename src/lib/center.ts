/**
 * ============================================================
 * THE CENTER — sample data + co-tenancy evaluation engine
 * ============================================================
 *
 * Everything here is illustrative sample data for a fictional center.
 * The center, its tenants, and the lease are invented. The *mechanics*
 * are not: the clause language, the test structure, the cure behavior
 * and the remedy math all follow how real retail co-tenancy provisions
 * actually operate.
 *
 * Tenant names are deliberately fictional. We don't put real retailers
 * on a fictional rent roll.
 */

export type UnitStatus = "open" | "dark" | "vacant";

export type UnitCategory =
  | "Department Store"
  | "Entertainment"
  | "Apparel"
  | "Athleisure"
  | "Beauty"
  | "Footwear"
  | "Jewelry"
  | "Electronics"
  | "Home"
  | "Food & Beverage"
  | "Services";

export type Unit = {
  id: string;
  name: string;
  category: UnitCategory;
  /** Gross leasable area, square feet. */
  gla: number;
  status: UnitStatus;
  /** Anchors sit outside the inline occupancy denominator. */
  anchor?: boolean;
  /** Named as a co-tenancy requirement in the subject lease. */
  named?: boolean;
  /** The viewer's own store. */
  subject?: boolean;
};

/** Anchors get explicit plan geometry; inline units are packed by area. */
export type AnchorUnit = Unit & {
  anchor: true;
  box: { x: number; y: number; w: number; h: number };
  /** Which side of the box the mall entrance sits on. */
  court: "s" | "n" | "e" | "w";
};

export const PLAN = { w: 1000, h: 620 } as const;

export const center = {
  name: "Fairmount Collection",
  market: "Dublin, OH",
  type: "Super-regional enclosed center",
  builtYear: 1987,
  lastRenovated: 2016,
} as const;

/* ------------------------------------------------------------------
   Anchors
   ------------------------------------------------------------------ */

export const anchors: AnchorUnit[] = [
  {
    id: "a-hv",
    name: "Harmon & Vale",
    category: "Department Store",
    gla: 162_000,
    status: "open",
    anchor: true,
    named: true,
    box: { x: 24, y: 186, w: 152, h: 276 },
    court: "e",
  },
  {
    id: "a-dl",
    name: "Delacourt",
    category: "Department Store",
    gla: 138_000,
    status: "open",
    anchor: true,
    named: true,
    box: { x: 824, y: 186, w: 152, h: 276 },
    court: "w",
  },
  {
    id: "a-br",
    name: "Brenner's",
    category: "Department Store",
    gla: 118_000,
    status: "open",
    anchor: true,
    named: true,
    box: { x: 322, y: 30, w: 244, h: 128 },
    court: "s",
  },
  {
    id: "a-ac",
    name: "Ashcroft Cinemas",
    category: "Entertainment",
    gla: 62_000,
    status: "open",
    anchor: true,
    named: false,
    box: { x: 610, y: 494, w: 232, h: 106 },
    court: "n",
  },
];

/* ------------------------------------------------------------------
   Inline units — two rows flanking the spine corridor.
   Widths are allocated proportional to GLA, so the plan reads as a
   true area diagram rather than a decorative row of boxes.
   ------------------------------------------------------------------ */

export type InlineRow = {
  id: "north" | "south";
  y: number;
  h: number;
  x0: number;
  x1: number;
  units: Unit[];
};

export const inlineRows: InlineRow[] = [
  {
    id: "north",
    y: 186,
    h: 104,
    x0: 186,
    x1: 814,
    units: [
      { id: "n1", name: "Pell & Rowe", category: "Apparel", gla: 4_200, status: "open" },
      { id: "n2", name: "Sable", category: "Beauty", gla: 7_400, status: "open", named: true },
      { id: "n3", name: "Lune", category: "Jewelry", gla: 1_900, status: "open" },
      { id: "n4", name: "Brixton Denim", category: "Apparel", gla: 4_800, status: "open" },
      { id: "n5", name: "Nova Athletic", category: "Athleisure", gla: 8_600, status: "open", named: true },
      { id: "n6", name: "Aureus", category: "Jewelry", gla: 1_600, status: "open" },
      { id: "n7", name: "Wren", category: "Apparel", gla: 3_900, status: "open" },
      { id: "n8", name: "Verso Electronics", category: "Electronics", gla: 9_200, status: "open", named: true },
      { id: "n9", name: "Piper Lane", category: "Apparel", gla: 3_400, status: "open" },
      { id: "n10", name: "Rook Coffee", category: "Food & Beverage", gla: 1_400, status: "open" },
      { id: "n11", name: "Halcyon", category: "Beauty", gla: 6_100, status: "open", named: true },
      { id: "n12", name: "Vellum", category: "Services", gla: 2_200, status: "vacant" },
      { id: "n13", name: "Nine Oaks", category: "Apparel", gla: 4_600, status: "open" },
      { id: "n14", name: "Cobalt", category: "Electronics", gla: 3_100, status: "open" },
    ],
  },
  {
    id: "south",
    y: 366,
    h: 104,
    x0: 186,
    x1: 814,
    units: [
      { id: "s1", name: "Kestrel Outfitters", category: "Apparel", gla: 6_800, status: "open" },
      { id: "s2", name: "Marchetti", category: "Footwear", gla: 5_400, status: "open", named: true },
      { id: "s3", name: "Solace Spa", category: "Services", gla: 2_600, status: "open" },
      {
        id: "s4",
        name: "Your Store",
        category: "Apparel",
        gla: 3_850,
        status: "open",
        subject: true,
      },
      { id: "s5", name: "Alder & Co.", category: "Apparel", gla: 7_900, status: "open", named: true },
      { id: "s6", name: "Bowery Shoe Co.", category: "Footwear", gla: 3_600, status: "open" },
      { id: "s7", name: "Casa Verde", category: "Home", gla: 5_200, status: "vacant" },
      { id: "s8", name: "Juniper", category: "Beauty", gla: 2_900, status: "open" },
      { id: "s9", name: "Meridian Sport", category: "Athleisure", gla: 6_300, status: "open" },
      { id: "s10", name: "Fenwick Home", category: "Home", gla: 8_100, status: "open" },
      { id: "s11", name: "Aria Optical", category: "Services", gla: 1_700, status: "open" },
      { id: "s12", name: "Sundry", category: "Apparel", gla: 4_100, status: "open" },
      { id: "s13", name: "Otto's", category: "Food & Beverage", gla: 2_400, status: "open" },
      { id: "s14", name: "Trellis", category: "Home", gla: 4_700, status: "vacant" },
      { id: "s15", name: "Fable & Co.", category: "Apparel", gla: 3_300, status: "open" },
    ],
  },
];

export const inlineUnits: Unit[] = inlineRows.flatMap((r) => r.units);
export const allUnits: Unit[] = [...anchors, ...inlineUnits];

/* ------------------------------------------------------------------
   The subject lease
   ------------------------------------------------------------------ */

export const lease = {
  storeNumber: "4412",
  unit: "Unit 214",
  gla: 3_850,
  /** $/SF/yr — minimum annual rent. */
  rentPsf: 92,
  /** Trailing twelve-month reported gross sales. */
  annualGrossSales: 3_180_000,
  /** Alternative rent factor: % of gross sales in lieu of minimum rent. */
  alternativeRentPct: 0.04,
  /** Days the landlord has to cure the occupancy test before remedy. */
  occupancyCureDays: 90,
  /** Consecutive months of failure that unlock the termination right. */
  terminationAfterMonths: 12,
  commencement: "March 1, 2019",
  expiration: "January 31, 2030",
} as const;

export const leaseEconomics = {
  baseRentMonthly: (lease.gla * lease.rentPsf) / 12,
  grossSalesMonthly: lease.annualGrossSales / 12,
  get alternativeRentMonthly() {
    return Math.min(
      this.baseRentMonthly,
      (lease.annualGrossSales / 12) * lease.alternativeRentPct,
    );
  },
  get monthlyDelta() {
    return this.baseRentMonthly - this.alternativeRentMonthly;
  },
};

/** The actual operative language, as it would read in the document. */
export const clauseText = `If at any time following the Commencement Date (a) fewer than two (2) of the Named Anchor Tenants are open and operating for business, or (b) fewer than four (4) of the Named Inline Tenants are open and operating for business, or (c) less than seventy percent (70%) of the Gross Leasable Area of the Shopping Center, excluding Anchor Premises, is occupied by tenants open and operating for business, then Tenant shall be entitled to pay, in lieu of Minimum Annual Rent, Alternative Rent equal to the lesser of (i) Minimum Annual Rent or (ii) four percent (4%) of Gross Sales, commencing on the first day of the calendar month following the date on which Tenant delivers written notice to Landlord of such condition, and continuing until such condition is cured. Should such condition continue for twelve (12) consecutive months, Tenant may terminate this Lease upon ninety (90) days' prior written notice.`;

export const clauseCitation = "Section 4.3 — Ongoing Co-Tenancy";

/* ------------------------------------------------------------------
   Tests
   ------------------------------------------------------------------ */

export type TestStatus = "satisfied" | "cure" | "breached";

export type TestResult = {
  id: string;
  label: string;
  /** The clause sub-paragraph this maps to. */
  cite: string;
  requirement: string;
  observed: string;
  status: TestStatus;
  /** 0–1, how close to the threshold. Used for the meters. */
  ratio: number;
  hasCure: boolean;
};

export type Evaluation = {
  tests: TestResult[];
  /** Occupied inline GLA / total inline GLA. */
  occupancyPct: number;
  occupiedInlineGla: number;
  totalInlineGla: number;
  namedAnchorsOpen: number;
  namedAnchorsRequired: number;
  namedInlineOpen: number;
  namedInlineRequired: number;
  /** True if any test has failed — the remedy is live. */
  triggered: boolean;
  /** True if any test is inside its cure window. */
  curing: boolean;
  monthlyDelta: number;
  annualDelta: number;
};

const NAMED_ANCHORS_REQUIRED = 2;
const NAMED_INLINE_REQUIRED = 4;
const OCCUPANCY_FLOOR = 0.7;

export function evaluate(
  units: Unit[],
  opts: { cureElapsedDays?: number } = {},
): Evaluation {
  const cureElapsed = opts.cureElapsedDays ?? lease.occupancyCureDays + 1;

  const inline = units.filter((u) => !u.anchor);
  const totalInlineGla = inline.reduce((sum, u) => sum + u.gla, 0);
  const occupiedInlineGla = inline
    .filter((u) => u.status === "open")
    .reduce((sum, u) => sum + u.gla, 0);
  const occupancyPct = totalInlineGla ? occupiedInlineGla / totalInlineGla : 0;

  const namedAnchors = units.filter((u) => u.anchor && u.named);
  const namedAnchorsOpen = namedAnchors.filter((u) => u.status === "open").length;

  const namedInline = units.filter((u) => !u.anchor && u.named);
  const namedInlineOpen = namedInline.filter((u) => u.status === "open").length;

  const tests: TestResult[] = [
    {
      id: "anchors",
      label: "Named Anchor Test",
      cite: "4.3(a)",
      requirement: `≥ ${NAMED_ANCHORS_REQUIRED} of ${namedAnchors.length} Named Anchors open & operating`,
      observed: `${namedAnchorsOpen} of ${namedAnchors.length} open`,
      status: namedAnchorsOpen >= NAMED_ANCHORS_REQUIRED ? "satisfied" : "breached",
      ratio: namedAnchors.length ? namedAnchorsOpen / namedAnchors.length : 1,
      hasCure: false,
    },
    {
      id: "inline",
      label: "Named Inline Test",
      cite: "4.3(b)",
      requirement: `≥ ${NAMED_INLINE_REQUIRED} of ${namedInline.length} Named Inline Tenants open & operating`,
      observed: `${namedInlineOpen} of ${namedInline.length} open`,
      status: namedInlineOpen >= NAMED_INLINE_REQUIRED ? "satisfied" : "breached",
      ratio: namedInline.length ? namedInlineOpen / namedInline.length : 1,
      hasCure: false,
    },
    {
      id: "occupancy",
      label: "Occupancy Test",
      cite: "4.3(c)",
      requirement: `≥ ${Math.round(OCCUPANCY_FLOOR * 100)}% of non-anchor GLA open & operating`,
      observed: `${(occupancyPct * 100).toFixed(1)}% occupied`,
      status:
        occupancyPct >= OCCUPANCY_FLOOR
          ? "satisfied"
          : cureElapsed >= lease.occupancyCureDays
            ? "breached"
            : "cure",
      ratio: occupancyPct,
      hasCure: true,
    },
  ];

  const triggered = tests.some((t) => t.status === "breached");
  const curing = tests.some((t) => t.status === "cure");

  return {
    tests,
    occupancyPct,
    occupiedInlineGla,
    totalInlineGla,
    namedAnchorsOpen,
    namedAnchorsRequired: NAMED_ANCHORS_REQUIRED,
    namedInlineOpen,
    namedInlineRequired: NAMED_INLINE_REQUIRED,
    triggered,
    curing,
    monthlyDelta: triggered ? leaseEconomics.monthlyDelta : 0,
    annualDelta: triggered ? leaseEconomics.monthlyDelta * 12 : 0,
  };
}

/* ------------------------------------------------------------------
   Scenarios — the story the showpiece tells
   ------------------------------------------------------------------ */

export type Scenario = {
  id: string;
  label: string;
  blurb: string;
  /** Unit ids forced dark. Everything else returns to its base state. */
  dark: string[];
  /** Days since the condition was first observable — drives cure state. */
  elapsedDays: number;
  /** The lesson — shown under the plan when the scenario is active. */
  lesson: string;
};

export const scenarios: Scenario[] = [
  {
    id: "today",
    label: "Center today",
    blurb: "The center as leased",
    dark: [],
    elapsedDays: 0,
    lesson:
      "A healthy center. Three vacancies, every named tenant trading, occupancy comfortably above the floor. Nothing to claim — and this is the state almost every lease file quietly assumes is still true.",
  },
  {
    id: "anchor",
    label: "Anchor closes",
    blurb: "Brenner's closes",
    dark: ["a-br"],
    elapsedDays: 45,
    lesson:
      "The headline everyone reacts to — and on its own it changes nothing. Two of three Named Anchors are still trading, so the anchor test holds. This is precisely why teams who only watch anchors miss the events that actually pay.",
  },
  {
    id: "bleed",
    label: "9 months undetected",
    blurb: "The closures cascade",
    dark: ["a-br", "n2", "n5", "s5", "s9"],
    elapsedDays: 274,
    lesson:
      "No press release, no single moment. The anchor's departure cascades into the inline shops, three Named Inline Tenants go dark — one under the four the lease requires — and occupancy slips beneath the 70% floor. Two tests fail. The remedy has been live for months.",
  },
  {
    id: "demall",
    label: "Redevelopment",
    blurb: "The north wing comes offline",
    dark: [
      "a-br",
      "n1",
      "n2",
      "n3",
      "n4",
      "n5",
      "n6",
      "n7",
      "n8",
      "n9",
      "n10",
      "n11",
    ],
    elapsedDays: 120,
    lesson:
      "The owner's own move. The north wing comes offline to make room for the new format. Occupancy halves, and every remaining tenant with a co-tenancy clause can claim against it — abatement that belongs in the redevelopment pro forma whether or not anyone modeled it.",
  },
];

export function applyScenario(scenario: Scenario): Unit[] {
  const darkSet = new Set(scenario.dark);
  return allUnits.map((u) =>
    darkSet.has(u.id) ? { ...u, status: "dark" as UnitStatus } : { ...u },
  );
}

/* ------------------------------------------------------------------
   formatting
   ------------------------------------------------------------------ */

/**
 * Merchandising colors. Leasing plans are color-coded by category —
 * this is how the industry actually reads a center at a glance, and it
 * makes the mix legible without a single label.
 */
export const categoryColor: Record<UnitCategory, string> = {
  "Department Store": "#dfeae6",
  Entertainment: "#e6e0ee",
  Apparel: "#dde7f0",
  Athleisure: "#d8ece7",
  Beauty: "#f4e0e4",
  Footwear: "#f6e6d2",
  Jewelry: "#f7eecf",
  Electronics: "#dfe4ee",
  Home: "#e3ecdd",
  "Food & Beverage": "#f9e3d5",
  Services: "#e8e6e1",
};

export const categoryLegend: { label: string; color: string }[] = [
  { label: "Apparel", color: categoryColor.Apparel },
  { label: "Beauty", color: categoryColor.Beauty },
  { label: "Athleisure", color: categoryColor.Athleisure },
  { label: "Footwear", color: categoryColor.Footwear },
  { label: "Home", color: categoryColor.Home },
  { label: "Food", color: categoryColor["Food & Beverage"] },
];

export const usd = (n: number, decimals = 0) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

export const sf = (n: number) => `${n.toLocaleString("en-US")} SF`;

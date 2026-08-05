/**
 * ============================================================
 * THE PORTFOLIO — illustrative sample data
 * ============================================================
 *
 * A fictional national specialty retailer, its watched locations, the
 * centers they sit in, and the co-tenancy language in each lease.
 *
 * Everything here is invented. The retailer, the centers, the owners
 * and the leases do not exist. We do not put real retailers on a
 * fictional rent roll. The MECHANICS are real: the clause structures,
 * the thresholds, the cure behavior and the money math all follow how
 * these provisions operate in the market.
 *
 * Generation is seeded and deterministic so the server and the client
 * render byte-identical data.
 */

import {
  type CenterFacts,
  type Clause,
  type ClaimStatus,
  type Evidence,
  type EvidenceSource,
  type LeaseEconomics,
  type Suite,
  type SuiteStatus,
  addDays,
  evaluateClause,
  iso,
} from "./clause";

/** The "as of" date for the whole demo. Fixed so nothing drifts. */
export const TODAY = "2026-08-04";

export const org = {
  name: "Marlowe & Finch",
  descriptor: "Specialty apparel",
  totalDoors: 412,
  watched: 0, // filled below
  contractStart: "2026-01-15",
  plan: "Portfolio",
  team: [
    { name: "D. Okonkwo", role: "VP, Real Estate", initials: "DO" },
    { name: "R. Alvarez", role: "Director, Lease Administration", initials: "RA" },
    { name: "S. Pratt", role: "Associate General Counsel", initials: "SP" },
  ],
} as { [k: string]: unknown } & {
  name: string;
  descriptor: string;
  totalDoors: number;
  watched: number;
  contractStart: string;
  plan: string;
  team: { name: string; role: string; initials: string }[];
};

/* ------------------------------------------------------------------
   deterministic randomness
   ------------------------------------------------------------------ */

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: string) {
  let a = hash(seed);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T,>(r: () => number, arr: readonly T[]) =>
  arr[Math.floor(r() * arr.length)];

/* ------------------------------------------------------------------
   name pools — all fictional
   ------------------------------------------------------------------ */

const ANCHORS = [
  "Harmon & Vale",
  "Delacourt",
  "Brenner's",
  "Fairweather's",
  "Stockton & Reed",
  "Ambrose",
  "Whitfield",
  "Lyndon Bros.",
] as const;

const JUNIORS = [
  "Verso Electronics",
  "Nova Athletic",
  "Fenwick Home",
  "Kestrel Outfitters",
  "Meridian Sport",
  "Grange Supply",
  "Halcyon Beauty",
  "Rowan Books",
] as const;

const INLINE = [
  "Pell & Rowe", "Sable", "Lune", "Brixton Denim", "Aureus", "Wren",
  "Piper Lane", "Rook Coffee", "Vellum", "Nine Oaks", "Cobalt",
  "Marchetti", "Solace Spa", "Alder & Co.", "Bowery Shoe Co.",
  "Casa Verde", "Juniper", "Aria Optical", "Sundry", "Otto's",
  "Trellis", "Fable & Co.", "Ivory Lane", "Corbin", "Nesting",
  "Pallas", "Quill", "Tern", "Ledger", "Moss & Main",
] as const;

const CENTERS = [
  ["Fairmount Collection", "Dublin", "OH", "Super-regional enclosed"],
  ["Camden Row", "Frisco", "TX", "Open-air lifestyle"],
  ["Highgate Commons", "Bellevue", "WA", "Super-regional enclosed"],
  ["Westmoor Galleria", "Schaumburg", "IL", "Super-regional enclosed"],
  ["The Beckett", "Alpharetta", "GA", "Open-air lifestyle"],
  ["Sutter Landing", "Roseville", "CA", "Regional enclosed"],
  ["Pinehurst Square", "Cary", "NC", "Power center"],
  ["Arbor Crossing", "Novi", "MI", "Super-regional enclosed"],
  ["Wexford Green", "King of Prussia", "PA", "Open-air lifestyle"],
  ["Cordova Bluff", "Chandler", "AZ", "Regional enclosed"],
  ["Larkspur Yards", "Broomfield", "CO", "Open-air lifestyle"],
  ["Kingsbridge Center", "Paramus", "NJ", "Super-regional enclosed"],
  ["Mercer Row", "Franklin", "TN", "Open-air lifestyle"],
  ["Ellsworth Park", "Overland Park", "KS", "Regional enclosed"],
  ["Thorne Bay Center", "Tampa", "FL", "Super-regional enclosed"],
  ["Ridgeline Commons", "Sandy", "UT", "Power center"],
  ["Halstead Court", "Beachwood", "OH", "Regional enclosed"],
  ["Vandermeer Place", "Bloomington", "MN", "Super-regional enclosed"],
  ["Calloway Green", "Sugar Land", "TX", "Open-air lifestyle"],
  ["Ashbourne Mills", "Wauwatosa", "WI", "Regional enclosed"],
  ["Rivermead Center", "Peabody", "MA", "Super-regional enclosed"],
  ["Sequoyah Commons", "Knoxville", "TN", "Power center"],
  ["Belmont Arcade", "Portland", "OR", "Regional enclosed"],
  ["Northrop Yards", "Eden Prairie", "MN", "Open-air lifestyle"],
] as const;

const OWNERS = [
  "Cardinal Retail Trust",
  "Hollis Property Group",
  "Marchmont REIT",
  "Beaumont Centers LP",
  "Stonepath Equities",
  "Ridgeway Retail Partners",
] as const;

const REGIONS: Record<string, string> = {
  OH: "Midwest", TX: "South", WA: "West", IL: "Midwest", GA: "South",
  CA: "West", NC: "South", MI: "Midwest", PA: "Northeast", AZ: "West",
  CO: "West", NJ: "Northeast", TN: "South", KS: "Midwest", FL: "South",
  UT: "West", MN: "Midwest", WI: "Midwest", MA: "Northeast", OR: "West",
};

/* ------------------------------------------------------------------
   center construction
   ------------------------------------------------------------------ */

type CenterSpec = {
  /** Suite ids forced to a non-open status, with the date it happened. */
  closures?: { slot: number; kind: "anchor" | "junior" | "inline"; status: SuiteStatus; since: string }[];
  vacancyRate?: number;
  rentRollCoverage?: number;
};

function buildCenter(index: number, spec: CenterSpec = {}): CenterFacts {
  const [name, city, state, format] = CENTERS[index % CENTERS.length];
  const r = rng(`center-${name}`);
  const suites: Suite[] = [];

  const anchorCount = format.includes("Super") ? 4 : format.includes("Power") ? 3 : 3;
  const juniorCount = format.includes("Power") ? 4 : 3;
  const inlineCount = format.includes("Power") ? 12 : format.includes("Super") ? 26 : 20;

  const usedNames = new Set<string>();
  const uniqueName = (pool: readonly string[]) => {
    let n = pick(r, pool);
    let guard = 0;
    while (usedNames.has(n) && guard++ < 40) n = pick(r, pool);
    usedNames.add(n);
    return n;
  };

  for (let i = 0; i < anchorCount; i++) {
    suites.push({
      id: `a${i}`,
      name: uniqueName(ANCHORS),
      gla: Math.round((95_000 + r() * 80_000) / 1000) * 1000,
      status: "open",
      kind: "anchor",
      // Anchor terms run long; a handful roll inside the risk window.
      leaseExpiry: iso(addDays(new Date(TODAY), Math.floor(120 + r() * 2900))),
    });
  }
  for (let i = 0; i < juniorCount; i++) {
    suites.push({
      id: `j${i}`,
      name: uniqueName(JUNIORS),
      gla: Math.round((16_000 + r() * 26_000) / 500) * 500,
      status: "open",
      kind: "junior",
      leaseExpiry: iso(addDays(new Date(TODAY), Math.floor(90 + r() * 2200))),
    });
  }
  for (let i = 0; i < inlineCount; i++) {
    suites.push({
      id: `i${i}`,
      name: uniqueName(INLINE),
      gla: Math.round((1_400 + r() * 7_600) / 100) * 100,
      status: "open",
      kind: "inline",
    });
  }

  // background vacancy
  const vacancyRate = spec.vacancyRate ?? 0.06 + r() * 0.05;
  suites.forEach((s) => {
    if (s.kind === "inline" && r() < vacancyRate) s.status = "vacant";
  });

  // a remodel and a seasonal, so deemed-open rules have something to bite on
  const inlineSuites = suites.filter((s) => s.kind === "inline");
  if (inlineSuites[3]) {
    inlineSuites[3].status = "remodeling";
    inlineSuites[3].since = iso(addDays(new Date(TODAY), -Math.floor(20 + r() * 100)));
  }

  // scripted closures
  for (const c of spec.closures ?? []) {
    const group = suites.filter((s) => s.kind === c.kind);
    const target = group[c.slot % group.length];
    if (target) {
      target.status = c.status;
      target.since = c.since;
    }
  }

  return {
    id: `c-${index}`,
    name,
    city,
    state,
    format,
    owner: pick(rng(`owner-${name}`), OWNERS),
    suites,
    rentRollCoverage: spec.rentRollCoverage ?? 0.72 + r() * 0.27,
    rentRollAsOf: iso(addDays(new Date(TODAY), -Math.floor(10 + r() * 80))),
  };
}

/* ------------------------------------------------------------------
   clause templates
   ------------------------------------------------------------------ */

function clauseA(center: CenterFacts): Clause {
  const anchors = center.suites.filter((s) => s.kind === "anchor");
  const named = anchors.slice(0, 3);
  return {
    id: "cl-a",
    type: "operating",
    locations: ["Section 14.6"],
    sourceText: `If at any time following the Commencement Date fewer than two (2) of the Named Anchor Tenants (being ${named.map((a) => a.name).join(", ")}, or a replacement thereof that is a nationally recognized retailer of comparable quality occupying not less than ninety percent (90%) of the premises formerly occupied by the vacating Named Anchor Tenant) are open and operating for business, or less than seventy percent (70%) of the Gross Leasable Area of the Shopping Center, excluding Anchor Premises and all Outparcels, is open and operating for business with the public, then provided Tenant is itself open and operating and is not then in default beyond any applicable notice and cure period, Tenant shall be entitled to pay, in lieu of Minimum Annual Rent, Alternative Rent equal to the lesser of (i) Minimum Annual Rent or (ii) four percent (4%) of Gross Sales, commencing on the first day of the calendar month following the date on which Tenant delivers written notice to Landlord of such condition, and continuing until such condition is cured. Tenants closed for remodeling for a period not to exceed ninety (90) days, and tenants closed by reason of casualty or Force Majeure, shall be deemed open and operating for purposes of this Section. Should such condition continue for twelve (12) consecutive months, Tenant may, within sixty (60) days thereafter, elect either to resume payment of Minimum Annual Rent or to terminate this Lease upon ninety (90) days' prior written notice.`,
    triggerLogic: "any",
    // The requirement as the lease states it: both limbs must hold.
    // Written out rather than inferred, so it can be checked against
    // the sentence it came from.
    logic: {
      kind: "group",
      op: "and",
      children: [
        { kind: "test", triggerId: "t-anchor" },
        { kind: "test", triggerId: "t-occ" },
      ],
    },
    triggers: [
      {
        id: "t-anchor",
        kind: "tenant_count",
        cite: "14.6(a)",
        requiredCount: 2,
        pool: named.map((a) => a.id),
        poolLabel: "Named anchor",
        replacementStandard: {
          kind: "comparable_quality",
          text: "a nationally recognized retailer of comparable quality occupying not less than ninety percent (90%) of the premises formerly occupied",
          minSharePct: 90,
        },
        deemedOpen: [{ kind: "remodel", maxDays: 90 }, { kind: "force_majeure" }, { kind: "casualty" }],
      },
      {
        id: "t-occ",
        kind: "occupancy_pct",
        cite: "14.6(b)",
        thresholdPct: 70,
        basis: "open_and_operating",
        areaBasis: "inline_gla",
        exclusions: ["anchor", "outparcel"],
        deemedOpen: [{ kind: "remodel", maxDays: 90 }, { kind: "force_majeure" }, { kind: "casualty" }],
      },
    ],
    remedy: {
      kind: "sequenced",
      altRent: {
        pctOfGrossSales: 4,
        selector: "lesser_of",
        text: "the lesser of (i) Minimum Annual Rent or (ii) four percent (4%) of Gross Sales",
      },
      cureDays: 0,
      cureBasis: "consecutive",
      clockStartsAt: "failure",
      noticeRequired: true,
      // Matches the shape seen most often in real leases: relief reaches
      // back to the failure, but no further than 90 days before notice.
      reliefRunsFrom: "failure",
      retroactiveCapDays: 90,
      capMonths: 12,
      postCapElection: "tenant_choice",
      electionWindowDays: 60,
      terminationNoticeDays: 90,
      unamortizedReimbursement: false,
    },
    preconditions: ["tenant_open_and_operating", "not_in_default"],
    definedTerms: ["Gross Leasable Area", "Named Anchor Tenants", "Gross Sales", "Outparcels", "Force Majeure"],
    entitlements: [
      {
        kind: "occupancy_report",
        cite: "Section 14.6(d)",
        text: "Landlord shall, not more than once per calendar year and within thirty (30) days following Tenant's written request, deliver to Tenant a report certifying the percentage of the Gross Leasable Area of the Shopping Center then open and operating and the names of the Anchor Tenants then operating.",
        frequency: "annual",
        responseDays: 30,
      },
    ],
    confidence: 0.94,
    ambiguityNotes: [
      "Alternative Rent has no floor. Where sales fall toward zero the payable rent approaches zero, which is the fact pattern courts have scrutinised most closely.",
      "Silent on whether a brief reopening resets the condition.",
    ],
    amendments: [],
  };
}

function clauseB(center: CenterFacts): Clause {
  const juniors = center.suites.filter((s) => s.kind === "junior");
  const named = juniors.slice(0, 5);
  return {
    id: "cl-b",
    type: "operating",
    locations: ["Section 9.4", "Second Amendment Section 3"],
    sourceText: `In the event that fewer than three (3) of the Key Tenants shall be open and operating for business, and such condition shall continue for one hundred twenty (120) consecutive days after written notice thereof from Tenant to Landlord, Tenant's Minimum Rent shall be abated by fifty percent (50%) until such condition is cured, provided that Tenant is open and operating from the whole of the Premises, is not in default, and the rights granted under this Section are personal to the originally named Tenant and may not be exercised by any assignee or subtenant. Should such condition continue for nine (9) consecutive months following the commencement of such abatement, either party may terminate this Lease upon six (6) months' written notice, provided that Tenant may within fifteen (15) days of receipt of Landlord's termination notice elect to remain in the Premises and resume payment of Rent.`,
    triggerLogic: "any",
    triggers: [
      {
        id: "t-key",
        kind: "tenant_count",
        cite: "9.4",
        requiredCount: 3,
        pool: named.map((a) => a.id),
        poolLabel: "Key tenant",
        replacementStandard: {
          kind: "category_match",
          text: "a retailer operating in substantially the same use category and under a trade name with not less than fifteen (15) locations",
          minLocations: 15,
        },
        deemedOpen: [{ kind: "remodel", maxDays: 60 }, { kind: "force_majeure" }],
      },
    ],
    remedy: {
      kind: "abatement",
      abatementPct: 50,
      cureDays: 120,
      cureBasis: "consecutive",
      clockStartsAt: "tenant_notice",
      noticeRequired: true,
      reliefRunsFrom: "notice",
      capMonths: 9,
      postCapElection: "tenant_choice",
      electionWindowDays: 15,
      terminationNoticeDays: 180,
      unamortizedReimbursement: true,
    },
    preconditions: ["tenant_open_and_operating", "not_in_default", "original_tenant_only"],
    definedTerms: ["Key Tenants", "Minimum Rent", "Premises"],
    entitlements: [
      {
        kind: "anchor_roster",
        cite: "Section 9.4(c)",
        text: "Upon Tenant's written request, Landlord shall confirm in writing which of the Key Tenants are then open and operating.",
        frequency: "on_request",
        responseDays: 15,
      },
    ],
    confidence: 0.87,
    ambiguityNotes: [
      "Cure clock runs from Tenant's written notice, not from the failure. A condition nobody notices never starts a clock.",
      "Second Amendment narrowed the Key Tenant pool. Read the amendment, not the original.",
    ],
    amendments: [
      {
        label: "Second Amendment",
        dated: "2023-06-30",
        effect: "Reduced the Key Tenant pool from seven to five and raised the required count from two to three.",
      },
    ],
  };
}

function clauseC(center: CenterFacts): Clause {
  const anchors = center.suites.filter((s) => s.kind === "anchor");
  return {
    id: "cl-c",
    type: "operating",
    locations: ["Article XI, Section 11.2"],
    sourceText: `If ${anchors[0]?.name ?? "the Anchor Tenant"} shall cease to be open and operating in the Shopping Center for a period of one hundred eighty (180) consecutive days for any reason other than Force Majeure, and Landlord shall not have replaced same, then Tenant may pay Substitute Rent equal to the greater of (i) three and one-half percent (3.5%) of Gross Sales or (ii) Twelve Thousand Dollars ($12,000.00) per month in lieu of Fixed Minimum Rent, commencing upon delivery of written notice, provided that Tenant shall have first delivered to Landlord evidence reasonably satisfactory to Landlord of a decline in Tenant's Gross Sales of not less than ten percent (10%) measured against the corresponding period in the prior Lease Year.`,
    triggerLogic: "any",
    triggers: [
      {
        id: "t-named",
        kind: "named_tenant",
        cite: "11.2",
        names: anchors.slice(0, 1).map((a) => a.id),
        replacementStandard: {
          kind: "named_only",
          text: "no substitution permitted; the named tenant only",
        },
        deemedOpen: [{ kind: "force_majeure" }, { kind: "casualty" }],
      },
    ],
    remedy: {
      kind: "alternative_rent",
      altRent: {
        pctOfGrossSales: 3.5,
        monthlyFloor: 12_000,
        selector: "greater_of",
        text: "the greater of (i) three and one-half percent (3.5%) of Gross Sales or (ii) $12,000.00 per month",
      },
      cureDays: 180,
      cureBasis: "consecutive",
      clockStartsAt: "failure",
      noticeRequired: true,
      reliefRunsFrom: "notice",
      unamortizedReimbursement: false,
    },
    preconditions: ["tenant_open_and_operating", "not_in_default", "sales_decline_required"],
    definedTerms: ["Substitute Rent", "Gross Sales", "Lease Year", "Force Majeure"],
    confidence: 0.91,
    ambiguityNotes: [
      "Named tenant only, no replacement permitted. Read literally this is the strongest form of the test.",
      "Relief is conditioned on documented sales decline of ten percent. Sales evidence is a gating item, not a nicety.",
    ],
    amendments: [],
  };
}

const CLAUSE_BUILDERS = [clauseA, clauseB, clauseC];

/* ------------------------------------------------------------------
   the portfolio
   ------------------------------------------------------------------ */

export type Location = {
  id: string;
  storeNumber: string;
  unit: string;
  center: CenterFacts;
  region: string;
  econ: LeaseEconomics;
  clause: Clause;
  claim: ClaimStatus;
  evidence: Evidence[];
  /** Set when the store itself is not open. Kills most claims. */
  ownStatus: "open" | "dark" | "remodeling";
};

type Script = {
  centerIndex: number;
  clause: 0 | 1 | 2;
  spec?: CenterSpec;
  claim?: Partial<ClaimStatus>;
  evidence?: { source: EvidenceSource; daysAgo: number; statement: string; unit: string }[];
  ownStatus?: Location["ownStatus"];
  salesUnreported?: boolean;
};

/**
 * The scripted locations carry the states a real portfolio contains.
 * Everything after them is generated background so the tables have the
 * density of an actual national footprint.
 */
const SCRIPTS: Script[] = [
  // 0 — claimable. Two named anchors gone, cure elapsed, no notice served.
  {
    centerIndex: 0,
    clause: 0,
    spec: {
      rentRollCoverage: 0.97,
      vacancyRate: 0.13,
      closures: [
        { slot: 0, kind: "anchor", status: "dark", since: "2025-11-08" },
        { slot: 1, kind: "anchor", status: "dark", since: "2026-02-19" },
        { slot: 2, kind: "junior", status: "dark", since: "2026-03-02" },
      ],
    },
    claim: { firstObservedAt: "2026-02-19" },
    evidence: [
      { source: "maps_listing", daysAgo: 166, statement: "Listing flipped to permanently closed.", unit: "a1" },
      { source: "center_directory", daysAgo: 158, statement: "Removed from the center's tenant directory.", unit: "a1" },
      { source: "field_visit", daysAgo: 151, statement: "Storefront papered, fixtures removed, signage down.", unit: "a1" },
      { source: "operator_notice", daysAgo: 171, statement: "Operator confirmed closure of this location in its store list.", unit: "a1" },
      { source: "field_visit", daysAgo: 264, statement: "Premises dark, mall entrance to the box gated.", unit: "a0" },
      { source: "press_report", daysAgo: 270, statement: "Local coverage of the closing.", unit: "a0" },
    ],
  },
  // 1 — remedy active. Notice served, alternative rent running.
  {
    centerIndex: 3,
    clause: 0,
    spec: {
      rentRollCoverage: 0.99,
      vacancyRate: 0.16,
      closures: [
        { slot: 0, kind: "anchor", status: "dark", since: "2025-08-14" },
        { slot: 1, kind: "anchor", status: "dark", since: "2025-09-30" },
      ],
    },
    claim: { firstObservedAt: "2025-09-30", noticeServedAt: "2025-11-24" },
    evidence: [
      { source: "field_visit", daysAgo: 300, statement: "Both boxes dark on the same survey.", unit: "a0" },
      { source: "landlord_statement", daysAgo: 288, statement: "Ownership acknowledged both closures in writing.", unit: "a1" },
      { source: "center_directory", daysAgo: 302, statement: "Both removed from the directory.", unit: "a1" },
    ],
  },
  // 2 — election open. The clock that lapses if nobody moves.
  {
    centerIndex: 7,
    clause: 0,
    spec: {
      rentRollCoverage: 0.96,
      vacancyRate: 0.19,
      closures: [
        { slot: 0, kind: "anchor", status: "dark", since: "2025-01-20" },
        { slot: 1, kind: "anchor", status: "dark", since: "2025-04-11" },
      ],
    },
    claim: { firstObservedAt: "2025-04-11", noticeServedAt: "2025-07-16" },
    evidence: [
      { source: "field_visit", daysAgo: 480, statement: "Anchor dark, interior mall doors sealed.", unit: "a0" },
      { source: "operator_notice", daysAgo: 486, statement: "Closure listed in the operator's own filings.", unit: "a1" },
    ],
  },
  // 3 — blocked. Test fails, but our own store went dark first.
  {
    centerIndex: 9,
    clause: 0,
    ownStatus: "dark",
    spec: {
      rentRollCoverage: 0.94,
      vacancyRate: 0.22,
      closures: [
        { slot: 0, kind: "anchor", status: "dark", since: "2025-12-02" },
        { slot: 1, kind: "anchor", status: "dark", since: "2026-01-15" },
      ],
    },
    claim: { firstObservedAt: "2026-01-15", failedPreconditions: ["tenant_open_and_operating"] },
    evidence: [
      { source: "field_visit", daysAgo: 190, statement: "Both anchors dark. Subject premises also closed.", unit: "a0" },
    ],
  },
  // 4 — curing. 180 day named-tenant clock still running.
  {
    centerIndex: 2,
    clause: 2,
    spec: {
      rentRollCoverage: 0.93,
      closures: [{ slot: 0, kind: "anchor", status: "dark", since: "2026-04-28" }],
    },
    claim: { firstObservedAt: "2026-04-28" },
    evidence: [
      { source: "maps_listing", daysAgo: 96, statement: "Listing marked temporarily closed, then permanently closed.", unit: "a0" },
      { source: "field_visit", daysAgo: 88, statement: "Interior gated, no fixtures, no staff.", unit: "a0" },
    ],
  },
  // 5 — corroborated signal only, not yet verified. The queue.
  {
    centerIndex: 4,
    clause: 1,
    spec: {
      rentRollCoverage: 0.81,
      closures: [
        { slot: 0, kind: "junior", status: "dark", since: "2026-06-21" },
        { slot: 1, kind: "junior", status: "dark", since: "2026-07-09" },
        { slot: 2, kind: "junior", status: "dark", since: "2026-07-25" },
      ],
    },
    claim: { firstObservedAt: "2026-07-09" },
    evidence: [
      { source: "maps_listing", daysAgo: 26, statement: "Listing shows permanently closed.", unit: "j1" },
      { source: "press_report", daysAgo: 24, statement: "Regional press reported the closure.", unit: "j1" },
      { source: "maps_listing", daysAgo: 10, statement: "Listing shows permanently closed.", unit: "j2" },
    ],
  },
  // 6 — watch. Inside the band, nothing failing yet.
  {
    centerIndex: 5,
    clause: 0,
    spec: { rentRollCoverage: 0.98, vacancyRate: 0.28 },
    claim: {},
    evidence: [],
  },
  // 7 — occupancy test not computable. We do not hold the rent roll.
  {
    centerIndex: 11,
    clause: 0,
    spec: {
      rentRollCoverage: 0.44,
      vacancyRate: 0.26,
      closures: [{ slot: 0, kind: "anchor", status: "dark", since: "2026-05-30" }],
    },
    claim: { firstObservedAt: "2026-05-30" },
    evidence: [
      { source: "field_visit", daysAgo: 60, statement: "Anchor confirmed dark on site.", unit: "a0" },
    ],
    salesUnreported: true,
  },
];

function buildLocation(script: Script, i: number): Location {
  const center = buildCenter(script.centerIndex, script.spec);
  const clause = CLAUSE_BUILDERS[script.clause](center);
  const r = rng(`loc-${center.name}-${i}`);

  const gla = Math.round((3_100 + r() * 3_400) / 50) * 50;
  const rentPsf = Math.round(58 + r() * 52);
  const salesPsf = 690 + r() * 480;

  const subject = center.suites.find((s) => s.kind === "inline" && s.status === "open");
  if (subject) {
    subject.subject = true;
    subject.name = org.name;
    subject.gla = gla;
    if (script.ownStatus === "dark") subject.status = "dark";
    if (script.ownStatus === "remodeling") subject.status = "remodeling";
  }

  const evidence: Evidence[] = (script.evidence ?? []).map((e, k) => ({
    id: `ev-${i}-${k}`,
    unitId: e.unit,
    source: e.source,
    observedAt: iso(addDays(new Date(TODAY), -e.daysAgo)),
    statement: e.statement,
  }));

  return {
    id: `MF-${1000 + i * 7}`,
    storeNumber: String(4100 + i * 13),
    unit: `Unit ${100 + Math.floor(r() * 320)}`,
    center,
    region: REGIONS[center.state] ?? "National",
    econ: {
      gla,
      rentPsf,
      /*
       * Sales are the exception, not the rule.
       *
       * Tenants are not obliged to report sales and are sensitive about
       * them, so most locations arrive without any. The product has to
       * work in that state: the base capability is telling you a
       * co-tenancy condition has been met, and the money is computed
       * only where sales exist. Modelling sales as universally present
       * would make the demo promise arithmetic we usually cannot do.
       */
      ttmGrossSales:
        script.salesUnreported || r() > 0.35
          ? null
          : Math.round((gla * salesPsf) / 1000) * 1000,
      salesEstimated: false,
      commencement: iso(addDays(new Date(TODAY), -Math.floor(1100 + r() * 2600))),
      expiration: iso(addDays(new Date(TODAY), Math.floor(300 + r() * 2200))),
    },
    clause,
    claim: {
      firstObservedAt: script.claim?.firstObservedAt,
      noticeServedAt: script.claim?.noticeServedAt,
      failedPreconditions: script.claim?.failedPreconditions ?? [],
    },
    evidence,
    ownStatus: script.ownStatus ?? "open",
  };
}

function buildBackground(i: number): Location {
  const idx = 12 + (i % 12);
  const r = rng(`bg-${i}`);
  const heavy = r() < 0.18;
  const center = buildCenter(idx, {
    rentRollCoverage: 0.6 + r() * 0.39,
    vacancyRate: heavy ? 0.18 + r() * 0.1 : 0.04 + r() * 0.09,
    closures: heavy
      ? [{ slot: 0, kind: "junior", status: "dark", since: iso(addDays(new Date(TODAY), -Math.floor(30 + r() * 200))) }]
      : [],
  });
  const clauseIdx = Math.floor(r() * 3) as 0 | 1 | 2;
  return buildLocation(
    {
      centerIndex: idx,
      clause: clauseIdx,
      claim: {},
      evidence: heavy
        ? [
            {
              source: "maps_listing",
              daysAgo: Math.floor(5 + r() * 60),
              statement: "Listing shows permanently closed.",
              unit: "j0",
            },
          ]
        : [],
    },
    100 + i,
  );
}

export const portfolio: Location[] = [
  ...SCRIPTS.map(buildLocation),
  ...Array.from({ length: 56 }, (_, i) => buildBackground(i)),
];

org.watched = portfolio.length;

/* ------------------------------------------------------------------
   derived views
   ------------------------------------------------------------------ */

export function evaluationFor(loc: Location) {
  return evaluateClause(loc.clause, loc.center, loc.econ, loc.claim, TODAY);
}

export type Row = Location & { evaluation: ReturnType<typeof evaluateClause> };

export const rows: Row[] = portfolio.map((l) => ({
  ...l,
  evaluation: evaluationFor(l),
}));

export function rowById(id: string) {
  return rows.find((r) => r.id === id);
}

export const summary = (() => {
  const byState = new Map<string, number>();
  let atRiskAnnual = 0;
  let activeMonthly = 0;
  let potentialMissed = 0;
  let watchCount = 0;

  for (const r of rows) {
    byState.set(r.evaluation.state, (byState.get(r.evaluation.state) ?? 0) + 1);
    const d = r.evaluation.monthlyDelta ?? 0;
    if (r.evaluation.state === "claimable" || r.evaluation.state === "election_open") {
      atRiskAnnual += d * 12;
      potentialMissed += r.evaluation.potentialMissed ?? 0;
    }
    if (r.evaluation.state === "remedy_active") activeMonthly += d;
    if (r.evaluation.state === "watch" || r.evaluation.state === "curing") watchCount += 1;
  }

  return {
    byState,
    atRiskAnnual,
    activeMonthly,
    activeAnnual: activeMonthly * 12,
    potentialMissed,
    watchCount,
    centers: new Set(rows.map((r) => r.center.name)).size,
    states: new Set(rows.map((r) => r.center.state)).size,
  };
})();

/** Every piece of evidence across the portfolio, newest first. */
export const signalFeed = rows
  .flatMap((r) =>
    r.evidence.map((e) => ({
      ...e,
      locationId: r.id,
      centerName: r.center.name,
      city: `${r.center.city}, ${r.center.state}`,
      unitName: r.center.suites.find((s) => s.id === e.unitId)?.name ?? e.unitId,
      state: r.evaluation.state,
    })),
  )
  .sort((a, b) => (a.observedAt < b.observedAt ? 1 : -1));

/** Clauses whose abstraction confidence sits below the review threshold. */
export const reviewQueue = rows
  .filter((r) => r.clause.confidence < 0.92 || r.clause.amendments.length > 0)
  .slice(0, 14);

/**
 * PORTFOLIO INGEST
 *
 * The onboarding bottleneck is never the small client. It is the
 * retailer who arrives with eight hundred doors in a spreadsheet whose
 * columns nobody has agreed on since 2014, and a document repository
 * with four thousand PDFs named "Lease_FINAL_v3(2).pdf".
 *
 * So ingest is built as a pipeline with a triage queue rather than a
 * form: parse whatever they have, map it to our shape, resolve each
 * store to a shopping center, and route only the genuinely ambiguous
 * rows to a human. Everything here is deterministic and runs in the
 * browser so a prospect can see their own portfolio inside the wizard
 * before they have signed anything.
 */

export type ParsedRow = Record<string, string>;

/** Split a delimited line, honouring quoted fields. */
function splitLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else quoted = !quoted;
    } else if (ch === delim && !quoted) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export function detectDelimiter(text: string): string {
  const first = text.split(/\r?\n/).find((l) => l.trim().length) ?? "";
  const counts = [
    ["\t", (first.match(/\t/g) ?? []).length],
    [",", (first.match(/,/g) ?? []).length],
    [";", (first.match(/;/g) ?? []).length],
    ["|", (first.match(/\|/g) ?? []).length],
  ] as const;
  return [...counts].sort((a, b) => b[1] - a[1])[0][0];
}

export function parseDelimited(text: string): {
  headers: string[];
  rows: ParsedRow[];
} {
  const delim = detectDelimiter(text);
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = splitLine(lines[0], delim).map((h) =>
    h.replace(/^﻿/, ""),
  );
  const rows = lines.slice(1).map((line) => {
    const cells = splitLine(line, delim);
    const row: ParsedRow = {};
    headers.forEach((h, i) => (row[h] = cells[i] ?? ""));
    return row;
  });

  return { headers, rows };
}

/* ------------------------------------------------------------------
   column mapping
   ------------------------------------------------------------------ */

export type FieldKey =
  | "storeNumber"
  | "address"
  | "city"
  | "state"
  | "postal"
  | "centerName"
  | "landlord"
  | "suite"
  | "gla"
  | "baseRent"
  | "commencement"
  | "expiration"
  | "openDate"
  | "ownStatus"
  | "ignore";

/**
 * WHO SUPPLIES THIS, so we never ask twice for the same fact.
 *
 *   client    only they have it. The store's own identifier, where it is.
 *   lease     it is in the lease they are already sending us. Welcome in
 *             the roster because it saves us time, never required,
 *             because asking for it is asking a client to transcribe a
 *             document they have handed over.
 *   observed  we can establish it ourselves from the center's directory
 *             and only come back if it stays unclear.
 */
export type FieldSource = "client" | "lease" | "observed";

export const FIELDS: {
  key: FieldKey;
  label: string;
  required: boolean;
  from: FieldSource;
  hint: string;
  aliases: string[];
}[] = [
  {
    key: "storeNumber",
    label: "Store number",
    required: true,
    from: "client",
    hint: "Your internal identifier. This is how leases get matched back to locations.",
    aliases: ["store", "store #", "store no", "store number", "site", "site id", "location id", "unit id", "shop"],
  },
  {
    key: "address",
    label: "Street address",
    required: true,
    from: "client",
    hint: "Used to resolve which shopping center the store sits in.",
    aliases: ["address", "street", "address 1", "addr", "street address", "location address"],
  },
  {
    key: "city",
    label: "City",
    required: true,
    from: "client",
    hint: "",
    aliases: ["city", "town", "municipality"],
  },
  {
    key: "state",
    label: "State",
    required: true,
    from: "client",
    hint: "",
    aliases: ["state", "st", "province", "region code"],
  },
  {
    key: "postal",
    label: "Postal code",
    required: false,
    from: "client",
    hint: "Improves center resolution accuracy.",
    aliases: ["zip", "zip code", "postal", "postal code", "postcode"],
  },
  {
    key: "centerName",
    label: "Center name",
    required: false,
    from: "client",
    hint: "If you already know it, resolution gets much faster.",
    aliases: ["center", "mall", "property", "shopping center", "center name", "property name", "site name"],
  },
  {
    key: "landlord",
    label: "Landlord entity",
    required: false,
    from: "lease",
    hint: "The entity on the lease, not the brand. Notices are served on the entity, and one owner often holds each center in a separate one.",
    aliases: ["landlord", "landlord entity", "lessor", "owner", "owner entity", "landlord name"],
  },
  {
    key: "suite",
    label: "Suite or unit",
    required: false,
    from: "client",
    hint: "Your unit number within the center.",
    aliases: ["suite", "unit", "unit number", "suite number", "space", "space number", "premises"],
  },
  {
    key: "openDate",
    label: "Date opened",
    required: false,
    from: "lease",
    hint: "When the store began operating. Used to read opening co-tenancy provisions.",
    aliases: ["open date", "opened", "date opened", "rent commencement", "opening date"],
  },
  {
    key: "ownStatus",
    label: "Your store status",
    required: false,
    from: "observed",
    hint: "Open, dark or remodeling. Nearly every clause conditions relief on your own store being open and operating, and this is the one thing we cannot observe from outside.",
    aliases: ["status", "store status", "operating", "open closed", "current status", "trading status"],
  },
  {
    key: "gla",
    label: "Premises area",
    required: false,
    from: "lease",
    hint: "Square feet. Needed to quantify relief.",
    aliases: ["gla", "sf", "sqft", "square feet", "size", "area", "rentable"],
  },
  {
    key: "baseRent",
    label: "Base rent",
    required: false,
    from: "lease",
    hint: "Annual or monthly minimum rent. Needed to quantify relief.",
    aliases: ["rent", "base rent", "minimum rent", "annual rent", "monthly rent", "fixed rent"],
  },
  {
    key: "commencement",
    label: "Commencement",
    required: false,
    from: "lease",
    hint: "",
    aliases: ["commencement", "start", "lease start", "commencement date", "begin"],
  },
  {
    key: "expiration",
    label: "Expiration",
    required: false,
    from: "lease",
    hint: "Drives rollover risk against anchors named in your clauses.",
    aliases: ["expiration", "expiry", "end", "lease end", "expiration date", "term end"],
  },
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

/** Best-guess mapping from the customer's headers to our fields. */
export function autoMap(headers: string[]): Record<string, FieldKey> {
  const used = new Set<FieldKey>();
  const map: Record<string, FieldKey> = {};

  for (const h of headers) {
    const n = norm(h);
    let best: { key: FieldKey; score: number } | null = null;

    for (const f of FIELDS) {
      if (used.has(f.key)) continue;
      for (const a of f.aliases) {
        const an = norm(a);
        let score = 0;
        if (n === an) score = 100;
        else if (n.startsWith(an) || an.startsWith(n)) score = 80;
        else if (n.includes(an)) score = 65;
        if (score > (best?.score ?? 0)) best = { key: f.key, score };
      }
    }

    if (best && best.score >= 65) {
      map[h] = best.key;
      used.add(best.key);
    } else {
      map[h] = "ignore";
    }
  }

  return map;
}

/* ------------------------------------------------------------------
   validation and center resolution
   ------------------------------------------------------------------ */

export type IngestRow = {
  storeNumber: string;
  address: string;
  city: string;
  state: string;
  postal: string;
  centerName: string;
  gla: string;
  baseRent: string;
  issues: string[];
  /** Confidence that we matched this store to the right center. */
  resolution: "matched" | "review" | "unmatched";
  resolvedCenter: string;
};

const CENTER_HINTS = [
  "mall", "center", "center", "commons", "square", "galleria", "crossing",
  "town", "plaza", "shops", "market", "yards", "row", "landing", "park",
  "place", "court", "collection", "arcade", "green", "mills",
];

export function applyMapping(
  rows: ParsedRow[],
  mapping: Record<string, FieldKey>,
): IngestRow[] {
  const inverse = new Map<FieldKey, string>();
  for (const [header, key] of Object.entries(mapping)) {
    if (key !== "ignore" && !inverse.has(key)) inverse.set(key, header);
  }

  const get = (row: ParsedRow, key: FieldKey) => {
    const h = inverse.get(key);
    return h ? (row[h] ?? "").trim() : "";
  };

  const seen = new Set<string>();

  return rows.map((row) => {
    const storeNumber = get(row, "storeNumber");
    const address = get(row, "address");
    const city = get(row, "city");
    const state = get(row, "state");
    const centerName = get(row, "centerName");

    const issues: string[] = [];
    if (!storeNumber) issues.push("Missing store number");
    else if (seen.has(storeNumber)) issues.push("Duplicate store number");
    seen.add(storeNumber);

    if (!address) issues.push("Missing address");
    if (!city || !state) issues.push("Incomplete city or state");
    if (state && state.replace(/[^A-Za-z]/g, "").length > 2 && state.length > 20)
      issues.push("State looks malformed");

    /* Center resolution. A supplied center name that reads like a
       center resolves immediately. Otherwise we would geocode the
       address against a centers index; here the heuristic stands in
       for that, and anything uncertain routes to a human rather than
       being guessed silently. */
    let resolution: IngestRow["resolution"] = "unmatched";
    let resolvedCenter = "";

    if (centerName) {
      const looksLikeCenter = CENTER_HINTS.some((h) =>
        centerName.toLowerCase().includes(h),
      );
      resolution = looksLikeCenter ? "matched" : "review";
      resolvedCenter = centerName;
    } else if (address && city && state) {
      // Deterministic stand-in for the geocode step.
      const h = hash(`${address}|${city}|${state}`) % 100;
      resolution = h < 82 ? "matched" : "review";
      resolvedCenter = resolution === "matched" ? inferCenter(city, state) : "";
    } else {
      resolution = "unmatched";
    }

    return {
      storeNumber,
      address,
      city,
      state,
      postal: get(row, "postal"),
      centerName,
      gla: get(row, "gla"),
      baseRent: get(row, "baseRent"),
      issues,
      resolution,
      resolvedCenter,
    };
  });
}

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const SUFFIX = ["Commons", "Town Center", "Galleria", "Crossing", "Square", "Marketplace", "Mall"];
function inferCenter(city: string, state: string) {
  const s = SUFFIX[hash(city + state) % SUFFIX.length];
  return `${city} ${s}`;
}

/* ------------------------------------------------------------------
   a sample portfolio, so scale is visible before anyone uploads
   ------------------------------------------------------------------ */

const SAMPLE_CITIES: [string, string][] = [
  ["Dublin", "OH"], ["Frisco", "TX"], ["Bellevue", "WA"], ["Schaumburg", "IL"],
  ["Alpharetta", "GA"], ["Roseville", "CA"], ["Cary", "NC"], ["Novi", "MI"],
  ["King of Prussia", "PA"], ["Chandler", "AZ"], ["Broomfield", "CO"],
  ["Paramus", "NJ"], ["Franklin", "TN"], ["Overland Park", "KS"], ["Tampa", "FL"],
  ["Sandy", "UT"], ["Beachwood", "OH"], ["Bloomington", "MN"], ["Sugar Land", "TX"],
  ["Wauwatosa", "WI"], ["Peabody", "MA"], ["Knoxville", "TN"], ["Portland", "OR"],
  ["Eden Prairie", "MN"], ["Naperville", "IL"], ["Plano", "TX"], ["Cerritos", "CA"],
  ["Durham", "NC"], ["Mesa", "AZ"], ["Reno", "NV"],
];

const STREETS = ["Market St", "Commerce Way", "Center Dr", "Galleria Blvd", "Mall Ring Rd", "Retail Pkwy", "Main St"];

/**
 * Deliberately messy: the header names are the sort a real retailer
 * sends, some rows are missing a center, a couple are duplicated, and
 * the rent column mixes formats. The wizard has to survive that.
 */
export function sampleCsv(count = 248): string {
  const headers = [
    "Site #", "Street Address", "City", "ST", "Zip",
    "Property Name", "Rentable SF", "Annual Min Rent", "Lease Comm", "Lease Exp",
  ];
  const lines = [headers.join(",")];

  for (let i = 0; i < count; i++) {
    const [city, state] = SAMPLE_CITIES[i % SAMPLE_CITIES.length];
    const h = hash(`${city}${i}`);
    const store = 4100 + i * 3;
    const street = `${1000 + (h % 8000)} ${STREETS[h % STREETS.length]}`;
    const named = h % 7 !== 0;
    const center = named ? inferCenter(city, state) : "";
    const gla = 3000 + (h % 3600);
    const rent = 180000 + (h % 260000);
    const year = 2015 + (h % 9);

    // a couple of deliberate duplicates and a blank address
    const storeCell = i === 41 ? "4223" : i === 42 ? "4223" : String(store);
    const addrCell = i === 77 ? "" : street;

    lines.push(
      [
        storeCell,
        `"${addrCell}"`,
        city,
        state,
        String(10000 + (h % 89999)),
        center ? `"${center}"` : "",
        String(gla),
        i % 5 === 0 ? `$${rent.toLocaleString("en-US")}` : String(rent),
        `${1 + (h % 12)}/1/${year}`,
        `1/31/${year + 10}`,
      ].join(","),
    );
  }

  return lines.join("\n");
}

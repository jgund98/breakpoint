/**
 * ============================================================
 * INTAKE: THE TEMPLATE, THE RULES, AND THE REJECTION
 * ============================================================
 *
 * The client is paying us to do this. Every question we ask them is a
 * question we failed to answer ourselves, so the order of preference is
 * fixed:
 *
 *   REPAIR    fix it silently and say what we changed. "California"
 *             becomes CA. A rent with a dollar sign is still a rent.
 *   DEFER     take it from a document they already sent. Floor area,
 *             base rent and lease dates are all in the lease, so asking
 *             for them in a spreadsheet is asking a client to transcribe
 *             a document they have handed over.
 *   RESOLVE   work it out from what we hold. A missing state comes off
 *             the address; a missing store status comes off the center's
 *             own directory.
 *   ASK       only what nobody but them can answer, and only once.
 *
 * A row is held solely where we cannot tell which store it is. Everything
 * else loads with a note about who is solving it, and the note names us
 * wherever it honestly can.
 */

import { FIELDS, type FieldKey, type FieldSource, type ParsedRow } from "./ingest";

/* ------------------------------------------------------------------
   what "wrong" means
   ------------------------------------------------------------------ */

export type Severity = "error" | "warning";

export type Issue = {
  /** 1-based row number as the client sees it in their file. */
  row: number;
  field: FieldKey | "row";
  severity: Severity;
  /** Written for the person fixing the file, not for us. */
  message: string;
  value?: string;
};

export type IntakeReport = {
  totalRows: number;
  ready: number;
  withWarnings: number;
  held: number;
  issues: Issue[];
  /** Fixed on the way in, so the client never sees these as work. */
  repairs: Repair[];
  /** Fields the mapping never accounted for, so gaps are visible early. */
  missingFields: { key: FieldKey; label: string; required: boolean; from: FieldSource }[];
};

/**
 * Spelled-out and commonly mangled state names, so "California",
 * "Calif." and "N. Carolina" resolve instead of being handed back to
 * the client to retype. Repairing our own inputs is cheaper than
 * anyone's time, and a client who paid us to do this should not be
 * cleaning a spreadsheet on our behalf.
 */
const STATE_NAMES: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  calif: "CA", colorado: "CO", connecticut: "CT", conn: "CT", delaware: "DE",
  florida: "FL", fla: "FL", georgia: "GA", hawaii: "HI", idaho: "ID",
  illinois: "IL", ill: "IL", indiana: "IN", iowa: "IA", kansas: "KS",
  kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
  massachusetts: "MA", mass: "MA", michigan: "MI", mich: "MI",
  minnesota: "MN", minn: "MN", mississippi: "MS", missouri: "MO",
  montana: "MT", nebraska: "NE", nevada: "NV", "new hampshire": "NH",
  "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
  "north carolina": "NC", "n carolina": "NC", "north dakota": "ND",
  ohio: "OH", oklahoma: "OK", okla: "OK", oregon: "OR", pennsylvania: "PA",
  penn: "PA", "rhode island": "RI", "south carolina": "SC",
  "s carolina": "SC", "south dakota": "SD", tennessee: "TN", tenn: "TN",
  texas: "TX", tex: "TX", utah: "UT", vermont: "VT", virginia: "VA",
  washington: "WA", wash: "WA", "west virginia": "WV", wisconsin: "WI",
  wis: "WI", wyoming: "WY", "district of columbia": "DC",
  "puerto rico": "PR",
};

/** What we corrected without asking, reported rather than hidden. */
export type Repair = { row: number; field: FieldKey; from: string; to: string };

function repairState(v: string): string | null {
  const up = v.trim().toUpperCase();
  if (US_STATES.has(up)) return up;
  const key = v.trim().toLowerCase().replace(/\./g, "").replace(/\s+/g, " ");
  return STATE_NAMES[key] ?? null;
}

const US_STATES = new Set(
  ("AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO " +
    "MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY " +
    "DC PR VI GU AS MP").split(" "),
);

const OWN_STATUS = new Set(["open", "dark", "closed", "remodeling", "remodel"]);

/** Accepts the date formats a US lease administration export actually emits. */
export function parseLooseDate(v: string): Date | null {
  const s = v.trim();
  if (!s) return null;
  // ISO first, because it is unambiguous.
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) return utc(+m[1], +m[2], +m[3]);
  // US order. Two digit years are read as 2000s unless that is in the
  // future by more than a year, which makes "97" 1997 rather than 2097.
  m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/.exec(s);
  if (m) {
    let y = +m[3];
    if (y < 100) y = y + 2000 > new Date().getUTCFullYear() + 1 ? y + 1900 : y + 2000;
    return utc(y, +m[1], +m[2]);
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function utc(y: number, m: number, d: number) {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return new Date(Date.UTC(y, m - 1, d));
}

/** Strips the currency and separators a spreadsheet export leaves in. */
export function parseLooseNumber(v: string): number | null {
  const s = v.replace(/[$,\s]/g, "").replace(/^\((.*)\)$/, "-$1");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/* ------------------------------------------------------------------
   the rules
   ------------------------------------------------------------------ */

export function validateIntake(
  rows: ParsedRow[],
  mapping: Record<string, FieldKey>,
): IntakeReport {
  const issues: Issue[] = [];
  const repairs: Repair[] = [];
  const mapped = new Set(Object.values(mapping));

  const missingFields = FIELDS.filter((f) => !mapped.has(f.key)).map((f) => ({
    key: f.key,
    label: f.label,
    required: f.required,
    from: f.from,
  }));

  /** header -> our field, inverted for lookups */
  const colOf = (key: FieldKey) =>
    Object.keys(mapping).find((h) => mapping[h] === key);

  const seenStore = new Map<string, number>();
  const rowState: ("ready" | "warning" | "held")[] = [];

  rows.forEach((r, i) => {
    const n = i + 1;
    let held = false;
    let warned = false;

    const val = (key: FieldKey) => {
      const c = colOf(key);
      return c ? (r[c] ?? "").trim() : "";
    };
    const add = (
      field: Issue["field"],
      severity: Severity,
      message: string,
      value?: string,
    ) => {
      issues.push({ row: n, field, severity, message, value });
      if (severity === "error") held = true;
      else warned = true;
    };

    /* identity ------------------------------------------------------ */
    const store = val("storeNumber");
    if (!store) {
      add("storeNumber", "error", "No store number. We use it to tie leases and documents back to this location.");
    } else if (seenStore.has(store)) {
      add(
        "storeNumber",
        "error",
        `Store number ${store} also appears on row ${seenStore.get(store)}. Each store needs its own number.`,
        store,
      );
    } else {
      seenStore.set(store, n);
    }

    /* where it is --------------------------------------------------- */
    const city = val("city");
    const state = val("state").toUpperCase();
    const center = val("centerName");
    const address = val("address");

    if (!address && !center)
      add("address", "error", "No street address and no center name. We need one of the two to work out which center this store sits in.");
    if (!city) add("city", "warning", "No city. Center matching will be slower and may need confirming.");
    if (!state) {
      add("state", "warning", "No state. We will take it from the address.");
    } else {
      const fixed = repairState(val("state"));
      if (fixed && fixed !== val("state").trim().toUpperCase())
        repairs.push({ row: n, field: "state", from: val("state"), to: fixed });
      else if (!fixed)
        add(
          "state",
          "warning",
          `We could not read "${val("state")}" as a state. We will resolve it from the address and confirm with you only if it stays unclear.`,
          val("state"),
        );
    }

    /* the numbers --------------------------------------------------- */
    const gla = val("gla");
    if (gla) {
      const nn = parseLooseNumber(gla);
      if (nn == null) add("gla", "error", `Premises area "${gla}" is not a number.`, gla);
      else if (nn <= 0) add("gla", "error", "Premises area must be greater than zero.", gla);
      else if (nn < 200 || nn > 250000)
        add("gla", "warning", `Premises area of ${nn.toLocaleString("en-US")} sq ft looks unusual. Confirm the units are square feet.`, gla);
    } else {
      add("gla", "warning", "No premises area in this file. We take it from the lease.");
    }

    const rent = val("baseRent");
    if (rent) {
      const nn = parseLooseNumber(rent);
      if (nn == null) add("baseRent", "error", `Base rent "${rent}" is not a number.`, rent);
      else if (nn < 0) add("baseRent", "error", "Base rent cannot be negative.", rent);
    } else {
      add("baseRent", "warning", "No base rent in this file. We take it from the lease.");
    }

    /* the dates ----------------------------------------------------- */
    const comm = val("commencement");
    const exp = val("expiration");
    const commD = comm ? parseLooseDate(comm) : null;
    const expD = exp ? parseLooseDate(exp) : null;

    if (comm && !commD)
      add("commencement", "error", `Commencement "${comm}" is not a date we can read. Use YYYY-MM-DD or MM/DD/YYYY.`, comm);
    if (exp && !expD)
      add("expiration", "error", `Expiration "${exp}" is not a date we can read. Use YYYY-MM-DD or MM/DD/YYYY.`, exp);
    if (commD && expD && expD <= commD)
      add("expiration", "error", "Expiration is on or before commencement.", exp);
    if (!exp)
      add("expiration", "warning", "No expiration in this file. We take it from the lease.");

    const opened = val("openDate");
    if (opened && !parseLooseDate(opened))
      add("openDate", "error", `Date opened "${opened}" is not a date we can read.`, opened);

    /* your own store ------------------------------------------------ */
    const own = val("ownStatus").toLowerCase();
    if (own && !OWN_STATUS.has(own))
      add("ownStatus", "warning", `Status "${own}" is not one we recognize. Use open, dark or remodeling.`, own);
    if (!own)
      add(
        "ownStatus",
        "warning",
        "No store status. We check each one against the center directory and come back to you only where it is unclear.",
      );

    rowState.push(held ? "held" : warned ? "warning" : "ready");
  });

  return {
    totalRows: rows.length,
    ready: rowState.filter((s) => s === "ready").length,
    withWarnings: rowState.filter((s) => s === "warning").length,
    held: rowState.filter((s) => s === "held").length,
    issues,
    repairs,
    missingFields,
  };
}

/* ------------------------------------------------------------------
   the template
   ------------------------------------------------------------------ */

/**
 * The file we hand a client so nobody guesses a format.
 *
 * Comment lines lead with # and every parser we use skips them, so the
 * instructions can live in the file itself rather than in an email that
 * gets separated from it.
 */
export function intakeTemplateCsv(): string {
  const cols = FIELDS.filter((f) => f.key !== "ignore");
  const header = cols.map((f) => f.label).join(",");
  const clientCols = cols.filter((f) => f.from === "client").map((f) => f.label);
  const leaseCols = cols.filter((f) => f.from !== "client").map((f) => f.label);

  const example = [
    "4417",
    "7007 Friars Road",
    "San Diego",
    "CA",
    "92108",
    "Fashion Valley",
    "Fashion Valley Mall LLC",
    "Suite 318",
    "8302",
    "747180",
    "2018-03-01",
    "2031-01-31",
    "2018-04-12",
    "open",
  ];
  const example2 = [
    "4422",
    "7 Backus Avenue",
    "Danbury",
    "CT",
    "06810",
    "Danbury Fair",
    "Danbury Mall LLC",
    "Suite 210",
    "5100",
    "397000",
    "2019-09-01",
    "2030-01-31",
    "2019-11-08",
    "open",
  ];

  const notes = [
    "# BREAKPOINT STORE ROSTER",
    "#",
    "# You probably do not need this file. Send whatever your system",
    "# already exports and we will map the columns ourselves. This is",
    "# here only if starting from a blank sheet is easier.",
    "#",
    `# ONLY THESE MATTER: ${clientCols.join(", ")}`,
    "#   Enough to tell one store from another and find its center.",
    "#",
    `# NICE TO HAVE: ${leaseCols.join(", ")}`,
    "#   All of it is in the leases you are sending us. Include it if",
    "#   your export already has it, because it saves us a step. Do not",
    "#   type it in by hand. Reading it off the lease is our job.",
    "#",
    "# Formats are not strict. Dates in any common order, rent with or",
    "# without a dollar sign, states spelled out or abbreviated.",
    "# Delete the example rows before sending.",
    "#",
  ].join("\n");

  return `${notes}\n${header}\n${example.join(",")}\n${example2.join(",")}\n`;
}

/**
 * Only the rows that failed, in the shape they arrived, with a column
 * saying what to fix. A client should be able to open this, correct it
 * and send it straight back.
 */
export function issuesCsv(
  rows: ParsedRow[],
  headers: string[],
  report: IntakeReport,
): string {
  const byRow = new Map<number, Issue[]>();
  for (const i of report.issues) {
    if (i.severity !== "error") continue;
    const list = byRow.get(i.row) ?? [];
    list.push(i);
    byRow.set(i.row, list);
  }

  const esc = (s: string) =>
    /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;

  const out = [
    ["Row in your file", "What to fix", ...headers].map(esc).join(","),
  ];
  for (const [row, list] of [...byRow.entries()].sort((a, b) => a[0] - b[0])) {
    const r = rows[row - 1] ?? {};
    out.push(
      [
        String(row),
        list.map((i) => i.message).join(" "),
        ...headers.map((h) => r[h] ?? ""),
      ]
        .map(esc)
        .join(","),
    );
  }
  return out.join("\n") + "\n";
}

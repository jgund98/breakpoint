/**
 * ============================================================
 * WHICH CENTER IS THIS?
 * ============================================================
 *
 * A client's roster says "Fashion Valley Mall". Our index says "Fashion
 * Valley". Another row says "The Galleria" and there are two of those in
 * different states. Getting this wrong is worse than getting a tenant
 * name wrong, because a center carries the whole roster, the occupancy
 * series and every clause evaluated against it: matching a store to the
 * wrong mall does not produce a small error, it produces a confident one.
 *
 * The pilot portfolio alone contains the two failure modes:
 *
 *   "The Galleria", Houston TX
 *   "The Galleria at Fort Lauderdale", Fort Lauderdale FL
 *        One name is a prefix of the other. Prefix matching joins them.
 *
 *   "Woodfield Mall", Schaumburg IL
 *   "Woodland Mall", Grand Rapids MI
 *        One letter apart. Any edit-distance threshold loose enough to
 *        forgive a typo is loose enough to merge these two.
 *
 * So the rules are the same ones the tenant matcher runs on, for the
 * same reason: geography decides, never string similarity alone.
 *
 *   MATCHED   the name resolves and the state agrees. State is the
 *             strongest signal we hold and it is on nearly every roster.
 *   REVIEW    a plausible name with no state, a state that disagrees, or
 *             more than one candidate. A person picks.
 *   NEW       nothing resembles it, which usually means a center we have
 *             not indexed rather than a mistake. We add it.
 *
 * Nothing here guesses. A wrong center is discovered months later when a
 * clause is evaluated against another mall's occupancy.
 */

export type CenterRecord = {
  id: string;
  name: string;
  city: string;
  state: string;
  /** Other names the same center trades under, including parentheticals. */
  aliases?: string[];
};

export type CenterMatch =
  | { status: "matched"; center: CenterRecord; why: string }
  | { status: "review"; candidates: CenterRecord[]; why: string }
  | { status: "new"; why: string };

/* ------------------------------------------------------------------
   normalization
   ------------------------------------------------------------------ */

/** Words that identify a shopping center but never distinguish one. */
const GENERIC = new Set([
  "mall", "center", "centre", "shopping", "shoppes", "shops", "the",
  "at", "of", "plaza", "commons", "crossing", "towne", "town",
]);

export function normalizeCenterName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * The distinguishing part of a name.
 *
 * "Fashion Valley Mall" and "Fashion Valley" reduce to the same core, so
 * a client adding or dropping "Mall" is not a mismatch. Generic words
 * are only stripped while something is left: "The Galleria" reduces to
 * "galleria" and stops there rather than to nothing.
 */
export function centerCore(raw: string): string {
  const words = normalizeCenterName(raw).split(" ").filter(Boolean);
  const kept = words.filter((w) => !GENERIC.has(w));
  return (kept.length ? kept : words).join(" ");
}

/** Names a center answers to, including anything in parentheses. */
function namesOf(c: CenterRecord): string[] {
  const out = [c.name, ...(c.aliases ?? [])];
  const paren = /\((.*?)\)/.exec(c.name);
  if (paren) out.push(paren[1]);
  return out;
}

/* ------------------------------------------------------------------
   the resolver
   ------------------------------------------------------------------ */

export function resolveCenter(
  input: { name?: string; city?: string; state?: string },
  index: CenterRecord[],
): CenterMatch {
  const rawName = (input.name ?? "").trim();
  const state = (input.state ?? "").trim().toUpperCase();
  const city = normalizeCenterName(input.city ?? "");

  if (!rawName) return { status: "new", why: "No center name supplied." };

  const want = normalizeCenterName(rawName);
  const wantCore = centerCore(rawName);

  /*
   * Centers whose name sits either side of this one, worked out up front
   * because a match with no state to confirm it cannot be trusted while
   * one of these exists. "Galleria" alone is not The Galleria in Houston
   * just because that is the shorter of the two.
   */
  const contained = index.filter((c) =>
    namesOf(c).some((n) => {
      const nn = centerCore(n);
      return (
        wantCore.length > 2 &&
        nn !== wantCore &&
        (nn.startsWith(`${wantCore} `) || wantCore.startsWith(`${nn} `))
      );
    }),
  );

  /* Exact on any name the center answers to. */
  const exact = index.filter((c) =>
    namesOf(c).some((n) => normalizeCenterName(n) === want),
  );
  if (exact.length === 1 && state && exact[0].state === state)
    return { status: "matched", center: exact[0], why: "Name and state both match." };
  if (exact.length === 1 && !state) {
    if (contained.length)
      return {
        status: "review",
        candidates: [exact[0], ...contained],
        why: "The name matches one center exactly and resembles another. With no state given, a person should pick.",
      };
    return {
      status: "matched",
      center: exact[0],
      why: "Name matches, and only one center carries it.",
    };
  }
  if (exact.length === 1 && state && exact[0].state !== state)
    return {
      status: "review",
      candidates: exact,
      why: `The name matches ${exact[0].name}, but that center is in ${exact[0].state} and this row says ${state}.`,
    };
  if (exact.length > 1) {
    const inState = exact.filter((c) => c.state === state);
    if (state && inState.length === 1)
      return { status: "matched", center: inState[0], why: "Several centers share this name; the state settles it." };
    return {
      status: "review",
      candidates: exact,
      why: `${exact.length} centers trade under this name${state ? " and the state does not separate them" : " and no state was given"}.`,
    };
  }

  /*
   * Core match: the distinguishing words agree once "Mall" and friends
   * are set aside. State must agree, because this is exactly where
   * Woodfield and Woodland would otherwise meet.
   */
  const core = index.filter((c) => namesOf(c).some((n) => centerCore(n) === wantCore));
  if (core.length) {
    const inState = state ? core.filter((c) => c.state === state) : core;
    if (inState.length === 1 && state)
      return {
        status: "matched",
        center: inState[0],
        why: "Same center once Mall or Center is set aside, and the state agrees.",
      };
    if (inState.length === 1 && !state) {
      if (contained.length)
        return {
          status: "review",
          candidates: [inState[0], ...contained],
          why: "More than one center fits this name and no state was given to separate them.",
        };
      return {
        status: "matched",
        center: inState[0],
        why: "Same center once Mall or Center is set aside, and no other center resembles it.",
      };
    }
    if (inState.length > 1)
      return { status: "review", candidates: inState, why: "More than one center fits." };
    return {
      status: "review",
      candidates: core,
      why: `The name fits ${core[0].name}, which is in ${core[0].state} rather than ${state}.`,
    };
  }

  /*
   * Containment. NEVER a match on its own: "The Galleria" sits inside
   * "The Galleria at Fort Lauderdale" and they are a thousand miles
   * apart. A person decides, with the state shown.
   */
  if (contained.length) {
    const inState = state ? contained.filter((c) => c.state === state) : contained;
    const list = inState.length ? inState : contained;
    /* Even in-state and alone, a city that disagrees is a warning worth
       a person: this is the Woodland-in-Schaumburg shape. */
    const cityAgrees = city && list.length === 1 && normalizeCenterName(list[0].city) === city;
    return {
      status: "review",
      candidates: list,
      why: cityAgrees
        ? "One name contains the other and the city agrees, but the two are different centers often enough to check."
        : "One name contains the other. These are frequently different centers.",
    };
  }

  return {
    status: "new",
    why: "Nothing in the index resembles this. Most likely a center we have not indexed yet.",
  };
}

/* ------------------------------------------------------------------
   the index we hold today
   ------------------------------------------------------------------ */

/**
 * Built by the caller, so this module stays free of data imports and can
 * be exercised by a test runner as easily as by the app. In production
 * it is the shared `center` table, which every client reads and none of
 * them owns: two tenants in the same mall must resolve to one record
 * rather than to two that drift apart.
 */
export function buildCenterIndex(
  locations: { center: { id: string; name: string; city: string; state: string } }[],
): CenterRecord[] {
  const seen = new Map<string, CenterRecord>();
  for (const l of locations) {
    if (!seen.has(l.center.id))
      seen.set(l.center.id, {
        id: l.center.id,
        name: l.center.name,
        city: l.center.city,
        state: l.center.state,
      });
  }
  return [...seen.values()];
}

export type ResolutionSummary = {
  matched: number;
  review: number;
  fresh: number;
  rows: {
    row: number;
    supplied: string;
    result: CenterMatch;
  }[];
};

export function resolveAll(
  rows: { name?: string; city?: string; state?: string }[],
  index: CenterRecord[],
): ResolutionSummary {
  const out: ResolutionSummary = { matched: 0, review: 0, fresh: 0, rows: [] };
  rows.forEach((r, i) => {
    const result = resolveCenter(r, index);
    if (result.status === "matched") out.matched++;
    else if (result.status === "review") out.review++;
    else out.fresh++;
    out.rows.push({ row: i + 1, supplied: r.name ?? "", result });
  });
  return out;
}

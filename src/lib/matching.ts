/**
 * MATCHING LEASE NAMES TO STORES
 *
 * A co-tenancy clause names its tenants in the words of the lease. A
 * center's directory lists them in the words of the center. The two
 * agree less often than you would hope, and the gap is where this
 * product either earns its fee or quietly destroys a claim.
 *
 * From one real portfolio of twenty centers, the ways they disagree:
 *
 *   "Dick's Sporting Goods"  vs  "DICK'S Sporting Goods"    casing
 *   "Apple"                  vs  "Apple Computer"           legal name
 *   "lululemon"              vs  "Lululemon Athletica"      full name
 *   "LEGO"                   vs  "LEGO Store"               store format
 *   "Cinemark"               vs  "Cinemark Franklin Park 16 & XD"
 *   "Zara"                   vs  "Zara Beauty Bar"
 *   "Life Time"              vs  "Life Time Athletic", "Life Time Work",
 *                                "Life Time Sport", "LifeCafe at Life Time"
 *
 * The last two are the reason this file refuses to be clever. Read as
 * strings, "Cinemark Franklin Park 16 & XD" and "Zara Beauty Bar" have
 * the identical shape: the lease name, then more words. The first is
 * the tenant. The second is a different store that happens to share a
 * brand. No amount of fuzzy matching separates them, because the
 * difference is not in the text, it is in the world.
 *
 * The same trap runs the other direction. Fashion Valley's directory
 * carries "jcpenney", "JCPenney", "JCPenney Optical" and "JCPenney
 * Portrait Studio" as four separate rows with four different floor
 * areas. Only one is the department store the lease means, and only
 * that one went dark. Anything that folds them together reports the
 * anchor as still trading.
 *
 * So the rule here is narrow on purpose:
 *
 *   AUTO-ACCEPT only an exact match once case, punctuation and spacing
 *   are normalized. Nothing else. That is the one transformation that
 *   cannot change which store is meant.
 *
 *   PROPOSE everything else to a person, ranked, with the alternatives
 *   visible. A confirmed match is stored as an alias and reused across
 *   the whole portfolio, so "lululemon = Lululemon Athletica" is
 *   decided once and never asked again, however many centers follow.
 *
 * That last point is what makes this tractable at scale. The work is
 * per BRAND, not per location. Twenty centers surfaced six decisions.
 * A portfolio of nine thousand stores draws on the same few hundred
 * national retailers, so the queue shrinks as the alias book grows
 * rather than growing with the portfolio.
 */

/* ------------------------------------------------------------------
   normalization
   ------------------------------------------------------------------ */

/**
 * Fold only what cannot change the referent: letter case, punctuation
 * and runs of whitespace. Words are never added or removed, because a
 * word is exactly what distinguishes "Zara" from "Zara Beauty Bar".
 */
export function normalizeTenantName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/* ------------------------------------------------------------------
   the alias book
   ------------------------------------------------------------------ */

/**
 * Confirmed equivalences, keyed by the normalized lease name. The value
 * is the normalized directory name a person confirmed it refers to.
 *
 * Portfolio-wide by design. These are national retailers, so a decision
 * made at one center is right at every other center.
 */
export type AliasBook = Record<string, string>;

export type MatchConfidence = "exact" | "alias";

export type MatchCandidate = {
  /** The directory's wording. */
  name: string;
  /** Suite id in the center. */
  id: string;
  /** Why it was proposed, in plain words, for the reviewer. */
  reason: string;
};

export type MatchResult =
  | { status: "matched"; id: string; name: string; confidence: MatchConfidence }
  /** Plausible candidates exist, but choosing between them needs a person. */
  | { status: "review"; leaseName: string; candidates: MatchCandidate[] }
  /** Nothing in the directory resembles the name. */
  | { status: "unmatched"; leaseName: string };

type RosterEntry = { id: string; name: string };

/**
 * Resolve one lease name against one center's directory.
 *
 * Returns a decision, never a guess. Callers must treat "review" and
 * "unmatched" as not-yet-computable rather than as a failed test, since
 * an unresolved tenant tells us nothing about whether it is open.
 */
export function matchTenant(
  leaseName: string,
  roster: RosterEntry[],
  aliases: AliasBook = {},
): MatchResult {
  const want = normalizeTenantName(leaseName);

  // 1. Exact, once case and punctuation are folded.
  const exact = roster.filter((r) => normalizeTenantName(r.name) === want);
  if (exact.length === 1)
    return { status: "matched", id: exact[0].id, name: exact[0].name, confidence: "exact" };

  /*
   * Two directory rows normalizing to the same string is a data defect
   * in the directory, not a match. Fashion Valley's "jcpenney" and
   * "JCPenney" differ by 42,000 sq ft and only one of them closed, so
   * picking either one silently is how a claim gets lost.
   */
  if (exact.length > 1)
    return {
      status: "review",
      leaseName,
      candidates: exact.map((r) => ({
        id: r.id,
        name: r.name,
        reason: "Directory lists this name more than once with different details",
      })),
    };

  // 2. A person already decided this one.
  const aliased = aliases[want];
  if (aliased) {
    const hit = roster.find((r) => normalizeTenantName(r.name) === aliased);
    if (hit)
      return { status: "matched", id: hit.id, name: hit.name, confidence: "alias" };
  }

  // 3. Propose, rank, and let a person choose.
  const candidates: MatchCandidate[] = [];
  for (const r of roster) {
    const have = normalizeTenantName(r.name);
    if (have.startsWith(want + " "))
      candidates.push({ id: r.id, name: r.name, reason: "Directory name extends the lease name" });
    else if (want.startsWith(have + " "))
      candidates.push({ id: r.id, name: r.name, reason: "Lease name extends the directory name" });
    else if (have.includes(" " + want + " ") || have.endsWith(" " + want))
      candidates.push({ id: r.id, name: r.name, reason: "Lease name appears inside the directory name" });
  }

  if (candidates.length === 0) return { status: "unmatched", leaseName };

  /* Shortest first: the fewest extra words is the likeliest referent,
     though likeliest is still not certain enough to accept for them. */
  candidates.sort((a, b) => a.name.length - b.name.length);
  return { status: "review", leaseName, candidates };
}

/**
 * DE-SLUGIFY A DIRECTORY NAME FOR DISPLAY ONLY.
 *
 * One of the twenty centers arrives with its roster already slugified
 * by whatever scraped it: "Five_below", "Ann_taylor", "Barnes__noble",
 * "Abercrombie__fitch". Shown raw, the product looks broken.
 *
 * This reverses the slugification rather than guessing at it. The
 * doubled underscore is where an ampersand was, so "Barnes__noble"
 * becomes "Barnes & Noble", and single underscores were spaces. What it
 * will not do is restore punctuation that the slug genuinely destroyed:
 * "Auntie_annes" becomes "Auntie Annes", not "Auntie Anne's", because
 * the apostrophe is gone and inventing it is inventing data.
 *
 * Display only. Identity, matching and suite ids all run on the name as
 * received, so nothing here can change which store a clause refers to.
 */
export function displayTenantName(raw: string): string {
  if (!raw.includes("_")) return raw;
  return raw
    .replace(/__/g, " & ")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

/** A queued decision, as it reaches the reviewer. */
export type PendingMatch = {
  centerId: string;
  centerName: string;
  /** The clause limb that needs it, so the stakes are visible. */
  cite: string;
  leaseName: string;
  candidates: MatchCandidate[];
};

import type { PortfolioBundle, Row } from "@/lib/portfolio";

/**
 * THE LANDLORD BOOK
 *
 * Ownership is how a head of real estate actually negotiates: not one
 * lease at a time but one landlord at a time, across every center that
 * landlord controls. Raw ownership strings in center data are messy
 * (JVs, managers, affiliates), so we resolve each to a negotiating
 * family first and keep the raw string as the receipt.
 */

export type LandlordGroup = {
  name: string;
  /** Raw ownership strings folded into this family. */
  entities: string[];
  centers: { name: string; city: string; state: string; doors: number }[];
  doors: number;
  /** Locations currently failing a watched condition. */
  failing: number;
  /** Locations in a triggered/actionable position. */
  triggered: number;
  /** Sum of monthly deltas across failing positions (MAY qualify). */
  monthly: number;
  /** Ids for DB joins (notices served etc.). */
  locationIds: string[];
  tightest: { center: string; note: string } | null;
};

/** Fold a raw ownership string into a negotiating family. */
export function landlordFamily(raw: string | null | undefined): string {
  const s = (raw ?? "").trim();
  if (!s) return "Ownership not on file";
  const l = s.toLowerCase();
  if (l.includes("simon") || l.includes("taubman")) return "Simon Property Group";
  if (l.includes("macerich")) return "Macerich";
  if (l.includes("brookfield")) return "Brookfield Properties";
  if (l.includes("centennial")) return "Centennial Real Estate";
  if (l.includes("preit")) return "PREIT";
  if (l.includes("pyramid")) return "Pyramid Management Group";
  if (l.includes("cbl")) return "CBL Properties";
  if (l.includes("pacific retail")) return "Pacific Retail Capital Partners";
  /* Unknown shapes: first meaningful segment before a slash or paren. */
  const head = s.split(/[/(]/)[0].trim();
  return head || s;
}

const ACTIONABLE = new Set([
  "claimable",
  "election_open",
  "remedy_active",
  "cure_running",
  "cap_reached",
]);

export function landlordBook(p: PortfolioBundle): LandlordGroup[] {
  const groups = new Map<string, LandlordGroup>();
  const centerSeen = new Map<string, Set<string>>();

  for (const r of p.rows as Row[]) {
    const family = landlordFamily(r.center.owner);
    let g = groups.get(family);
    if (!g) {
      g = {
        name: family,
        entities: [],
        centers: [],
        doors: 0,
        failing: 0,
        triggered: 0,
        monthly: 0,
        locationIds: [],
        tightest: null,
      };
      groups.set(family, g);
      centerSeen.set(family, new Set());
    }
    const raw = (r.center.owner ?? "").trim();
    if (raw && !g.entities.includes(raw)) g.entities.push(raw);

    const seen = centerSeen.get(family)!;
    if (!seen.has(r.center.name)) {
      seen.add(r.center.name);
      g.centers.push({
        name: r.center.name,
        city: r.center.city,
        state: r.center.state,
        doors: 1,
      });
    } else {
      const c = g.centers.find((c) => c.name === r.center.name);
      if (c) c.doors += 1;
    }

    g.doors += 1;
    g.locationIds.push(r.id);

    const ev = r.evaluation;
    if (ev.anyFailing) {
      g.failing += 1;
      g.monthly += ev.monthlyDelta ?? 0;
    }
    if (ACTIONABLE.has(ev.state)) g.triggered += 1;

    /* the tightest margin under this landlord: the renewal-meeting line */
    const tight = [...ev.triggers]
      .filter((t) => !t.failing && Number.isFinite(t.ratio))
      .sort((a, b) => a.ratio - b.ratio)[0];
    if (tight && (!g.tightest || tight.ratio < 0.15)) {
      g.tightest = g.tightest ?? {
        center: r.center.name,
        note: `${tight.label}: ${tight.headroom}`,
      };
    }
  }

  return [...groups.values()].sort(
    (a, b) =>
      b.triggered - a.triggered || b.doors - a.doors || a.name.localeCompare(b.name),
  );
}

import { TODAY, rows } from "@/lib/portfolio";
import { coverage } from "@/lib/coverage";

/**
 * Every date on the portfolio that demands something of a person,
 * gathered for the calendar: cure windows closing, election deadlines
 * lapsing, and the standing report cadence. Lease admins live in
 * their calendars — these are built to leave (each item exports to
 * .ics).
 */

export type Deadline = {
  /** Stable id so ICS exports stay idempotent in calendar apps. */
  uid: string;
  dateISO: string;
  daysAway: number;
  kind: "cure" | "election" | "report";
  title: string;
  detail: string;
  locationId: string | null;
};

const daysFrom = (iso: string) =>
  Math.round(
    (Date.parse(iso + "T00:00:00Z") - Date.parse(TODAY + "T00:00:00Z")) / 86400000,
  );

export function portfolioDeadlines(): Deadline[] {
  const items: Deadline[] = [];

  for (const r of rows) {
    const ev = r.evaluation;
    if (ev.cureEndsOn && (ev.daysUntilCureEnds ?? -1) > 0 && ev.anyFailing) {
      items.push({
        uid: `bp-cure-${r.id}`,
        dateISO: ev.cureEndsOn,
        daysAway: daysFrom(ev.cureEndsOn),
        kind: "cure",
        title: `Cure window closes · ${r.center.name}`,
        detail: `${r.id}. The landlord's window to cure the failing condition ends. If it stands uncured, the remedy becomes claimable.`,
        locationId: r.id,
      });
    }
    if (ev.electionDeadline && (ev.daysUntilElection ?? -1) > 0) {
      items.push({
        uid: `bp-election-${r.id}`,
        dateISO: ev.electionDeadline,
        daysAway: daysFrom(ev.electionDeadline),
        kind: "election",
        title: `Election lapses · ${r.center.name}`,
        detail: `${r.id}. The window to elect the remedy under the lease closes. A decision is needed before this date.`,
        locationId: r.id,
      });
    }
  }

  if (coverage.nextSweepISO) {
    items.push({
      uid: `bp-report-${coverage.nextSweepISO}`,
      dateISO: coverage.nextSweepISO,
      daysAway: daysFrom(coverage.nextSweepISO),
      kind: "report",
      title: "Next full portfolio report",
      detail: "The recurring evaluation report across every watched location.",
      locationId: null,
    });
  }

  return items.sort((a, b) => a.dateISO.localeCompare(b.dateISO));
}


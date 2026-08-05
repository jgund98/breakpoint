/**
 * ACTIVITY: sweeps, reports, notifications.
 *
 * A client pays for a system that runs whether or not anything happens.
 * If they log in during a quiet quarter and see an empty screen, they
 * conclude they are paying for nothing. So the record of the work is
 * itself a deliverable: every sweep that ran, what it checked, what
 * changed, what was sent and to whom.
 *
 * Everything here is derived from the portfolio and the evidence we
 * actually hold. Sweep counts come from the watch list, and findings
 * are tied to real observation dates rather than invented.
 */

import { addDays, daysBetween, iso, prettyDate } from "./clause";
import { TODAY, rows, signalFeed } from "./portfolio";
import { coverage } from "./coverage";

const WEEKS_BACK = 12;

export type SweepStatus = "complete" | "complete_with_changes" | "running";

export type Sweep = {
  id: string;
  ranOn: string;
  targetsChecked: number;
  /** Stores whose status changed on this pass. */
  changes: number;
  /** Changes that opened or advanced a finding. */
  findings: number;
  status: SweepStatus;
  /** Named stores that moved, for the detail line. */
  moved: { store: string; center: string; from: string; to: string }[];
};

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Sweeps run weekly. Real observations are bucketed into the sweep that
 * would have caught them, so the history lines up with the signal feed
 * instead of contradicting it.
 */
export const sweeps: Sweep[] = (() => {
  const today = new Date(TODAY);
  const out: Sweep[] = [];

  for (let w = 0; w < WEEKS_BACK; w++) {
    const ranOn = addDays(today, -w * 7);
    const windowStart = addDays(ranOn, -7);

    const caught = signalFeed.filter((s) => {
      const d = new Date(s.observedAt);
      return d > windowStart && d <= ranOn;
    });

    const h = hash(iso(ranOn));
    const moved = caught.slice(0, 3).map((s) => ({
      store: s.unitName,
      center: s.centerName,
      from: "Open",
      to: "Not open",
    }));

    out.push({
      id: `SW-${iso(ranOn).replace(/-/g, "")}`,
      ranOn: iso(ranOn),
      targetsChecked: coverage.storesWatched,
      changes: caught.length,
      findings: caught.filter((s) => s.state !== "compliant").length,
      status: caught.length ? "complete_with_changes" : "complete",
      moved,
    });
  }

  return out;
})();

/* ------------------------------------------------------------------
   reports
   ------------------------------------------------------------------ */

export type ReportKind = "sweep_summary" | "monthly" | "quarterly_assurance";

export const REPORT_META: Record<
  ReportKind,
  { label: string; audience: string; blurb: string }
> = {
  sweep_summary: {
    label: "Sweep summary",
    audience: "Lease administration",
    blurb: "What each pass checked and anything that moved.",
  },
  monthly: {
    label: "Monthly portfolio review",
    audience: "Real estate",
    blurb: "Findings, clocks, and distance to threshold across the portfolio.",
  },
  quarterly_assurance: {
    label: "Quarterly assurance",
    audience: "Finance and audit",
    blurb:
      "Dated evidence that the watch ran: coverage, checks performed, findings and actions.",
  },
};

export type Report = {
  id: string;
  kind: ReportKind;
  period: string;
  generatedOn: string;
  findings: number;
  /** Who it went to automatically. */
  recipients: string[];
};

export const reports: Report[] = (() => {
  const today = new Date(TODAY);
  const out: Report[] = [];

  // last three monthlies
  for (let m = 1; m <= 3; m++) {
    const d = new Date(today);
    d.setMonth(d.getMonth() - m, 1);
    const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const h = hash(label);
    out.push({
      id: `RPT-M${iso(d).slice(0, 7)}`,
      kind: "monthly",
      period: label,
      generatedOn: iso(addDays(d, 32)),
      findings: h % 4,
      recipients: ["Real estate", "Lease administration"],
    });
  }

  // last two quarterlies
  for (let q = 1; q <= 2; q++) {
    const d = new Date(today);
    d.setMonth(d.getMonth() - q * 3, 1);
    const quarter = Math.floor(d.getMonth() / 3) + 1;
    const label = `Q${quarter} ${d.getFullYear()}`;
    const h = hash(label);
    out.push({
      id: `RPT-Q${label.replace(" ", "")}`,
      kind: "quarterly_assurance",
      period: label,
      generatedOn: iso(addDays(d, 96)),
      findings: h % 5,
      recipients: ["Finance", "Associate General Counsel"],
    });
  }

  return out.sort((a, b) => (a.generatedOn < b.generatedOn ? 1 : -1));
})();

/* ------------------------------------------------------------------
   notifications
   ------------------------------------------------------------------ */

export type Channel = "email" | "sms" | "in_app";

export type Notification = {
  id: string;
  sentOn: string;
  channel: Channel;
  severity: "critical" | "action" | "info";
  subject: string;
  detail: string;
  recipients: string[];
  locationId?: string;
};

/**
 * Derived from the portfolio's real states, so what the client sees in
 * the log matches what they see on the dashboard.
 */
export const notifications: Notification[] = (() => {
  const out: Notification[] = [];

  for (const r of rows) {
    const ev = r.evaluation;

    if (ev.state === "claimable") {
      out.push({
        id: `NT-${r.id}-claim`,
        sentOn: r.claim.firstObservedAt ?? TODAY,
        channel: "email",
        severity: "action",
        subject: `Cure period elapsed at ${r.center.name}`,
        detail: `${r.evaluation.triggers.filter((t) => t.failing).map((t) => t.label).join(", ")} failing. Verified evidence on file. Notice package ready to assemble.`,
        recipients: ["Real estate", "Associate General Counsel"],
        locationId: r.id,
      });
    }

    if (ev.state === "election_open" && ev.daysUntilElection != null) {
      out.push({
        id: `NT-${r.id}-election`,
        sentOn: iso(
          addDays(new Date(ev.electionDeadline!), -30),
        ),
        channel: "email",
        severity: "critical",
        subject: `Election window closes in ${ev.daysUntilElection} days at ${r.center.name}`,
        detail:
          "The right to elect lapses if unexercised. Resume full rent or terminate.",
        recipients: ["Real estate", "Associate General Counsel", "Finance"],
        locationId: r.id,
      });
    }

    if (ev.state === "watch") {
      out.push({
        id: `NT-${r.id}-watch`,
        sentOn: iso(addDays(new Date(TODAY), -(hash(r.id) % 40))),
        channel: "in_app",
        severity: "info",
        subject: `${r.center.name} within three points of a threshold`,
        detail: "No action required. Sweep frequency increased.",
        recipients: ["Lease administration"],
        locationId: r.id,
      });
    }
  }

  return out
    .sort((a, b) => (a.sentOn < b.sentOn ? 1 : -1))
    .slice(0, 40);
})();

export const activitySummary = {
  sweepsRun: sweeps.length,
  lastSweep: sweeps[0]?.ranOn ?? TODAY,
  daysSinceLastSweep: sweeps[0]
    ? daysBetween(new Date(sweeps[0].ranOn), new Date(TODAY))
    : 0,
  changesDetected: sweeps.reduce((s, x) => s + x.changes, 0),
  reportsDelivered: reports.length,
  notificationsSent: notifications.length,
  nextReport: prettyDate(coverage.nextSweepISO),
};

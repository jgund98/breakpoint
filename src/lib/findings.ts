/**
 * ============================================================
 * THE FLAG INBOX — what the portfolio wants the client to act on
 * ============================================================
 *
 * A flag is a dated event: a location entered a state that needs a
 * decision. Flags flow like an inbox — new (unread), in review,
 * handled — and the EPISODE key gives them reset semantics: a location
 * that recovers and trips again later is a NEW flag with a new date,
 * not a resurrected old one.
 *
 * This module computes the flags the current evaluation implies. The
 * API route reconciles them into the finding_alert table (insert on
 * conflict do nothing), so a flag's row — and its status — persists
 * across evaluations while the same episode lasts. Everything here is
 * derived from the engine; nothing is invented.
 */
import {
  formatCoTenancyRent,
  prettyDate,
  verificationOf,
  TIER_META,
} from "@/lib/clause";
import { rows, TODAY } from "@/lib/portfolio";

export type ExpectedFlag = {
  locationRef: string;
  centerName: string;
  kind: "triggered" | "election_open" | "confirm_store";
  episode: string;
  headline: string;
  detail: string;
  flaggedOn: string; // ISO date, from the evaluation
};

/**
 * NEXT STEPS, stated so a reader who has never seen a co-tenancy claim
 * knows exactly what happens now. Ordered the way the work actually
 * runs, and tailored to this location's own facts.
 */
export function nextStepsFor(r: (typeof rows)[number]): string[] {
  const ev = r.evaluation;
  const v = verificationOf(r.evidence);
  const steps: string[] = [];

  /* 1 — evidence first: nothing moves on secondary sources alone */
  if (v.tier === "verified") {
    steps.push(
      "Evidence is verified by a primary source. It can carry a notice.",
    );
  } else {
    steps.push(
      `Verify the closure with a primary source — a field visit, your store manager's report, or the operator's own announcement. Today it is ${TIER_META[v.tier].label.toLowerCase()} (${
        v.tier === "signal"
          ? "one secondary source"
          : "two secondary sources agree"
      }), which watches a condition but cannot carry a notice.`,
    );
  }

  /* 2 — the tenant's own side of the lease */
  steps.push(
    "Confirm your side of the lease holds: your store open and operating, no default outstanding, the right still personal to you if the lease requires it. A failing test with a failed precondition pays nothing.",
  );

  /* 3 — the money, honestly */
  const money = formatCoTenancyRent(ev.monthlyDelta);
  steps.push(
    money === "No saving at current sales"
      ? "Review the economics: at current reported sales the alternative-rent formula produces no saving. The right is still worth preserving on the record."
      : money === "Sales needed"
        ? "Supply this store's monthly sales so the alternative rent can be computed. The remedy prices on each month's own sales."
        : `Review the economics: the remedy is worth about ${money} at current reported sales, computed month by month.`,
  );

  /* 4 — the clock that makes speed worth money */
  if (r.clause.remedy.reliefRunsFrom === "notice" || r.clause.remedy.reliefRunsFrom === "first_of_month_after_notice") {
    steps.push(
      "This lease runs relief FROM NOTICE: every month that passes before your notice is served is lost for good. Assemble and serve promptly.",
    );
  } else if (r.clause.remedy.retroactiveCapDays != null) {
    steps.push(
      `Relief reaches back to the failure, but only ${Math.round(r.clause.remedy.retroactiveCapDays / 30.44)} months before notice. Months beyond that cap are gone — serve inside the window.`,
    );
  } else {
    steps.push(
      "Relief reaches back to the failure once notice is served, so the record matters more than speed here. Keep the evidence chain dated.",
    );
  }

  /* 5 — how it actually gets served */
  steps.push(
    "Assemble the notice package on the notice desk, route it to your counsel for review, then your authorized signatory serves it per the lease's notice provision. Breakpoint assembles; you serve.",
  );

  return steps;
}

/** The flags the current evaluation implies, one per live episode. */
export function expectedFlags(): ExpectedFlag[] {
  const flags: ExpectedFlag[] = [];

  for (const r of rows) {
    const ev = r.evaluation;
    const failing = ev.triggers.filter((t) => t.failing);
    const failLabel = failing.map((t) => t.label).join(", ") || "condition";

    if (ev.state === "claimable") {
      const when = ev.cureEndsOn ?? r.claim.firstObservedAt ?? TODAY;
      flags.push({
        locationRef: r.id,
        centerName: r.center.name,
        kind: "triggered",
        episode: when,
        headline: "May qualify for co-tenancy rent",
        detail: `${failLabel} failing since ${prettyDate(
          r.claim.firstObservedAt ?? when,
        )}; the qualifying period completed ${prettyDate(when)}. ${
          formatCoTenancyRent(ev.monthlyDelta) === "No saving at current sales"
            ? "No saving at current sales; the right is still worth preserving."
            : `Worth about ${formatCoTenancyRent(ev.monthlyDelta)} at reported sales.`
        }`,
        flaggedOn: when,
      });
    }

    if (ev.state === "election_open") {
      const when = ev.capExpiresOn ?? ev.electionDeadline ?? TODAY;
      flags.push({
        locationRef: r.id,
        centerName: r.center.name,
        kind: "election_open",
        episode: ev.electionDeadline ?? when,
        headline: "Remedy cap reached. Election window open",
        detail: `The alternative-rent cap has run. ${
          ev.electionDeadline
            ? `The election lapses ${prettyDate(ev.electionDeadline)} if unexercised.`
            : "The election window is running."
        }`,
        flaggedOn: when,
      });
    }

    if (ev.state === "precondition_unverified") {
      const when = r.claim.firstObservedAt ?? TODAY;
      flags.push({
        locationRef: r.id,
        centerName: r.center.name,
        kind: "confirm_store",
        episode: when,
        headline: "Confirm your store to score this location",
        detail: `${failLabel} fails here, but we cannot confirm your own store is open and operating, so no clock is counted. Confirm it on Coverage.`,
        flaggedOn: when,
      });
    }
  }

  return flags;
}

export const FLAG_KIND_META: Record<
  ExpectedFlag["kind"],
  { label: string; tone: "brass" | "clay" | "watch" }
> = {
  triggered: { label: "Triggered", tone: "brass" },
  election_open: { label: "Election open", tone: "clay" },
  confirm_store: { label: "Confirm store", tone: "watch" },
};

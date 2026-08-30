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
  usd,
  verificationOf,
  TIER_META,
} from "@/lib/clause";
import { afBundle, type PortfolioBundle, type Row } from "@/lib/portfolio";

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
export function nextStepsFor(r: Row, b: PortfolioBundle = afBundle): string[] {
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

/** The flags one org's current evaluation implies, one per live episode. */
export function expectedFlagsFor(b: PortfolioBundle): ExpectedFlag[] {
  const { rows, TODAY } = b;
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

/**
 * THEO'S READ — the analyst brief on a flagged location.
 *
 * Written the way a sharp analyst annotates a file: a lead that says
 * what happened and why it matters, then highlights, each one a point
 * with its reasoning. Every figure and date comes from the engine;
 * the voice is the only thing added. MAY-qualify language throughout —
 * Theo flags, counsel decides.
 */
export type AnalystBrief = {
  lead: string;
  highlights: { point: string; why: string }[];
};

export function analystBrief(r: Row): AnalystBrief | null {
  const ev = r.evaluation;
  if (
    ev.state !== "claimable" &&
    ev.state !== "election_open" &&
    ev.state !== "precondition_unverified"
  )
    return null;

  const failing = ev.triggers.filter((t) => t.failing);
  const v = verificationOf(r.evidence);
  const first = r.claim.firstObservedAt;
  const money = formatCoTenancyRent(ev.monthlyDelta);
  const runsFromNotice =
    r.clause.remedy.reliefRunsFrom === "notice" ||
    r.clause.remedy.reliefRunsFrom === "first_of_month_after_notice";
  const highlights: { point: string; why: string }[] = [];

  /* 1 — what tripped */
  if (failing.length) {
    const t = failing[0];
    highlights.push({
      point: `${t.label} went over the line: ${t.observed.toLowerCase()} against a requirement of ${t.requirement.toLowerCase()} (${t.cite}).`,
      why: t.culprits.length
        ? `The damage is ${t.culprits.slice(0, 3).join(", ")} — ${
            t.culprits.length === 1 ? "that store is" : "those stores are"
          } what the clause was written to watch.`
        : "The condition is carried by the occupancy math, not one nameable store. This is exactly the kind of slow bleed a floor exists to catch.",
    });
  }

  /* 2 — the clock */
  if (ev.state === "claimable" && ev.cureEndsOn) {
    highlights.push({
      point: `The qualifying period is done. ${
        first ? `First failed ${prettyDate(first)}, ` : ""
      }completed ${prettyDate(ev.cureEndsOn)} — this stopped being a watch item and became a decision on that date.`,
      why: runsFromNotice
        ? "And this lease only pays from your notice: every month you sit on it is a month the clause never gives back. This is the one to move on, not admire."
        : "Relief here reaches back once notice is served, so the record matters more than speed — but the record has to be kept.",
    });
  }
  if (ev.state === "election_open" && ev.electionDeadline) {
    highlights.push({
      point: `The remedy cap has run and the election window is open until ${prettyDate(ev.electionDeadline)}.`,
      why: "A lapsed election is the most avoidable loss in this practice. This is a calendar item now, not an analysis item.",
    });
  }
  if (ev.state === "precondition_unverified") {
    highlights.push({
      point: "The center-side condition fails, but I cannot confirm your own store is open and operating here.",
      why: "A dark store usually cannot claim, so I will not count a clock I cannot stand behind. Confirm the store on Coverage and this file scores immediately.",
    });
  }

  /* 3 — the money */
  highlights.push(
    money === "No saving at current sales"
      ? {
          point: "At current reported sales the alternative-rent formula produces no saving.",
          why: "That is the lesser-of mechanics doing what they were drafted to do, not a dead file: sales soften, the same clause starts paying. The record is the asset — keep it.",
        }
      : money === "Sales needed"
        ? {
            point: "I cannot price this one yet — no monthly sales on file for this store.",
            why: "The remedy computes on each month's own sales. One reporting feed and the number appears.",
          }
        : {
            point: `Worth about ${money} at reported sales${
              ev.cumulativeAtRisk ? `, and roughly ${usd(ev.cumulativeAtRisk)} accumulated since the right arose` : ""
            }.`,
            why: "Computed month by month on each month's own sales — a strong December is allowed to wipe out what a weak February produces. No annualized guesses.",
          },
  );

  /* 4 — the evidence */
  highlights.push(
    v.tier === "verified"
      ? {
          point: "Evidence is verified: a primary source stands behind the closure.",
          why: "This file can carry a notice as it sits. That is the standard a landlord's response gets tested against.",
        }
      : {
          point: `Evidence is ${v.tier === "corroborated" ? "corroborated — two independent secondary sources agree" : "a single-source signal"} so far.`,
          why: "I do not put a listing screenshot in front of a landlord. One field visit or a store manager's dated report gets this to a servable standard.",
        },
  );

  const lead =
    ev.state === "election_open"
      ? `This one is past analysis and into the calendar: the substitute-rent period has run its cap at ${r.center.name}, and the lease now demands a choice inside a window that lapses.`
      : ev.state === "precondition_unverified"
        ? `Something real is happening at ${r.center.name} — the center-side test fails — but the file is stuck on your side of the lease until the store's standing is confirmed. Here is my read.`
        : `I flagged ${r.center.name} because the failure stopped being weather and became a season: the condition has now persisted long enough to satisfy the clause's own qualifying period. This location MAY qualify for co-tenancy rent. Here is my read.`;

  return { lead, highlights };
}

/** Legacy A&F wrapper; new callers resolve a bundle by org. */
export function expectedFlags(): ExpectedFlag[] {
  return expectedFlagsFor(afBundle);
}

export const FLAG_KIND_META: Record<
  ExpectedFlag["kind"],
  { label: string; tone: "brass" | "clay" | "watch" }
> = {
  triggered: { label: "Triggered", tone: "brass" },
  election_open: { label: "Election open", tone: "clay" },
  confirm_store: { label: "Confirm store", tone: "watch" },
};

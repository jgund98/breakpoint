/**
 * THEO — the query layer behind the assistant.
 *
 * A theodolite is the surveyor's instrument for taking precise
 * readings. Theo takes readings off the client's own portfolio.
 *
 * ARCHITECTURE NOTE, and it is the important one: there is no language
 * model in this file and there does not need to be one yet. What an
 * assistant actually requires is a set of well-defined tools that
 * answer questions exactly, from real data, with provenance. Those
 * tools are below. Today a small keyword router calls them; tomorrow a
 * model calls the same functions through tool use and the answers do
 * not change.
 *
 * Building it in this order means the assistant can never invent a
 * number: it can only return what a tool returned. Where no tool can
 * answer, Theo says so and offers the action that would make the
 * answer available. That is the whole design.
 */

import {
  ENTITLEMENT_META,
  STATE_META,
  prettyDate,
  shortDate,
  usd,
} from "./clause";
import { TODAY, rows, type Row } from "./portfolio";
import { coverage, watchTargets } from "./coverage";
import { matrix } from "./matrix";
import { ledger } from "./value";
import { activitySummary, sweeps } from "./activity";

/* ------------------------------------------------------------------
   answer shapes
   ------------------------------------------------------------------ */

export type AnswerBlock =
  | { type: "text"; body: string }
  | { type: "stat"; items: { label: string; value: string; hint?: string }[] }
  | {
      type: "table";
      columns: string[];
      rows: { cells: string[]; href?: string }[];
      caption?: string;
    }
  | { type: "verbatim"; cite: string; body: string }
  | {
      type: "gap";
      body: string;
      action?: { label: string; href: string };
    };

export type TheoAnswer = {
  /** What Theo understood the question to be. Shown back to the reader. */
  interpreted: string;
  /**
   * A sentence of plain reading before the data.
   *
   * Not decoration. A number without a reading is work the client has
   * to do themselves, and the whole point of an analyst is that they
   * tell you what they found before they show you the table. It is
   * always generated from the figures below it, never freestanding, so
   * it cannot say anything the data does not.
   */
  lead?: string;
  blocks: AnswerBlock[];
  /** Where the answer came from. Never omitted. */
  provenance: string;
  /** Follow-ups grounded in what was just returned. */
  followUps: string[];
};

const asOf = `Evaluated ${prettyDate(TODAY)} · last sweep ${shortDate(activitySummary.lastSweep)}`;

/* ------------------------------------------------------------------
   tools
   ------------------------------------------------------------------ */

/** Which of my leases depend on a given retailer? */
export function toolDependency(operator: string): TheoAnswer {
  const row = matrix.operators.find(
    (o) => o.operator.toLowerCase() === operator.toLowerCase(),
  );

  if (!row) {
    return {
      interpreted: `Leases that depend on ${operator}`,
      provenance: asOf,
      blocks: [
        {
          type: "gap",
          body: `No clause in your portfolio names ${operator}, and it is not open in any center we watch. If you believe it should be here, the lease may name it under a different legal entity.`,
          action: { label: "Open clause library", href: "/app/clauses" },
        },
      ],
      followUps: ["Which retailers am I most exposed to?"],
    };
  }

  const dependents = rows.filter((r) =>
    r.clause.triggers.some(
      (t) =>
        (t.kind === "named_tenant" &&
          t.names.some(
            (id) => r.center.suites.find((s) => s.id === id)?.name === row.operator,
          )) ||
        (t.kind === "tenant_count" &&
          t.pool.some(
            (id) => r.center.suites.find((s) => s.id === id)?.name === row.operator,
          )),
    ),
  );

  return {
    interpreted: `Leases that depend on ${row.operator}`,
    lead:
      row.wouldTrip > 0
        ? `${row.operator} is named in ${row.namedInLeases} of your leases across ${row.centersPresent} centers. If it closed everywhere, ${row.wouldTrip} of those would qualify for relief, worth about ${usd(Math.round(row.monthlyAtStake))} a month.`
        : `${row.operator} is named in ${row.namedInLeases} of your leases across ${row.centersPresent} centers, but losing it alone would not trip anything today. Every test naming it still has margin, which is the thing worth watching.`,
    provenance: asOf,
    blocks: [
      {
        type: "stat",
        items: [
          { label: "Leases naming it", value: String(row.namedInLeases) },
          { label: "Centers present", value: String(row.centersPresent) },
          {
            label: "If it went dark",
            value:
              row.wouldTrip > 0
                ? `${row.wouldTrip} would qualify`
                : "Nothing trips",
            hint:
              row.wouldTrip > 0
                ? `${usd(Math.round(row.monthlyAtStake))} per month`
                : "Every test naming it still has margin",
          },
        ],
      },
      {
        type: "table",
        columns: ["Location", "Center", "Status"],
        rows: dependents.slice(0, 12).map((r) => ({
          cells: [
            r.id,
            `${r.center.name}, ${r.center.city}`,
            STATE_META[r.evaluation.state].label,
          ],
          href: `/app/locations/${r.id}`,
        })),
        caption:
          dependents.length > 12
            ? `Showing 12 of ${dependents.length}.`
            : undefined,
      },
    ],
    followUps: [
      `What happens if ${row.operator} closes everywhere?`,
      "Which retailers am I most exposed to?",
    ],
  };
}

/** What is going on at a named center? */
export function toolCenter(name: string): TheoAnswer {
  const at = rows.filter((r) =>
    r.center.name.toLowerCase().includes(name.toLowerCase()),
  );

  if (at.length === 0) {
    return {
      interpreted: `Status at ${name}`,
      provenance: asOf,
      blocks: [
        {
          type: "gap",
          body: `No center matching "${name}" is in your portfolio.`,
          action: { label: "Browse locations", href: "/app/locations" },
        },
      ],
      followUps: ["Which locations qualify for co-tenancy rent?"],
    };
  }

  const center = at[0].center;
  const dark = center.suites.filter((s) => s.status === "dark");
  const occTest = at[0].evaluation.triggers.find((t) => t.label === "Occupancy");

  const blocks: AnswerBlock[] = [
    {
      type: "stat",
      items: [
        { label: "Your stores here", value: String(at.length) },
        {
          label: "Named tenants dark",
          value: String(dark.length),
          hint: dark.map((s) => s.name).slice(0, 3).join(", ") || "None",
        },
        {
          label: "Rent roll held",
          value: `${Math.round(center.rentRollCoverage * 100)}%`,
          hint: `as of ${shortDate(center.rentRollAsOf)}`,
        },
      ],
    },
    {
      type: "table",
      columns: ["Location", "State", "Failing test", "Per month"],
      rows: at.map((r) => ({
        cells: [
          r.id,
          STATE_META[r.evaluation.state].label,
          r.evaluation.triggers
            .filter((t) => t.failing)
            .map((t) => t.label)
            .join(", ") || "None",
          r.evaluation.anyFailing && r.evaluation.monthlyDelta
            ? usd(Math.round(r.evaluation.monthlyDelta))
            : "—",
        ],
        href: `/app/locations/${r.id}`,
      })),
    },
  ];

  if (occTest && occTest.computability !== "observable") {
    blocks.push({
      type: "gap",
      body: `I cannot state occupancy at ${center.name} to a standard that would survive a landlord's response. ${occTest.computabilityNote}`,
      action: { label: "Reporting rights", href: "/app/coverage" },
    });
  }

  const failingHere = at.filter((r) => r.evaluation.anyFailing).length;

  return {
    interpreted: `Status at ${center.name}`,
    lead:
      failingHere > 0
        ? `You have ${at.length} ${at.length === 1 ? "store" : "stores"} at ${center.name}, and ${failingHere} of them ${failingHere === 1 ? "has" : "have"} a failing co-tenancy test. ${dark.length > 0 ? `${dark.map((s) => s.name).slice(0, 2).join(" and ")} ${dark.length === 1 ? "is" : "are"} closed.` : ""}`
        : `${center.name} looks healthy. You have ${at.length} ${at.length === 1 ? "store" : "stores"} there and every co-tenancy test is currently satisfied.`,
    provenance: `${asOf} · rent roll ${Math.round(center.rentRollCoverage * 100)}% complete`,
    blocks,
    followUps: [
      `When was ${center.name} last checked?`,
      "Which locations qualify for co-tenancy rent?",
    ],
  };
}

/** The operative language of a lease, verbatim. */
export function toolClause(query: string): TheoAnswer {
  const hit =
    rows.find((r) => r.id.toLowerCase() === query.toLowerCase()) ??
    rows.find((r) => r.center.name.toLowerCase().includes(query.toLowerCase()));

  if (!hit) {
    return {
      interpreted: `Clause language for ${query}`,
      provenance: asOf,
      blocks: [
        {
          type: "gap",
          body: `I could not match "${query}" to a location or center.`,
          action: { label: "Clause library", href: "/app/clauses" },
        },
      ],
      followUps: ["Show me my weakest clauses"],
    };
  }

  return {
    interpreted: `Co-tenancy language at ${hit.center.name}`,
    lead: `Here is the operative language from ${hit.clause.locations[0]}, exactly as it reads in the document.${hit.clause.amendments.length ? " Note that it has been amended, so read the amendment below alongside it." : ""}`,
    provenance: `${hit.clause.locations.join(" · ")} · abstraction confidence ${Math.round(hit.clause.confidence * 100)}%`,
    blocks: [
      { type: "verbatim", cite: hit.clause.locations[0], body: hit.clause.sourceText },
      ...(hit.clause.amendments.length
        ? [
            {
              type: "text" as const,
              body: `Modified by ${hit.clause.amendments.length} amendment${hit.clause.amendments.length === 1 ? "" : "s"}: ${hit.clause.amendments.map((a) => `${a.label} (${prettyDate(a.dated)}) ${a.effect}`).join(" ")}`,
            },
          ]
        : []),
    ],
    followUps: [
      `What is the remedy at ${hit.center.name}?`,
      "Show me my weakest clauses",
    ],
  };
}

/** When did we last look at a store or center? */
export function toolLastCheck(query: string): TheoAnswer {
  const targets = watchTargets().filter(
    (t) =>
      t.name.toLowerCase().includes(query.toLowerCase()) ||
      t.centerName.toLowerCase().includes(query.toLowerCase()),
  );

  if (targets.length === 0) {
    return {
      interpreted: `Last check for ${query}`,
      provenance: asOf,
      blocks: [
        {
          type: "gap",
          body: `"${query}" is not on the watch list. We watch the stores your clauses actually name, so a store no clause depends on is not checked.`,
          action: { label: "See the watch list", href: "/app/coverage" },
        },
      ],
      followUps: ["What does Breakpoint actually monitor?"],
    };
  }

  return {
    interpreted: `Last check for ${query}`,
    lead: `Checked ${targets.length === 1 ? "it" : `all ${targets.length}`} on the most recent sweep. Here is what each source is saying.`,
    provenance: `${sweeps.length} sweeps on record`,
    blocks: [
      {
        type: "table",
        columns: ["Store", "Center", "Last checked", "Sources", "Status"],
        rows: targets.slice(0, 10).map((t) => ({
          cells: [
            t.name,
            t.centerName,
            prettyDate(t.lastCheckedISO),
            `${t.agreement} of ${t.sources.length} agree`,
            t.status === "open" ? "Open" : t.status,
          ],
        })),
      },
    ],
    followUps: ["What changed in the last sweep?", "What does Breakpoint monitor?"],
  };
}

/** What can we claim right now? */
export function toolClaimable(): TheoAnswer {
  const claimable = rows.filter(
    (r) =>
      r.evaluation.state === "claimable" || r.evaluation.state === "election_open",
  );

  if (claimable.length === 0) {
    return {
      interpreted: "Locations that qualify for co-tenancy rent",
      lead: "Nothing qualifies today, which is the good outcome.",
      provenance: asOf,
      blocks: [
        {
          type: "text",
          body: "Every co-tenancy test in the portfolio is either satisfied or still inside the landlord's window to fix it. I will flag it the moment that changes.",
        },
      ],
      followUps: ["What is closest to failing?", "What changed in the last sweep?"],
    };
  }

  const total = claimable.reduce(
    (s, r) => s + (r.evaluation.monthlyDelta ?? 0),
    0,
  );

  return {
    interpreted: "Locations that qualify for co-tenancy rent",
    lead: `${claimable.length} ${claimable.length === 1 ? "location qualifies" : "locations qualify"} right now, worth about ${usd(Math.round(total))} a month combined. Each one has a failing test, the landlord's window to fix it has passed, and you meet the conditions to claim.`,
    provenance: asOf,
    blocks: [
      {
        type: "stat",
        items: [
          { label: "Qualifying", value: String(claimable.length) },
          {
            label: "Combined monthly",
            value: usd(
              Math.round(
                claimable.reduce((s, r) => s + (r.evaluation.monthlyDelta ?? 0), 0),
              ),
            ),
            hint: "Estimated, not owed",
          },
        ],
      },
      {
        type: "table",
        columns: ["Location", "Center", "Failing test", "Per month"],
        rows: claimable.map((r) => ({
          cells: [
            r.id,
            r.center.name,
            r.evaluation.triggers.filter((t) => t.failing).map((t) => t.label).join(", "),
            r.evaluation.monthlyDelta
              ? usd(Math.round(r.evaluation.monthlyDelta))
              : "Needs sales",
          ],
          href: `/app/locations/${r.id}`,
        })),
      },
    ],
    followUps: ["What is closest to failing?", "Draft the notice packages"],
  };
}

/** What is nearly failing? */
export function toolNearMiss(): TheoAnswer {
  const near = rows
    .filter((r) => r.evaluation.state === "watch" || r.evaluation.state === "curing")
    .slice(0, 12);

  return {
    interpreted: "Tests closest to failing",
    lead: near.length
      ? `${near.length} ${near.length === 1 ? "location is" : "locations are"} close enough to a threshold that one more closure could trip them. These are the ones I would watch.`
      : "Nothing is near a threshold right now. Every test has comfortable margin.",
    provenance: asOf,
    blocks: [
      {
        type: "table",
        columns: ["Location", "Center", "Test", "Margin"],
        rows: near.map((r) => {
          const tightest = [...r.evaluation.triggers].sort(
            (a, b) => a.ratio - b.ratio,
          )[0];
          return {
            cells: [r.id, r.center.name, tightest.label, tightest.headroom],
            href: `/app/locations/${r.id}`,
          };
        }),
        caption:
          near.length === 0 ? "Nothing is inside the watch band." : undefined,
      },
    ],
    followUps: ["Which locations qualify for co-tenancy rent?"],
  };
}

/** What does this thing actually monitor? The honesty tool. */
export function toolCapability(): TheoAnswer {
  const c = coverage;
  return {
    interpreted: "What Breakpoint monitors, and what it cannot see",
    lead: `I watch ${c.storesWatched} specific stores, the ones your clauses actually name, and run about ${c.checksPerSweep} source checks each sweep. Roughly ${Math.round(c.observablePct * 100)}% of your clause tests I can verify directly. Here is the honest split.`,
    provenance: `${c.storesWatched} stores watched · ${c.checksPerSweep} source checks per sweep`,
    blocks: [
      {
        type: "stat",
        items: [
          {
            label: "Observable",
            value: String(c.counts.observable),
            hint: "Named stores we look up each sweep",
          },
          {
            label: "Landlord reports",
            value: String(c.counts.entitled),
            hint: "Your lease obliges them to tell you",
          },
          {
            label: "No visibility",
            value: String(c.counts.blind),
            hint: "We say so rather than estimate",
          },
        ],
      },
      {
        type: "text",
        body: "I answer from your leases, your locations, and what our sweeps observed. I do not estimate occupancy where the denominator lives in a site plan we have not been given, and I will tell you when that is the case rather than produce a number you could not defend.",
      },
    ],
    followUps: ["Which reporting rights can I exercise?", "What changed in the last sweep?"],
  };
}

/** What moved recently? */
export function toolChanges(): TheoAnswer {
  const recent = sweeps.slice(0, 4).filter((s) => s.changes > 0);
  return {
    interpreted: "Changes in recent sweeps",
    lead: recent.length
      ? `${recent.length} of the last four sweeps picked something up. Here is what moved.`
      : "Quiet stretch. Nothing moved in the last four sweeps, and every named tenant was open on each pass.",
    provenance: `${activitySummary.sweepsRun} sweeps on record`,
    blocks: recent.length
      ? [
          {
            type: "table",
            columns: ["Sweep", "Stores changed", "What moved"],
            rows: recent.map((s) => ({
              cells: [
                prettyDate(s.ranOn),
                String(s.changes),
                s.moved.map((m) => `${m.store} at ${m.center}`).join("; ") || "—",
              ],
            })),
          },
        ]
      : [
          {
            type: "text",
            body: "Nothing changed in the last four sweeps. Every named tenant we watch was open on each pass.",
          },
        ],
    followUps: ["Which locations qualify for co-tenancy rent?", "What is closest to failing?"],
  };
}

/** Reporting rights available to exercise. */
export function toolEntitlements(): TheoAnswer {
  const available = coverage.entitlements.filter((e) => e.state === "available");
  return {
    interpreted: "Reporting rights you can exercise",
    lead: available.length
      ? `You can send ${available.length} ${available.length === 1 ? "request" : "requests"} today. These are rights your leases already give you, and in my experience almost nobody uses them.`
      : "Nothing is available to send right now. Either the requests are out with landlords or the annual window has not reopened.",
    provenance: asOf,
    blocks: [
      {
        type: "text",
        body: `${available.length} of your leases give you the right to demand data from the landlord that we cannot compute ourselves. Most tenants never use these.`,
      },
      {
        type: "table",
        columns: ["Location", "Right", "Unlocks", "Response due"],
        rows: available.slice(0, 10).map((e) => ({
          cells: [
            e.locationId,
            ENTITLEMENT_META[e.entitlement.kind].label,
            ENTITLEMENT_META[e.entitlement.kind].unlocks,
            `${e.entitlement.responseDays} days`,
          ],
          href: `/app/locations/${e.locationId}`,
        })),
      },
    ],
    followUps: ["What does Breakpoint monitor?"],
  };
}

/** Portfolio value summary. */
export function toolValue(): TheoAnswer {
  return {
    interpreted: "What the watch has returned",
    lead: `Against an annual fee of ${usd(ledger.annualFee)}, you have ${usd(Math.round(ledger.securedMonthly * 12))} a year running and another ${usd(Math.round(ledger.identifiedAnnual))} identified and waiting on a decision.`,
    provenance: asOf,
    blocks: [
      {
        type: "stat",
        items: [
          {
            label: "Running",
            value: usd(Math.round(ledger.securedMonthly * 12)),
            hint: `${ledger.securedCount} on alternative rent`,
          },
          {
            label: "Available",
            value: usd(Math.round(ledger.identifiedAnnual)),
            hint: `${ledger.identifiedCount} awaiting a decision`,
          },
          {
            label: "Annual fee",
            value: usd(ledger.annualFee),
          },
        ],
      },
      {
        type: "text",
        body: "Available means a verified condition makes relief claimable. It is an estimate of what the lease allows, not money owed, and nothing is booked until a notice is served.",
      },
    ],
    followUps: ["Which locations qualify for co-tenancy rent?"],
  };
}

/* ------------------------------------------------------------------
   the router
   ------------------------------------------------------------------

   Deliberately simple and deliberately replaceable. When a model is
   wired in, this function is what it substitutes for: the tools above
   stay exactly as they are and remain the only source of an answer.
*/

const OPERATORS = matrix.operators.map((o) => o.operator);
const CENTERS = [...new Set(rows.map((r) => r.center.name))];

export function ask(question: string): TheoAnswer {
  const q = question.toLowerCase().trim();

  const operator = OPERATORS.find((o) => q.includes(o.toLowerCase()));
  const center = CENTERS.find((c) => q.includes(c.toLowerCase()));
  const location = rows.find((r) => q.includes(r.id.toLowerCase()));

  if (/what.*(monitor|watch|can you|do you)|capabilit|how does this work/.test(q))
    return toolCapability();

  if (/report right|entitle|occupancy report|demand|request the/.test(q))
    return toolEntitlements();

  if (/chang|last sweep|since|new/.test(q)) return toolChanges();

  if (/last check|when was|checked/.test(q))
    return toolLastCheck(operator ?? center ?? question);

  if (/clause|language|say about|wording|verbatim|remedy/.test(q))
    return toolClause(location?.id ?? center ?? question);

  if (/close to|near|margin|almost|risk of/.test(q)) return toolNearMiss();

  if (/worth|value|return|fee|roi|saved/.test(q)) return toolValue();

  if (/qualif|claim|relief|owed|can we|entitled to/.test(q))
    return toolClaimable();

  if (operator) return toolDependency(operator);
  if (center) return toolCenter(center);
  if (location) return toolClause(location.id);

  return {
    interpreted: question,
    lead: "I am not sure I follow that one, and I would rather say so than guess.",
    provenance: asOf,
    blocks: [
      {
        type: "gap",
        body: "I can answer on your locations, the clauses inside them, the stores those clauses depend on, what our sweeps have seen, and what any of it is worth. Try naming a center or a retailer and I will pull what I have.",
        action: { label: "See what I monitor", href: "/app/coverage" },
      },
    ],
    followUps: [
      "Which locations qualify for co-tenancy rent?",
      "What does Breakpoint monitor?",
      "What changed in the last sweep?",
    ],
  };
}

/** Openers grounded in the portfolio's actual state, not generic prompts. */
export function suggestedQuestions(): string[] {
  const out: string[] = [];
  const claimable = rows.filter((r) => r.evaluation.state === "claimable");
  const top = matrix.operators[0];
  const worst = rows.find((r) => r.evaluation.state === "election_open");

  if (claimable.length)
    out.push("Which locations qualify for co-tenancy rent?");
  if (worst) out.push(`What is the deadline at ${worst.center.name}?`);
  if (top) out.push(`What happens if ${top.operator} closes everywhere?`);
  out.push("What is closest to failing?");
  out.push("What changed in the last sweep?");
  out.push("What does Breakpoint monitor?");

  return out.slice(0, 6);
}

/**
 * The opening line, written off the portfolio's actual state so the
 * first thing Theo says is already useful rather than a greeting.
 */
export function greeting(): string {
  const claimable = rows.filter((r) => r.evaluation.state === "claimable").length;
  const lapsing = rows.filter((r) => r.evaluation.state === "election_open").length;
  const watching = rows.filter((r) => r.evaluation.state === "watch").length;

  if (lapsing > 0)
    return `Worth starting here: ${lapsing} ${lapsing === 1 ? "location has an election window" : "locations have election windows"} closing, and those rights lapse if nobody acts on them. Ask me about those, or anything else in the portfolio.`;
  if (claimable > 0)
    return `${claimable} ${claimable === 1 ? "location is triggered and MAY qualify" : "locations are triggered and MAY qualify"} for co-tenancy rent. Ask me about those, or anything else across your ${rows.length} watched stores.`;
  if (watching > 0)
    return `Nothing qualifies for relief today. ${watching} ${watching === 1 ? "location is" : "locations are"} close to a threshold and worth a look. Ask me anything about the portfolio.`;
  return `All quiet. Every co-tenancy test across your ${rows.length} watched stores is satisfied. Ask me anything and I will pull what I have.`;
}

export const theo = {
  name: "Theo",
  role: "Portfolio analyst",
  /** Stated plainly in the UI so expectations are set before the first question. */
  charter:
    "Theo answers from your leases, your locations and what our sweeps observed. Every answer carries its source. Where the data does not support an answer, Theo says so and offers the step that would change that.",
};

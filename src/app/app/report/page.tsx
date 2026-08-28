import type { Metadata } from "next";
import { STATE_META, prettyDate } from "@/lib/clause";
import { TODAY, org, rows, summary } from "@/lib/portfolio";
import { activitySummary, sweeps } from "@/lib/activity";
import { coverage } from "@/lib/coverage";
import { portfolioDeadlines } from "@/lib/deadlines";
import { PageHead, Panel, Pill, type Tone } from "@/components/app/ui";
import { PrintButton } from "@/components/app/PrintButton";

export const metadata: Metadata = { title: "Portfolio report" };

const compactUsd = (n: number) =>
  n >= 1000
    ? `$${Math.round(n / 1000).toLocaleString("en-US")}K`
    : `$${Math.round(n).toLocaleString("en-US")}`;

/**
 * The portfolio report: the period on one page, built to be printed
 * and forwarded. The same figures as the workspace, arranged for a
 * reader who was not in the room — a VP hands this to a CFO.
 */
export default function ReportPage() {
  const decisions =
    (summary.byState.get("claimable") ?? 0) +
    (summary.byState.get("election_open") ?? 0);
  const running = summary.byState.get("remedy_active") ?? 0;
  const quarter = sweeps.slice(0, 12);
  const quarterChanges = quarter.reduce((n, s) => n + s.changes, 0);
  const deadlines = portfolioDeadlines().slice(0, 6);

  const stateRows = [...summary.byState.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-5 print:space-y-4">
      <div className="print:hidden">
        <PageHead
          eyebrow="Act"
          title="Portfolio report"
          lede="The period on one page, built to be printed and forwarded."
          right={<PrintButton />}
        />
      </div>

      <Panel className="print:border-0 print:p-0 print:shadow-none">
        {/* ---- report head ---- */}
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-400">
              Breakpoint · Co-tenancy watch record
            </p>
            <h1 className="mt-1 text-[1.25rem] font-bold tracking-tight text-slate-900">
              {org.name}
            </h1>
            <p className="mt-0.5 text-[0.8125rem] text-slate-500">
              {org.watched} watched locations across {summary.centers} centers in{" "}
              {summary.states} states · evaluated through {prettyDate(TODAY)}
            </p>
          </div>
          <p className="text-[0.75rem] text-slate-400">
            Prepared {prettyDate(TODAY)}
          </p>
        </div>

        {/* ---- the four figures ---- */}
        <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {(
            [
              [
                "Needs a decision",
                decisions,
                "Cure elapsed or an election window is open",
                "watch",
              ],
              [
                "Co-tenancy rent to date",
                summary.cumulativeAtRisk > 0
                  ? compactUsd(summary.cumulativeAtRisk)
                  : "$0",
                "Month by month since each right arose, on reported sales",
                "brass",
              ],
              ["Remedy running", running, "Locations already paying co-tenancy rent", "open"],
              ["On watch", summary.watchCount, "Within three points of a threshold, or curing", "petrol"],
            ] as const
          ).map(([k, v, sub, tone]) => (
            <div key={k} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    tone === "watch"
                      ? "bg-amber-500"
                      : tone === "brass"
                        ? "bg-amber-500"
                        : tone === "open"
                          ? "bg-emerald-500"
                          : "bg-indigo-500"
                  }`}
                />
                <span className="text-[0.75rem] font-medium text-slate-500">{k}</span>
              </div>
              <p className="tnum mt-2 text-[1.5rem] font-bold leading-none text-slate-900">
                {v}
              </p>
              <p className="mt-1.5 text-[0.6875rem] leading-snug text-slate-400">{sub}</p>
            </div>
          ))}
        </div>

        {/* ---- the watch itself ---- */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="text-[0.9375rem] font-semibold text-slate-900">
              The watch, this quarter
            </h2>
            <dl className="mt-3 divide-y divide-slate-100">
              {(
                [
                  ["Scan passes run", quarter.length],
                  ["Stores checked per pass", quarter[0]?.targetsChecked ?? 0],
                  ["Changes detected", quarterChanges],
                  ["Last full sweep", prettyDate(activitySummary.lastSweep)],
                  ["Next report", prettyDate(coverage.nextSweepISO)],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-6 py-2">
                  <dt className="text-[0.8125rem] text-slate-500">{k}</dt>
                  <dd className="tnum text-[0.8125rem] font-semibold text-slate-900">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <h2 className="text-[0.9375rem] font-semibold text-slate-900">
              Portfolio position
            </h2>
            <ul className="mt-3 divide-y divide-slate-100">
              {stateRows.map(([state, n]) => (
                <li key={state} className="flex items-center justify-between gap-4 py-2">
                  <Pill
                    tone={
                      (STATE_META[state as keyof typeof STATE_META]?.tone ??
                        "muted") as Tone
                    }
                    dot
                  >
                    {STATE_META[state as keyof typeof STATE_META]?.label ?? state}
                  </Pill>
                  <span className="tnum text-[0.8125rem] font-semibold text-slate-900">
                    {n} location{n === 1 ? "" : "s"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ---- what needs a person ---- */}
        <div className="mt-6">
          <h2 className="text-[0.9375rem] font-semibold text-slate-900">
            Decisions and deadlines ahead
          </h2>
          {deadlines.length === 0 ? (
            <p className="mt-2 text-[0.8125rem] text-slate-500">
              Nothing on the clock this period.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {deadlines.map((d) => (
                <li key={d.uid} className="flex items-baseline justify-between gap-6 py-2">
                  <span className="text-[0.8125rem] text-slate-700">{d.title}</span>
                  <span className="tnum shrink-0 text-[0.8125rem] font-semibold text-slate-900">
                    {new Date(d.dateISO + "T00:00:00Z").toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      timeZone: "UTC",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ---- the locations that decide the period ---- */}
        <div className="mt-6">
          <h2 className="text-[0.9375rem] font-semibold text-slate-900">
            Locations by position
          </h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  {["Location", "Center", "Position", "Tightest test"].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2.5 text-left text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-400"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => {
                  const tightest = [...r.evaluation.triggers].sort(
                    (a, b) => a.ratio - b.ratio,
                  )[0];
                  return (
                    <tr key={r.id}>
                      <td className="tnum px-3 py-2 text-[0.75rem] font-semibold text-slate-900">
                        {r.id}
                      </td>
                      <td className="px-3 py-2 text-[0.75rem] text-slate-700">
                        {r.center.name}
                      </td>
                      <td className="px-3 py-2">
                        <Pill tone={STATE_META[r.evaluation.state].tone as Tone} dot>
                          {STATE_META[r.evaluation.state].label}
                        </Pill>
                      </td>
                      <td className="px-3 py-2 text-[0.75rem] text-slate-500">
                        {tightest ? `${tightest.label}: ${tightest.headroom}` : "No computable test"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-6 border-t border-slate-200 pt-3 text-[0.6875rem] leading-relaxed text-slate-400">
          Breakpoint flags conditions and assembles the supporting file. Whether
          a right exists, and whether to exercise it, is a decision for you and
          your counsel on the executed lease and its amendments. Figures shown
          are estimates of potential co-tenancy rent, not amounts owed.
        </p>
      </Panel>
    </div>
  );
}

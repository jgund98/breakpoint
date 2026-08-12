import Link from "next/link";
import {
  COMPUTABILITY_META,
  PRECONDITION_META,
  STATE_META,
  TIER_META,
  compactUsd,
  formatCoTenancyRent,
  prettyDate,
  shortDate,
  usd,
  verificationOf,
} from "@/lib/clause";
import { org, rows, signalFeed, summary, TODAY } from "@/lib/portfolio";
import {
  KeyValue,
  LinkButton,
  Note,
  PageHead,
  Panel,
  PanelHead,
  Pill,
  Stat,
  type Tone,
} from "@/components/app/ui";
import { Verdict } from "@/components/app/Verdict";
import { Item, Stagger } from "@/components/app/Motion";
import {
  ThresholdRail,
  type RailPoint,
} from "@/components/app/ThresholdRail";
import { sweeps } from "@/lib/activity";

export default function OverviewPage() {
  const decisions = rows
    .filter(
      (r) =>
        r.evaluation.state === "claimable" ||
        r.evaluation.state === "election_open",
    )
    .sort(
      (a, b) =>
        (b.evaluation.monthlyDelta ?? 0) - (a.evaluation.monthlyDelta ?? 0),
    );

  const clocks = rows
    .filter(
      (r) =>
        (r.evaluation.daysUntilCureEnds != null &&
          r.evaluation.daysUntilCureEnds > 0 &&
          r.evaluation.anyFailing) ||
        (r.evaluation.daysUntilElection != null &&
          r.evaluation.daysUntilElection > 0),
    )
    .sort((a, b) => {
      const av =
        a.evaluation.daysUntilElection ?? a.evaluation.daysUntilCureEnds ?? 9999;
      const bv =
        b.evaluation.daysUntilElection ?? b.evaluation.daysUntilCureEnds ?? 9999;
      return av - bv;
    })
    .slice(0, 6);

  const blocked = rows.filter((r) => r.evaluation.state === "blocked");
  const needsRentRoll = rows.filter(
    (r) => r.evaluation.anyFailing && r.evaluation.evidenceCeiling !== "observable",
  );

  /* ---- margin to threshold, per door ----
     The tightest test on each lease decides where that door sits. A
     count test's ratio is open over required, an occupancy test's is
     observed over threshold, so both normalize to the same axis: how
     much room is left before this one trips. */
  const railPoints: RailPoint[] = rows.map((r) => {
    const tightest = [...r.evaluation.triggers].sort((a, b) => a.ratio - b.ratio)[0];
    const margin = tightest.ratio - 1;
    return {
      id: r.id,
      center: r.center.name,
      city: `${r.center.city}, ${r.center.state}`,
      margin,
      label: tightest.headroom,
      test: tightest.label,
      state: r.evaluation.state,
      tone: (tightest.failing
        ? "clay"
        : margin < 0.03
          ? "brass"
          : margin < 0.1
            ? "watch"
            : "open") as Tone,
      monthly: r.evaluation.anyFailing ? r.evaluation.monthlyDelta : null,
    };
  });

  /* ---- the watch record: what the year bought, even in a quiet one ----
     Counts only the tenants a clause actually depends on. Those are the
     stores we can name from the lease and check in the field. Counting
     every open suite in every center would claim coverage we do not
     have. */
  const storefrontsConfirmed = rows.reduce((sum, r) => {
    const named = new Set<string>();
    for (const t of r.clause.triggers) {
      if (t.kind === "named_tenant") t.names.forEach((n) => named.add(n));
      else if (t.kind === "tenant_count") t.pool.forEach((n) => named.add(n));
    }
    return (
      sum +
      [...named].filter(
        (id) => r.center.suites.find((s) => s.id === id)?.status === "open",
      ).length
    );
  }, 0);
  /** Of the qualifying locations, how many have sales we can compute from. */
  const withSales = decisions.filter((r) => (r.evaluation.monthlyDelta ?? 0) > 0).length;

  const decisionMonthly = decisions.reduce(
    (sum, r) => sum + (r.evaluation.monthlyDelta ?? 0),
    0,
  );
  const soonest = clocks[0];
  const soonestDays = soonest
    ? (soonest.evaluation.daysUntilElection ??
      soonest.evaluation.daysUntilCureEnds ??
      null)
    : null;

  return (
    <div className="space-y-7">
      <Verdict
        decisions={decisions.length}
        monthlyTotal={decisionMonthly}
        soonestDays={soonestDays}
        soonestLabel={soonest ? soonest.center.name : null}
        storefrontsConfirmed={storefrontsConfirmed}
        centersSurveyed={summary.centers}
        lastSweep={prettyDate(TODAY)}
      />

      <PageHead
        eyebrow="Overview"
        title={`${org.name} portfolio`}
        lede={
          <>
            {org.watched} watched locations across {summary.centers} centers in{" "}
            {summary.states} states. Evaluated through {prettyDate(TODAY)}.
          </>
        }
        right={
          <>
            <LinkButton href="/app/notices" variant="primary">
              Notice desk
            </LinkButton>
          </>
        }
      />

      {/* ---- the four numbers ---- */}
      <Stagger className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Item>
          <Stat
            label="Needs a decision"
            tone="brass"
            value={decisions.length}
            sub="Cure elapsed or an election window is open."
            href="/app/notices"
          />
        </Item>
        <Item>
          {/* Money is stated only against the locations that actually
              have sales on file, and says so. A portfolio-wide figure
              extrapolated from a third of the data is not defensible. */}
          <Stat
            label="Co-tenancy rent available"
            tone="brass"
            value={
              withSales > 0 ? compactUsd(summary.atRiskAnnual) : "Sales needed"
            }
            sub={
              withSales > 0
                ? `Annualized. ${withSales} of ${decisions.length} produce a saving at current sales.`
                : "No sales reported for the qualifying locations."
            }
          />
        </Item>
        <Item>
          <Stat
            label="Remedy running"
            tone="open"
            value={summary.byState.get("remedy_active") ?? 0}
            sub="Locations already paying co-tenancy rent."
          />
        </Item>
        <Item>
          <Stat
            label="Inside the band"
            tone="watch"
            value={summary.watchCount}
            sub="Within three points of a threshold, or curing."
            href="/app/locations"
          />
        </Item>
      </Stagger>

      <div className="card-enter d-3">
        <ThresholdRail points={railPoints} />
      </div>

      {/* ---- twelve weeks of sweeps, so continuity is visible ---- */}
      <Panel className="card-enter d-4">
        <PanelHead
          title="Twelve weeks of monitoring"
          hint="One bar per scan."
          right={
            <LinkButton href="/app/activity">Scan history</LinkButton>
          }
        />
        <div className="mt-4 flex items-end gap-1.5">
          {[...sweeps].reverse().map((s) => {
            const height = 8 + Math.min(52, s.changes * 14);
            return (
              <div
                key={s.id}
                className="group relative flex flex-1 flex-col items-center gap-1.5"
                title={`${prettyDate(s.ranOn)} · ${s.changes} changed`}
              >
                <span
                  className={`w-full rounded-t-sm transition-colors ${
                    s.changes > 0
                      ? "bg-brass-500 group-hover:bg-brass-600"
                      : "bg-open-600/35 group-hover:bg-open-600/60"
                  }`}
                  style={{ height }}
                />
                <span className="h-1 w-full rounded-b-sm bg-surface-sunk" />
              </div>
            );
          })}
        </div>
      </Panel>

      {/* ---- decisions ---- */}
      <Panel flush>
        <div className="px-5 pt-5 sm:px-6 sm:pt-6">
          <PanelHead
            title="Needs a decision"
            hint="Cure elapsed, preconditions met."
            right={<LinkButton href="/app/locations">All locations</LinkButton>}
          />
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-left">
            <thead>
              <tr className="border-y border-line bg-surface-sunk/50">
                {["Location", "Center", "State", "Failing test", "Evidence", "Per month", ""].map(
                  (h) => (
                    <th
                      key={h}
                      className="label px-4 py-2.5 font-semibold text-faint"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {decisions.slice(0, 8).map((r) => {
                const failing = r.evaluation.triggers.filter((t) => t.failing);
                const v = verificationOf(r.evidence);
                const tone = STATE_META[r.evaluation.state].tone as Tone;
                return (
                  <tr key={r.id} className="transition-colors hover:bg-petrol-50/40">
                    <td className="px-4 py-3">
                      <Link
                        href={`/app/locations/${r.id}`}
                        className="text-[0.875rem] font-semibold text-petrol-800 hover:underline"
                      >
                        {r.id}
                      </Link>
                      <p className="text-[0.75rem] text-muted">Store {r.storeNumber}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[0.875rem] text-ink">{r.center.name}</p>
                      <p className="text-[0.75rem] text-muted">
                        {r.center.city}, {r.center.state}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Pill tone={tone} dot>
                        {STATE_META[r.evaluation.state].label}
                      </Pill>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[0.8125rem] text-ink-soft">
                        {failing.map((t) => t.label).join(", ") || "None"}
                      </p>
                      <p className="text-[0.75rem] text-muted">
                        {failing[0]?.culprits.slice(0, 2).join(", ")}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Pill
                        tone={
                          v.tier === "verified"
                            ? "open"
                            : v.tier === "corroborated"
                              ? "watch"
                              : "muted"
                        }
                      >
                        {TIER_META[v.tier].label}
                      </Pill>
                    </td>
                    <td className="tnum px-4 py-3 text-[0.9375rem] font-semibold text-brass-600">
                      {formatCoTenancyRent(r.evaluation.monthlyDelta)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/app/locations/${r.id}`}
                        className="text-[0.8125rem] font-semibold whitespace-nowrap text-petrol-700 hover:underline"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {decisions.length > 8 && (
          <p className="border-t border-line px-5 py-3 text-[0.75rem] text-muted">
            Showing the 8 highest by value. {decisions.length - 8} more on the
            notice desk.
          </p>
        )}
      </Panel>

      <div className="grid gap-3 lg:grid-cols-2">
        {/* ---- clocks ---- */}
        <Panel>
          <PanelHead
            title="Clocks running"
            hint="Cure windows and election deadlines."
          />
          <ul className="mt-4 divide-y divide-line">
            {clocks.map((r) => {
              const election = r.evaluation.daysUntilElection;
              const cure = r.evaluation.daysUntilCureEnds;
              const isElection = election != null && election > 0;
              const days = isElection ? election : cure;
              return (
                <li key={r.id} className="flex items-center gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/app/locations/${r.id}`}
                      className="text-[0.875rem] font-semibold text-ink hover:text-petrol-700"
                    >
                      {r.center.name}
                    </Link>
                    <p className="text-[0.75rem] text-muted">
                      {isElection
                        ? `Election lapses ${shortDate(r.evaluation.electionDeadline!)}`
                        : `Cure ends ${shortDate(r.evaluation.cureEndsOn!)}`}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={`tnum font-display text-[1.125rem] leading-none ${
                        (days ?? 99) < 30 ? "text-clay-600" : "text-ink"
                      }`}
                    >
                      {days}
                    </p>
                    <p className="text-[0.6875rem] text-muted">days</p>
                  </div>
                </li>
              );
            })}
            {clocks.length === 0 && (
              <li className="py-6 text-center text-[0.8125rem] text-muted">
                No clocks running.
              </li>
            )}
          </ul>
        </Panel>

        {/* ---- signals ---- */}
        <Panel>
          <PanelHead
            title="Latest signals"
            hint="Recent observations."
            right={<LinkButton href="/app/signals">All signals</LinkButton>}
          />
          <ul className="mt-4 divide-y divide-line">
            {signalFeed.slice(0, 6).map((s) => (
              <li key={s.id} className="flex items-start gap-3 py-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-petrol-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-[0.8125rem] text-ink">
                    <span className="font-semibold">{s.unitName}</span> at{" "}
                    {s.centerName}
                  </p>
                  <p className="no-orphan text-[0.75rem] leading-snug text-muted">
                    {s.statement}
                  </p>
                </div>
                <span className="tnum shrink-0 text-[0.75rem] whitespace-nowrap text-faint">
                  {shortDate(s.observedAt)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* ---- the honest panels ---- */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Panel>
          <PanelHead
            title="Failing, but not claimable"
            hint="A test has failed but a precondition is not met."
          />
          {blocked.length ? (
            <ul className="mt-4 space-y-3">
              {blocked.slice(0, 4).map((r) => (
                <li
                  key={r.id}
                  className="rounded-xl border border-clay-100 bg-clay-50 p-3.5"
                >
                  <Link
                    href={`/app/locations/${r.id}`}
                    className="text-[0.875rem] font-semibold text-ink hover:text-petrol-700"
                  >
                    {r.center.name}
                  </Link>
                  <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-soft">
                    {r.claim.failedPreconditions
                      .map((p) => PRECONDITION_META[p].label)
                      .join(", ")}{" "}
                    is not satisfied. The clause fails on the board, the right
                    does not arise.
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-[0.8125rem] text-muted">
              Nothing currently blocked on a precondition.
            </p>
          )}
        </Panel>

        <Panel>
          <PanelHead
            title="Denominator gaps"
            hint="Occupancy tests needing more of the center rent roll."
          />
          {needsRentRoll.length ? (
            <ul className="mt-4 space-y-3">
              {needsRentRoll.slice(0, 4).map((r) => (
                <li key={r.id} className="rounded-xl border border-line bg-surface-sunk p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <Link
                      href={`/app/locations/${r.id}`}
                      className="text-[0.875rem] font-semibold text-ink hover:text-petrol-700"
                    >
                      {r.center.name}
                    </Link>
                    <Pill tone="clay">
                      {COMPUTABILITY_META[r.evaluation.evidenceCeiling].label}
                    </Pill>
                  </div>
                  <p className="mt-1.5 text-[0.75rem] leading-relaxed text-muted">
                    Rent roll {Math.round(r.center.rentRollCoverage * 100)}%
                    complete as of {shortDate(r.center.rentRollAsOf)}. Named
                    tenant tests here remain fully observable.
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-[0.8125rem] text-muted">
              Every failing test currently rests on an observable denominator.
            </p>
          )}
        </Panel>
      </div>

    </div>
  );
}

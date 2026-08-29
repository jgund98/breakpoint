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

  /*
   * A cure clock only means something if the tenant could actually
   * claim when it runs out. Where the client's own store is dark, or we
   * have not confirmed it is trading, counting down to a right that
   * cannot vest puts a deadline on the dashboard that nobody can act
   * on, and it drove the headline until this filter was added.
   */
  const canClaim = (r: (typeof rows)[number]) =>
    r.evaluation.state !== "blocked" &&
    r.evaluation.state !== "precondition_unverified";

  const clocks = rows
    .filter(canClaim)
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
  const unverified = rows.filter(
    (r) => r.evaluation.state === "precondition_unverified",
  );
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
    <div className="space-y-5">
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
            label="Triggered"
            tone="brass"
            value={decisions.length}
            sub="Qualifying period complete. Each files a dated flag to the inbox."
            href="/app/inbox"
          />
        </Item>
        <Item>
          {/* Money is stated only against the locations that actually
              have sales on file, and says so. A portfolio-wide figure
              extrapolated from a third of the data is not defensible. */}
          {/* Actual, not annualized. Each month is valued on that
              month's own sales, so a strong December is allowed to wipe
              out the saving it really does wipe out. */}
          <Stat
            label="Co-tenancy rent to date"
            tone="brass"
            value={
              summary.cumulativeAtRisk > 0
                ? compactUsd(summary.cumulativeAtRisk)
                : "None yet"
            }
            sub={
              summary.cumulativeAtRisk > 0
                ? `Month by month since each right arose, on reported sales.`
                : "No location has reached its remedy."
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

      {/* ---- the scan record, so continuity is visible. The label is
              the data's own figures, never a written-out caption. ---- */}
      <Panel flush className="card-enter d-4">
        <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
          <PanelHead
            title="Scan activity"
            hint={`${sweeps.length} passes · ${sweeps.reduce((n, s) => n + s.changes, 0)} changes found · ${sweeps[0]?.targetsChecked ?? 0} stores per pass`}
            right={
              <span className="flex items-center gap-4">
                <span className="hidden items-center gap-3 text-[0.6875rem] font-medium text-slate-400 sm:flex">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-[3px] bg-amber-500" />
                    changes
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-[3px] bg-emerald-600/35" />
                    clear
                  </span>
                </span>
                <LinkButton href="/app/activity">Scan history</LinkButton>
              </span>
            }
          />
        </div>
        <div className="flex items-end gap-1.5 px-5 pt-5 pb-2 sm:px-6">
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
                      ? "bg-amber-500 group-hover:bg-amber-600"
                      : "bg-emerald-600/35 group-hover:bg-emerald-600/60"
                  }`}
                  style={{ height }}
                />
                <span className="h-1 w-full rounded-b-sm bg-slate-100" />
              </div>
            );
          })}
        </div>
        {/* the axis: real dates under the run */}
        <div className="flex gap-1.5 px-5 pb-4 sm:px-6">
          {[...sweeps].reverse().map((s, i, arr) => (
            <span
              key={s.id}
              className="tnum flex-1 text-center text-[0.625rem] text-slate-400"
            >
              {i === 0 || i === arr.length - 1 || i === Math.floor(arr.length / 2)
                ? new Date(s.ranOn + "T00:00:00Z").toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    timeZone: "UTC",
                  })
                : ""}
            </span>
          ))}
        </div>
      </Panel>

      {/* ---- decisions ---- */}
      <Panel flush>
        <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
          <PanelHead
            title="Triggered positions"
            hint="Qualifying period complete. Worked from the inbox, assembled on the notice desk."
            right={<LinkButton href="/app/inbox">Open the inbox</LinkButton>}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                {["Location", "Center", "State", "Failing test", "Evidence", "Per month", ""].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-400"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {decisions.slice(0, 8).map((r) => {
                const failing = r.evaluation.triggers.filter((t) => t.failing);
                const v = verificationOf(r.evidence);
                const tone = STATE_META[r.evaluation.state].tone as Tone;
                return (
                  <tr key={r.id} className="transition-colors hover:bg-indigo-50/40">
                    <td className="px-4 py-3">
                      <Link
                        href={`/app/locations/${r.id}`}
                        className="text-[0.875rem] font-semibold text-indigo-800 hover:underline"
                      >
                        {r.id}
                      </Link>
                      <p className="text-[0.75rem] text-slate-500">Store {r.storeNumber}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[0.875rem] text-slate-900">{r.center.name}</p>
                      <p className="text-[0.75rem] text-slate-500">
                        {r.center.city}, {r.center.state}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Pill tone={tone} dot>
                        {STATE_META[r.evaluation.state].label}
                      </Pill>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[0.8125rem] text-slate-700">
                        {failing.map((t) => t.label).join(", ") || "None"}
                      </p>
                      <p className="text-[0.75rem] text-slate-500">
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
                    <td className="tnum px-4 py-3 text-[0.9375rem] font-semibold text-amber-600">
                      {formatCoTenancyRent(r.evaluation.monthlyDelta)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/app/locations/${r.id}`}
                        className="text-[0.8125rem] font-semibold whitespace-nowrap text-indigo-700 hover:underline"
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
          <p className="border-t border-slate-200 px-5 py-3 text-[0.75rem] text-slate-500">
            Showing the 8 highest by value. {decisions.length - 8} more on the
            notice desk.
          </p>
        )}
      </Panel>

      <div className="grid gap-3 lg:grid-cols-2">
        {/* ---- clocks ---- */}
        <Panel flush>
          <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <PanelHead
              title="Clocks running"
              hint="Cure windows and election deadlines."
            />
          </div>
          <ul className="divide-y divide-slate-100 px-5 sm:px-6">
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
                      className="text-[0.875rem] font-semibold text-slate-900 hover:text-indigo-700"
                    >
                      {r.center.name}
                    </Link>
                    <p className="text-[0.75rem] text-slate-500">
                      {isElection
                        ? `Election lapses ${shortDate(r.evaluation.electionDeadline!)}`
                        : `Cure ends ${shortDate(r.evaluation.cureEndsOn!)}`}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={`tnum text-[1.125rem] font-bold leading-none ${
                        (days ?? 99) < 30 ? "text-rose-600" : "text-slate-900"
                      }`}
                    >
                      {days}
                    </p>
                    <p className="text-[0.6875rem] text-slate-500">days</p>
                  </div>
                </li>
              );
            })}
            {clocks.length === 0 && (
              <li className="py-6 text-center text-[0.8125rem] text-slate-500">
                No clocks running.
              </li>
            )}
          </ul>
        </Panel>

        {/* ---- signals ---- */}
        <Panel flush>
          <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <PanelHead
              title="Latest signals"
              hint="Recent observations."
              right={<LinkButton href="/app/activity">All activity</LinkButton>}
            />
          </div>
          <ul className="divide-y divide-slate-100 px-5 sm:px-6">
            {signalFeed.slice(0, 6).map((s) => (
              <li key={s.id} className="flex items-start gap-3 py-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-[0.8125rem] text-slate-900">
                    <span className="font-semibold">{s.unitName}</span> at{" "}
                    {s.centerName}
                  </p>
                  <p className="no-orphan text-[0.75rem] leading-snug text-slate-500">
                    {s.statement}
                  </p>
                </div>
                <span className="tnum shrink-0 text-[0.75rem] whitespace-nowrap text-slate-400">
                  {shortDate(s.observedAt)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* ---- the honest panels ---- */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Panel flush>
          <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <PanelHead
              title="Failing, but not claimable"
              hint="The test fails, but your side of the lease has to hold too."
            />
          </div>
          {blocked.length || unverified.length ? (
            <ul className="space-y-3 px-5 py-4 sm:px-6">
              {blocked.slice(0, 4).map((r) => (
                <li
                  key={r.id}
                  className="rounded-xl border border-rose-100 bg-rose-50 p-3.5"
                >
                  <Link
                    href={`/app/locations/${r.id}`}
                    className="text-[0.875rem] font-semibold text-slate-900 hover:text-indigo-700"
                  >
                    {r.center.name}
                  </Link>
                  <p className="mt-1 text-[0.8125rem] leading-relaxed text-slate-700">
                    {r.claim.failedPreconditions
                      .map((p) => PRECONDITION_META[p].label)
                      .join(", ")}{" "}
                    is not satisfied. The clause fails on the board, the right
                    does not arise.
                  </p>
                </li>
              ))}

              {/* Separate wording on purpose. These are not known to fail;
                  they are the ones we cannot yet confirm either way. */}
              {unverified.slice(0, 3).map((r) => (
                <li
                  key={r.id}
                  className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm"
                >
                  <Link
                    href={`/app/locations/${r.id}`}
                    className="text-[0.875rem] font-semibold text-slate-900 hover:text-indigo-700"
                  >
                    {r.center.name}
                  </Link>
                  <p className="mt-1 text-[0.8125rem] leading-relaxed text-slate-700">
                    We could not find your store in this center&#8217;s
                    directory, so we cannot confirm you are open and operating.
                    Confirm it on{" "}
                    <Link href="/app/coverage" className="text-indigo-700 underline underline-offset-2">
                      Coverage
                    </Link>{" "}
                    and this location will be scored.
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-4 text-[0.8125rem] text-slate-500 sm:px-6">
              Nothing currently blocked on a precondition.
            </p>
          )}
        </Panel>

        <Panel flush>
          <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <PanelHead
              title="Denominator gaps"
              hint="Occupancy tests needing more of the center rent roll."
            />
          </div>
          {needsRentRoll.length ? (
            <ul className="space-y-3 px-5 py-4 sm:px-6">
              {needsRentRoll.slice(0, 4).map((r) => (
                <li key={r.id} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <Link
                      href={`/app/locations/${r.id}`}
                      className="text-[0.875rem] font-semibold text-slate-900 hover:text-indigo-700"
                    >
                      {r.center.name}
                    </Link>
                    <Pill tone="clay">
                      {COMPUTABILITY_META[r.evaluation.evidenceCeiling].label}
                    </Pill>
                  </div>
                  <p className="mt-1.5 text-[0.75rem] leading-relaxed text-slate-500">
                    Rent roll {Math.round(r.center.rentRollCoverage * 100)}%
                    complete as of {shortDate(r.center.rentRollAsOf)}. Named
                    tenant tests here remain fully observable.
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-4 text-[0.8125rem] text-slate-500 sm:px-6">
              Every failing test currently rests on an observable denominator.
            </p>
          )}
        </Panel>
      </div>

    </div>
  );
}

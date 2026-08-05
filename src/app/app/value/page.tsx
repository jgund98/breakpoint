import Link from "next/link";
import {
  AlarmClock,
  BadgeCheck,
  CalendarClock,
  Landmark,
  ScanSearch,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { compactUsd, prettyDate, usd } from "@/lib/clause";
import { org } from "@/lib/portfolio";
import { contract, ledger, rollovers } from "@/lib/value";
import {
  LinkButton,
  Note,
  PageHead,
  Panel,
  PanelHead,
  Pill,
  type Tone,
} from "@/components/app/ui";

/**
 * VALUE REALIZED
 *
 * The renewal conversation, answered with the client's own numbers.
 * Split three ways on purpose: what is running, what is available, and
 * what disappears if nobody acts. Plus the assurance block, because in
 * a year where nothing trips the honest answer is "we checked, here is
 * how much", and that has to be visible or the contract does not renew.
 */
export default function ValuePage() {
  const l = ledger;
  const realized = l.securedToDate + l.identifiedAnnual;
  const covered = l.feeToDate > 0 ? realized / l.feeToDate : 0;

  return (
    <div className="space-y-6">
      <PageHead
        eyebrow="Analyze"
        title="Value realized"
        lede={`Since ${prettyDate(contract.startedOn)}. Estimates of potential co-tenancy rent, not amounts owed.`}
        right={<LinkButton href="/app/notices">Notice desk</LinkButton>}
      />

      {/* ---- the headline ---- */}
      <div className="mesh-indigo card-enter d-1 relative overflow-hidden rounded-2xl border border-line bg-petrol-900 p-6 sm:p-8">
        <div className="relative grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <p className="label text-brass-400">Return on the contract</p>
            <h2 className="number-pop mt-3 text-[clamp(2rem,4.4vw,3.25rem)] text-cream">
              {covered >= 1 ? `${covered.toFixed(1)}x` : `${Math.round(covered * 100)}%`}{" "}
              <span className="display-em text-brass-400">
                {covered >= 1 ? "covered" : "of fee"}
              </span>
            </h2>
            <p className="no-orphan mt-3 max-w-lg text-[0.9375rem] leading-relaxed text-cream-soft">
              {usd(Math.round(realized))} of co-tenancy rent secured or identified against{" "}
              {usd(Math.round(l.feeToDate))} of fee over {l.monthsElapsed} months.
              Identified means a verified condition makes it available. It is
              not money owed and it is not booked until a notice is served.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              ["Running", compactUsd(l.securedMonthly * 12), `${l.securedCount} on alternative rent`],
              ["Available", compactUsd(l.identifiedAnnual), `${l.identifiedCount} awaiting a decision`],
              ["Lapsing", compactUsd(l.lapsingValue), l.soonestLapseDays != null ? `soonest in ${l.soonestLapseDays} days` : "none at risk"],
              ["Annual fee", compactUsd(l.annualFee), `${org.watched} watched doors`],
            ].map(([k, v, hint]) => (
              <div
                key={k as string}
                className="rounded-xl border border-white/12 bg-white/5 p-4"
              >
                <p className="label text-cream-faint">{k as string}</p>
                <p className="tnum font-display mt-1.5 text-[1.375rem] leading-none text-cream">
                  {v as string}
                </p>
                <p className="mt-1 text-[0.6875rem] text-cream-faint">
                  {hint as string}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {l.lapsingValue > 0 && (
        <Note tone="clay" title="Value that disappears if nobody moves">
          {compactUsd(l.lapsingValue)} sits behind election windows that close.
          Where a lease requires the tenant to elect within a fixed period after
          the cap, missing that window forfeits the right entirely, not just the
          month.{" "}
          <Link href="/app/notices" className="font-semibold underline underline-offset-4">
            Open the notice desk
          </Link>
          .
        </Note>
      )}

      {/* ---- assurance: the quiet-year receipt ---- */}
      <Panel className="card-enter d-2">
        <PanelHead
          title="Assurance"
          hint="In a period where nothing trips, this is the product. It is also what a lease audit or an internal control review will ask you to produce."
          right={<Pill tone="open" dot>Continuous</Pill>}
        />
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [ScanSearch, "Sweeps completed", l.sweeps.toLocaleString("en-US"), "One pass over every center"],
            [ShieldCheck, "Named tenants checked", l.storefrontsConfirmed.toLocaleString("en-US"), "The stores your clauses depend on"],
            [BadgeCheck, "Clause tests evaluated", l.clauseTestsEvaluated.toLocaleString("en-US"), "Each on its own denominator"],
            [Landmark, "Centers under watch", String(l.centersSurveyed), "Across your footprint"],
          ].map(([Icon, k, v, hint], i) => {
            const I = Icon as React.ElementType;
            return (
              <div
                key={k as string}
                className={`card-enter d-${i + 3} rounded-xl border border-line bg-surface p-4`}
              >
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-petrol-50 text-petrol-700">
                  <I className="h-4 w-4" />
                </span>
                <p className="tnum font-display mt-3 text-[1.5rem] leading-none text-ink">
                  {v as string}
                </p>
                <p className="mt-1.5 text-[0.8125rem] font-medium text-ink-soft">
                  {k as string}
                </p>
                <p className="mt-0.5 text-[0.75rem] leading-snug text-muted">
                  {hint as string}
                </p>
              </div>
            );
          })}
        </div>

        {l.detectionGap > 0 && (
          <Note tone="watch" title="What slow detection has cost historically">
            {usd(Math.round(l.detectionGap))} of potential co-tenancy rent sits in months
            that elapsed before notice could be served on conditions we now
            monitor. Where a clause runs relief from notice rather than from
            failure, those months are generally not recoverable. This is the
            number that justifies the cadence.
          </Note>
        )}
      </Panel>

      {/* ---- forward risk ---- */}
      <Panel flush className="card-enter d-4">
        <div className="px-5 pt-5 sm:px-6 sm:pt-6">
          <PanelHead
            title="Anchor rollover risk"
            hint="Retailers named in your co-tenancy tests whose own lease expires inside two years. An anchor rolling in eighteen months is a flag today, not at expiry."
            right={<LinkButton href="/app/cascade">Model a failure</LinkButton>}
          />
        </div>

        {rollovers.length === 0 ? (
          <p className="px-5 py-10 text-center text-[0.875rem] text-muted sm:px-6">
            No named tenant in your portfolio has a lease expiring inside the
            window. That is the good outcome.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left">
              <thead>
                <tr className="border-y border-line bg-surface-sunk/50">
                  {["Operator", "Soonest expiry", "Named in", "Centers", "Risk", "Per month"].map(
                    (h) => (
                      <th key={h} className="label px-4 py-2.5 font-semibold text-faint">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rollovers.slice(0, 10).map((r) => (
                  <tr key={r.operator} className="hover:bg-petrol-50/40">
                    <td className="px-4 py-3 text-[0.875rem] font-semibold text-ink">
                      {r.operator}
                    </td>
                    <td className="px-4 py-3">
                      <span className="tnum flex items-center gap-1.5 text-[0.8125rem] text-ink-soft">
                        <CalendarClock className="h-3.5 w-3.5 text-faint" />
                        {prettyDate(r.soonestExpiry)}
                      </span>
                      <span className="tnum text-[0.75rem] text-muted">
                        in {Math.round(r.daysToSoonest / 30)} months
                      </span>
                    </td>
                    <td className="tnum px-4 py-3 text-[0.8125rem] text-ink-soft">
                      {r.namedInLeases} lease{r.namedInLeases === 1 ? "" : "s"}
                    </td>
                    <td className="px-4 py-3 text-[0.8125rem] text-muted">
                      {r.centers.slice(0, 2).join(", ")}
                      {r.centers.length > 2 && ` +${r.centers.length - 2}`}
                    </td>
                    <td className="px-4 py-3">
                      <Pill
                        tone={(r.singlePointOfFailure ? "clay" : "watch") as Tone}
                        dot
                      >
                        {r.singlePointOfFailure ? "Single point" : "Has margin"}
                      </Pill>
                    </td>
                    <td className="tnum px-4 py-3 text-[0.875rem] font-semibold text-brass-600">
                      {r.monthlyAtStake > 0
                        ? usd(Math.round(r.monthlyAtStake))
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-line px-5 py-3.5 sm:px-6">
          <p className="text-[0.75rem] leading-relaxed text-muted">
            A single point means losing that one operator alone trips a test,
            because the pool has no margin left. Those are the ones worth a
            conversation with ownership before the renewal, not after.
          </p>
        </div>
      </Panel>

      {/* ---- board report ---- */}
      <Panel className="card-enter d-5">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="max-w-xl">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brass-50 text-brass-700">
              <TrendingUp className="h-5 w-5" />
            </span>
            <h2 className="mt-3 text-[1.0625rem] font-semibold text-ink">
              Quarterly assurance report
            </h2>
            <p className="no-orphan mt-1.5 text-[0.875rem] leading-relaxed text-muted">
              Everything on this page as a dated document: coverage, findings,
              actions taken, and the evidence behind each one. Written for a
              finance or audit audience rather than a real estate one.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <LinkButton href="/app/notices" variant="brass">
              Generate report
            </LinkButton>
            <LinkButton href="/app/signals">
              <AlarmClock className="h-4 w-4" />
              Review coverage
            </LinkButton>
          </div>
        </div>
      </Panel>

      <p className="rounded-xl border border-line bg-surface-sunk p-5 text-[0.75rem] leading-relaxed text-muted">
        Illustrative sample data. Figures are estimates of potential co-tenancy rent
        based on the terms in each lease and observed conditions in each center.
        They are not amounts owed, and whether any right exists is a decision
        for you and your counsel.
      </p>
    </div>
  );
}

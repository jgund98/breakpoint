import Link from "next/link";
import { requirePortfolio } from "@/lib/portfolio-gate";
import { operators, runCascade } from "@/lib/cascade";
import { PageHead, Panel, Pill, Stat } from "@/components/app/ui";

/**
 * ANCHOR RISK — the eyes-in-the-sky page.
 *
 * The question a head of real estate cannot answer from a lease
 * administration system: a retailer announces closures nationally —
 * which of my doors trip, in what order, and what is it worth? Every
 * figure here is the certified engine re-run with that operator dark;
 * wave 1 is leases that name it, wave 2 is occupancy tests dragged
 * under by the closure. Nothing is a guess and nothing is a sum of
 * naive per-lease numbers.
 */

const money = (n: number) =>
  `$${Math.round(n).toLocaleString("en-US")}`;

export default async function ExposurePage() {
  const p = await requirePortfolio();

  const ops = operators(p.rows);
  const cascades = ops
    .slice(0, 16)
    .map((o) => runCascade(o.name, p.rows, p.TODAY))
    .filter((c) => c.locationsExposed > 0)
    .sort(
      (a, b) =>
        b.monthlyDelta - a.monthlyDelta || b.hits.length - a.hits.length,
    );

  const tripping = cascades.filter((c) => c.hits.length > 0);
  const worst = tripping[0] ?? null;
  const oneEventAway = new Set(
    tripping.flatMap((c) => c.hits.map((h) => h.locationId)),
  );

  return (
    <div className="space-y-5">
      <PageHead
        eyebrow="Monitor"
        title="Anchor risk"
        lede="Every anchor and junior operator at your centers, re-evaluated with that operator dark. Amounts state what MAY qualify under each lease's clocks."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Operators watched"
          value={ops.length}
          sub="Anchors and juniors open at your centers"
          tone="petrol"
        />
        <Stat
          label="Single points of failure"
          value={tripping.length}
          sub="One closure MAY trip at least one lease"
          tone={tripping.length > 0 ? "watch" : "open"}
        />
        <Stat
          label="Locations one event away"
          value={oneEventAway.size}
          sub="Would move to triggered on a single closure"
          tone={oneEventAway.size > 0 ? "watch" : "open"}
        />
        <Stat
          label="Largest single exposure"
          value={worst ? money(worst.monthlyDelta) : "None"}
          sub={
            worst
              ? `${worst.operator} · per month, if it MAY qualify`
              : "No single operator trips a lease today"
          }
          tone={worst ? "brass" : "open"}
        />
      </div>

      <Panel flush>
        <div className="border-b border-slate-100 px-5 py-4">
          <p className="text-[0.9375rem] font-semibold text-slate-900">
            Ranked by what a single failure is worth
          </p>
          <p className="mt-0.5 max-w-[56rem] text-[0.8125rem] leading-snug text-slate-500">
            Wave 1: leases that name the retailer. Wave 2: occupancy floors
            the closure drags under. Open a row for the doors behind the
            number.
          </p>
        </div>
        {cascades.length === 0 && (
          <p className="px-5 py-6 text-[0.8125rem] text-slate-400">
            No anchor or junior operators are open across the watched
            centers.
          </p>
        )}
        <ul className="divide-y divide-slate-100">
          {cascades.map((c) => (
            <li key={c.operator}>
              <details className="group">
                <summary className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5 hover:bg-slate-50/70 [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[0.875rem] font-semibold text-slate-900">
                        {c.operator}
                      </span>
                      {c.hits.length > 0 ? (
                        <Pill tone="watch">
                          {c.hits.length} would trip
                        </Pill>
                      ) : (
                        <Pill tone="muted">Margin holds</Pill>
                      )}
                      {c.wave2 > 0 && (
                        <Pill tone="clay">{c.wave2} second-wave</Pill>
                      )}
                    </span>
                    <span className="mt-0.5 block text-[0.75rem] text-slate-500">
                      Trades at {c.centersExposed} of your centers ·{" "}
                      {c.locationsExposed} leases exposed
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="tnum block text-[0.9375rem] font-bold text-slate-900">
                      {c.monthlyDelta > 0 ? `${money(c.monthlyDelta)}/mo` : "$0/mo"}
                    </span>
                    <span className="block text-[0.6875rem] text-slate-400">
                      {c.monthlyDelta > 0
                        ? `${money(c.annualDelta)} annualized MAY qualify`
                        : "no rent change today"}
                    </span>
                  </span>
                </summary>
                <div className="border-t border-slate-50 bg-slate-50/50 px-5 py-3">
                  {c.hits.length === 0 ? (
                    <p className="text-[0.8125rem] text-slate-500">
                      Every lease naming {c.operator} still holds its margin
                      with it dark: count tests keep enough qualifying
                      tenants and occupancy floors stay covered. This is the
                      margin the watch protects.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {c.hits.map((h) => (
                        <li
                          key={h.locationId}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-white px-3.5 py-2.5"
                        >
                          <span className="min-w-0">
                            <Link
                              href={`/app/locations/${h.locationId}`}
                              className="text-[0.8125rem] font-semibold text-indigo-600 hover:text-indigo-700"
                            >
                              {h.centerName}
                            </Link>
                            <span className="ml-2 text-[0.75rem] text-slate-500">
                              {h.city}
                            </span>
                            <span className="mt-0.5 block text-[0.75rem] leading-snug text-slate-500">
                              {h.reason}
                            </span>
                          </span>
                          <span className="flex shrink-0 items-center gap-2">
                            <Pill tone={h.wave === 1 ? "watch" : "clay"}>
                              Wave {h.wave}
                            </Pill>
                            <span className="tnum text-[0.8125rem] font-bold text-slate-900">
                              {h.monthlyAfter > 0
                                ? `${money(h.monthlyAfter)}/mo`
                                : "trigger only"}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </details>
            </li>
          ))}
        </ul>
      </Panel>

    </div>
  );
}

export const metadata = { title: "Anchor risk" };

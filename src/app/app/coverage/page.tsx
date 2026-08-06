import Link from "next/link";
import { ENTITLEMENT_META, prettyDate, shortDate } from "@/lib/clause";
import { SOURCE_INFO, type SourceId, coverage } from "@/lib/coverage";
import { PendingAction } from "@/components/app/PendingAction";
import {
  EmptyState,
  LinkButton,
  PageHead,
  Panel,
  PanelHead,
  Pill,
  type Tone,
} from "@/components/app/ui";

export default function CoveragePage() {
  const c = coverage;

  /*
   * Grouped by center rather than listed store by store. One row per
   * named store made the table read as a wall of unfamiliar retailer
   * names, and the useful unit is the center: which of your centers are
   * we watching, how many named tenants there, and is anything closed.
   */
  const byCenter = (() => {
    const m = new Map<
      string,
      {
        center: string;
        city: string;
        watched: number;
        notOpen: number;
        sources: Set<SourceId>;
        lastChecked: string;
        locationIds: Set<string>;
      }
    >();

    for (const t of c.targets) {
      const e = m.get(t.centerName) ?? {
        center: t.centerName,
        city: t.city,
        watched: 0,
        notOpen: 0,
        sources: new Set<SourceId>(),
        lastChecked: t.lastCheckedISO,
        locationIds: new Set<string>(),
      };
      e.watched += 1;
      if (t.status !== "open") e.notOpen += 1;
      t.sources.forEach((s) => e.sources.add(s as SourceId));
      t.dependents.forEach((d) => e.locationIds.add(d));
      if (t.lastCheckedISO > e.lastChecked) e.lastChecked = t.lastCheckedISO;
      m.set(t.centerName, e);
    }

    return [...m.values()].sort(
      (a, b) => b.notOpen - a.notOpen || b.watched - a.watched,
    );
  })();

  const available = c.entitlements.filter((e) => e.state === "available");
  const awaiting = c.entitlements.filter((e) => e.state === "awaiting_response");

  return (
    <div className="space-y-5">
      <PageHead
        eyebrow="Monitor"
        title="Coverage"
        lede="Which centers we watch, and what your leases let you demand from the landlord."
        right={<LinkButton href="/app/activity">Activity</LinkButton>}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Centers watched", String(byCenter.length), "Where you hold a lease"],
          [
            "Named tenants tracked",
            c.storesWatched.toLocaleString("en-US"),
            "Stores your clauses depend on",
          ],
          ["Next scan", shortDate(c.nextSweepISO), "Runs automatically"],
        ].map(([k, v, hint], i) => (
          <div
            key={k as string}
            className={`card-enter d-${i + 1} rounded-2xl border border-line bg-surface p-4`}
          >
            <p className="text-[0.75rem] text-muted">{k as string}</p>
            <p className="tnum font-display mt-1.5 text-[1.5rem] leading-none text-ink">
              {v as string}
            </p>
            <p className="mt-1 text-[0.75rem] text-faint">{hint as string}</p>
          </div>
        ))}
      </div>

      {/* ---- reporting rights ---- */}
      <Panel className="card-enter d-2">
        <PanelHead
          title="Reporting rights"
          hint="Where a lease obliges the landlord to give you occupancy figures on request. Most tenants never use these."
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {(
            [
              ["Ready to send", available.length, "brass"],
              ["Awaiting landlord", awaiting.length, "watch"],
              [
                "Used this year",
                c.entitlements.length - available.length - awaiting.length,
                "muted",
              ],
            ] as const
          ).map(([label, n, tone]) => (
            <div
              key={label}
              className="rounded-xl border border-line bg-surface-sunk p-4"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[0.8125rem] font-medium text-ink">
                  {label}
                </span>
                <span className="tnum font-display text-[1.25rem] leading-none text-ink">
                  {n}
                </span>
              </div>
              {label === "Ready to send" && n > 0 && (
                <PendingAction
                  className="mt-3"
                  label={`Draft ${n} requests`}
                  confirmation="Drafted for your signatory"
                />
              )}
              {label === "Awaiting landlord" && n > 0 && (
                <p className="mt-2 text-[0.75rem] text-muted">
                  Response due within{" "}
                  {awaiting[0]?.entitlement.responseDays ?? 30} days of the
                  request.
                </p>
              )}
            </div>
          ))}
        </div>

        <p className="mt-4 border-t border-line pt-3 text-[0.75rem] leading-relaxed text-muted">
          {available[0]
            ? `Example, ${ENTITLEMENT_META[available[0].entitlement.kind].label} at ${available[0].centerName}: ${available[0].entitlement.cite}.`
            : "No rights currently available to exercise."}{" "}
          Requests are drafted for your signatory and batched by landlord.
        </p>
      </Panel>

      {/* ---- centers ---- */}
      <Panel flush className="card-enter d-3">
        <div className="px-5 pt-5">
          <PanelHead
            title="Centers under watch"
            hint="Named tenants are the stores your clauses depend on. Those are what we check each scan."
          />
        </div>
        {byCenter.length === 0 ? (
          <EmptyState
            title="Nothing under watch yet"
            body="Centers appear here once a lease has been read and we know which named tenants its co-tenancy clause depends on."
            action={{ label: "Portfolio setup", href: "/app/setup" }}
          />
        ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-y border-line bg-surface-sunk/50">
                {[
                  "Center",
                  "Your stores",
                  "Named tenants",
                  "Sources",
                  "Last check",
                  "Status",
                ].map((h) => (
                  <th key={h} className="label px-4 py-2.5 font-semibold text-faint">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {byCenter.map((row) => (
                <tr key={row.center} className="hover:bg-petrol-50/40">
                  <td className="px-4 py-3">
                    <p className="text-[0.875rem] font-medium text-ink">
                      {row.center}
                    </p>
                    <p className="text-[0.75rem] text-muted">{row.city}</p>
                  </td>
                  <td className="tnum px-4 py-3 text-[0.8125rem] text-ink-soft">
                    {row.locationIds.size}
                  </td>
                  <td className="tnum px-4 py-3 text-[0.8125rem] text-ink-soft">
                    {row.watched}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {[...row.sources].map((s) => (
                        <span
                          key={s}
                          title={SOURCE_INFO[s].covers}
                          className="rounded bg-surface-sunk px-1.5 py-0.5 text-[0.6875rem] text-muted"
                        >
                          {SOURCE_INFO[s].label}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="tnum px-4 py-3 text-[0.8125rem] text-muted">
                    {shortDate(row.lastChecked)}
                  </td>
                  <td className="px-4 py-3">
                    {row.notOpen > 0 ? (
                      <Pill tone={"clay" as Tone} dot>
                        {row.notOpen} closed
                      </Pill>
                    ) : (
                      <Pill tone={"open" as Tone} dot>
                        All open
                      </Pill>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </Panel>

      {/* ---- sources ---- */}
      <Panel className="card-enter d-4">
        <PanelHead
          title="Where we look"
          hint="No finding rests on a single third-party listing."
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(SOURCE_INFO) as SourceId[]).map((id) => {
            const s = SOURCE_INFO[id];
            return (
              <div key={id} className="rounded-xl border border-line bg-surface-sunk p-3.5">
                <div className="flex items-center gap-2">
                  <span className="text-[0.8125rem] font-semibold text-ink">
                    {s.label}
                  </span>
                  <Pill
                    tone={(s.weight === "primary" ? "open" : "muted") as Tone}
                    className="ml-auto"
                  >
                    {s.weight}
                  </Pill>
                </div>
                <p className="mt-1.5 text-[0.75rem] leading-snug text-ink-soft">
                  {s.covers}
                </p>
                <p className="mt-1.5 text-[0.6875rem] text-faint">{s.cadence}</p>
              </div>
            );
          })}
        </div>
      </Panel>

      <p className="rounded-xl border border-line bg-surface-sunk p-4 text-[0.75rem] leading-relaxed text-muted">
        Next scan {prettyDate(c.nextSweepISO)}. Illustrative sample data.
      </p>
    </div>
  );
}

export const metadata = { title: "Coverage" };

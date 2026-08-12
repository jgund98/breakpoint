import Link from "next/link";
import { usd } from "@/lib/clause";
import {
  byRemedy,
  byStructure,
  clauseValues,
  renewalFlags,
  valueSummary,
} from "@/lib/clause-value";
import {
  PageHead,
  Panel,
  PanelHead,
  Pill,
  type Tone,
} from "@/components/app/ui";

/**
 * CLAUSE VALUE
 *
 * The renewal view. Monitoring says whether a clause has tripped; this
 * says whether it would be worth anything if it did, and which language
 * is the reason it would not.
 */
export default function ClauseValuePage() {
  const money = (n: number) => (n > 0 ? usd(Math.round(n)) : "None");

  return (
    <div className="space-y-5">
      <PageHead
        eyebrow="Analyze"
        title="Clause value"
        lede="Whether each clause would pay if it tripped, and which language to raise at renewal."
      />

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          [
            "Would pay today",
            `${valueSummary.paying} of ${valueSummary.centers}`,
            "Remedy reduces the monthly bill",
          ],
          [
            "Pays nothing",
            String(valueSummary.noSaving),
            "Remedy fires, rent does not move",
          ],
          [
            "Every limb must fail",
            String(valueSummary.conjunctive),
            `${valueSummary.conjunctiveTriggered} have ever tripped`,
          ],
          [
            "Co-tenancy rent to date",
            money(valueSummary.toDate),
            "Across the whole portfolio",
          ],
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

      {/* ---- structure ---- */}
      <Panel flush className="card-enter d-2">
        <div className="px-5 pt-5">
          <PanelHead
            title="Trigger structure"
            hint="How the limbs combine, and what each shape has produced across the monitored period."
          />
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-y border-line bg-surface-sunk/50">
                {["Structure", "Locations", "Ever tripped", "To date"].map((h) => (
                  <th key={h} className="label px-4 py-2.5 font-semibold text-faint">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {byStructure.map((s) => (
                <tr key={s.key} className="hover:bg-petrol-50/40">
                  <td className="px-4 py-3">
                    <p className="text-[0.875rem] font-medium text-ink">{s.label}</p>
                    <p className="text-[0.75rem] text-muted">{s.description}</p>
                  </td>
                  <td className="tnum px-4 py-3 text-[0.8125rem] text-ink-soft">
                    {s.centers}
                  </td>
                  <td className="px-4 py-3">
                    <Pill
                      tone={(s.everTriggered === 0 ? "muted" : "brass") as Tone}
                      dot={s.everTriggered > 0}
                    >
                      {s.everTriggered} of {s.centers}
                    </Pill>
                  </td>
                  <td className="tnum px-4 py-3 text-[0.8125rem] font-medium text-ink">
                    {money(s.toDate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* ---- remedy ---- */}
      <Panel flush className="card-enter d-3">
        <div className="px-5 pt-5">
          <PanelHead
            title="Remedy type"
            hint="A percentage of sales only reduces rent while that percentage sits below it."
          />
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-y border-line bg-surface-sunk/50">
                {["Remedy", "Locations", "Would pay today", "To date"].map((h) => (
                  <th key={h} className="label px-4 py-2.5 font-semibold text-faint">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {byRemedy.map((r) => (
                <tr key={r.kind} className="hover:bg-petrol-50/40">
                  <td className="px-4 py-3 text-[0.875rem] font-medium text-ink">
                    {r.label}
                  </td>
                  <td className="tnum px-4 py-3 text-[0.8125rem] text-ink-soft">
                    {r.centers}
                  </td>
                  <td className="tnum px-4 py-3 text-[0.8125rem] text-ink-soft">
                    {r.paying} of {r.centers}
                  </td>
                  <td className="tnum px-4 py-3 text-[0.8125rem] font-medium text-ink">
                    {money(r.toDate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* ---- per location ---- */}
      <Panel flush className="card-enter d-4">
        <div className="px-5 pt-5">
          <PanelHead
            title="If the clause tripped tomorrow"
            hint="Fixed rent against what the remedy would charge, on each store's latest reported sales."
          />
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left">
            <thead>
              <tr className="border-y border-line bg-surface-sunk/50">
                {[
                  "Center",
                  "Fixed rent",
                  "Under the remedy",
                  "Monthly saving",
                  "Why",
                ].map((h) => (
                  <th key={h} className="label px-4 py-2.5 font-semibold text-faint">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {clauseValues.map((v) => (
                <tr key={v.row.id} className="hover:bg-petrol-50/40">
                  <td className="px-4 py-3">
                    <Link
                      href={`/app/locations/${v.row.id}`}
                      className="text-[0.875rem] font-medium text-ink hover:text-petrol-700"
                    >
                      {v.row.center.name}
                    </Link>
                    <p className="text-[0.75rem] text-muted">
                      {v.row.center.city}, {v.row.center.state}
                    </p>
                  </td>
                  <td className="tnum px-4 py-3 text-[0.8125rem] text-ink-soft">
                    {usd(Math.round(v.baseMonthly))}
                  </td>
                  <td className="tnum px-4 py-3 text-[0.8125rem] text-ink-soft">
                    {v.remedyMonthly == null
                      ? "Not a rent remedy"
                      : usd(Math.round(v.remedyMonthly))}
                  </td>
                  <td className="px-4 py-3">
                    {v.verdict === "pays" ? (
                      <span className="tnum text-[0.8125rem] font-semibold text-brass-700">
                        {usd(Math.round(v.savingMonthly ?? 0))}
                      </span>
                    ) : (
                      <Pill tone={"muted" as Tone}>
                        {v.verdict === "no_saving" ? "None" : "Deferred opening"}
                      </Pill>
                    )}
                  </td>
                  <td className="max-w-[24rem] px-4 py-3 text-[0.75rem] leading-snug text-muted">
                    {v.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* ---- renewal ---- */}
      <Panel flush className="card-enter d-5">
        <div className="px-5 pt-5">
          <PanelHead
            title="Raise at renewal"
            hint="Where the language, not the center, is what stands between you and a remedy."
          />
        </div>
        <ul className="mt-4 divide-y divide-line border-t border-line">
          {renewalFlags.map((f) => (
            <li key={f.row.id} className="px-5 py-3.5 sm:px-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link
                  href={`/app/locations/${f.row.id}`}
                  className="text-[0.875rem] font-medium text-ink hover:text-petrol-700"
                >
                  {f.row.center.name}
                </Link>
                <span className="tnum text-[0.75rem] text-faint">
                  {usd(Math.round(f.annualRent))}/yr fixed rent
                </span>
              </div>
              {f.points.map((p) => (
                <div key={p.issue} className="mt-1 flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-clay-500" />
                  <p className="text-[0.8125rem] leading-snug">
                    <span className="text-clay-700">{p.issue}.</span>{" "}
                    <span className="text-ink-soft">{p.ask}</span>
                  </p>
                </div>
              ))}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

export const metadata = { title: "Clause value" };

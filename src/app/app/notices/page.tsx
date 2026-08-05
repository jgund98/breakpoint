import Link from "next/link";
import {
  SOURCE_META,
  STATE_META,
  TIER_META,
  prettyDate,
  usd,
  verificationOf,
} from "@/lib/clause";
import { org, rows } from "@/lib/portfolio";
import {
  ActionButton,
  KeyValue,
  Note,
  PageHead,
  Panel,
  PanelHead,
  Pill,
  type Tone,
} from "@/components/app/ui";

export default function NoticesPage() {
  const candidates = rows
    .filter(
      (r) =>
        r.evaluation.state === "claimable" ||
        r.evaluation.state === "election_open",
    )
    .sort(
      (a, b) => (b.evaluation.monthlyDelta ?? 0) - (a.evaluation.monthlyDelta ?? 0),
    );

  const ready = candidates.filter(
    (r) => verificationOf(r.evidence).tier === "verified",
  );
  const held = candidates.filter(
    (r) => verificationOf(r.evidence).tier !== "verified",
  );

  const lead = ready[0];

  return (
    <div className="space-y-6">
      <PageHead
        eyebrow="Notice desk"
        title="Assembled, reviewed, and waiting for your signature"
        lede="Breakpoint builds the file. Your authorised signatory serves it. We do not send notices on your behalf and we do not decide whether a right exists."
      />

      <Note tone="clay" title="How this works">
        Every package below carries the clause extract with its section cite,
        the evidence chain with timestamps and source tiers, the occupancy
        computation with its denominator shown, and the money math. It goes to
        your counsel for review, then to your signatory. Nothing leaves this
        desk without a person deciding it should.
      </Note>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Ready to serve", ready.length, "text-brass-600"],
          ["Held for verification", held.length, "text-muted"],
          [
            "Combined monthly value",
            usd(
              Math.round(
                ready.reduce((s, r) => s + (r.evaluation.monthlyDelta ?? 0), 0),
              ),
            ),
            "text-ink",
          ],
        ].map(([l, v, c]) => (
          <div key={l as string} className="rounded-2xl border border-line bg-surface p-5">
            <p className="label text-muted">{l as string}</p>
            <p className={`tnum font-display mt-2 text-[1.75rem] leading-none ${c as string}`}>
              {v as React.ReactNode}
            </p>
          </div>
        ))}
      </div>

      {/* ---- the package ---- */}
      {lead && (
        <Panel flush>
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
            <div>
              <p className="label text-petrol-600">Package preview</p>
              <h2 className="mt-1.5 text-[1.0625rem] font-semibold text-ink">
                {lead.center.name}
              </h2>
              <p className="mt-1 text-[0.8125rem] text-muted">
                {lead.id} · prepared for {org.name}. Awaiting counsel review.
              </p>
            </div>
            <div className="flex gap-2">
              <ActionButton variant="secondary">Send to counsel</ActionButton>
              <ActionButton variant="brass">Release to signatory</ActionButton>
            </div>
          </div>

          <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-2">
            <div className="space-y-5">
              <Section n="01" title="The condition">
                <ul className="space-y-2">
                  {lead.evaluation.triggers
                    .filter((t) => t.failing)
                    .map((t) => (
                      <li
                        key={t.id}
                        className="rounded-xl border border-clay-100 bg-clay-50 p-3.5"
                      >
                        <p className="text-[0.8125rem] font-semibold text-ink">
                          {t.label} <span className="text-faint">{t.cite}</span>
                        </p>
                        <p className="mt-1 text-[0.8125rem] text-ink-soft">
                          Required: {t.requirement}
                        </p>
                        <p className="text-[0.8125rem] text-clay-700">
                          Observed: {t.observed}
                        </p>
                        {t.culprits.length > 0 && (
                          <p className="mt-1 text-[0.75rem] text-muted">
                            Not trading: {t.culprits.slice(0, 4).join(", ")}
                          </p>
                        )}
                      </li>
                    ))}
                </ul>
              </Section>

              <Section n="02" title="The evidence">
                <ul className="space-y-2">
                  {lead.evidence
                    .filter((e) => SOURCE_META[e.source].tier === "primary")
                    .map((e) => (
                      <li key={e.id} className="flex items-start gap-2.5">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-open-600" />
                        <p className="text-[0.8125rem] leading-relaxed text-ink-soft">
                          <span className="font-medium text-ink">
                            {SOURCE_META[e.source].label}
                          </span>
                          , observed {prettyDate(e.observedAt)}. {e.statement}
                        </p>
                      </li>
                    ))}
                </ul>
              </Section>

              <Section n="03" title="The computation">
                <p className="text-[0.8125rem] leading-relaxed text-ink-soft">
                  Occupancy for this clause is measured on{" "}
                  {lead.center.suites.filter((s) => s.kind !== "anchor" && s.kind !== "outparcel").length}{" "}
                  suites, excluding anchor premises and outparcels, on an open
                  and operating basis, with remodeling and force majeure
                  closures deemed open. Rent roll{" "}
                  {Math.round(lead.center.rentRollCoverage * 100)}% complete as
                  of {prettyDate(lead.center.rentRollAsOf)}.
                </p>
              </Section>
            </div>

            <div className="space-y-5">
              <Section n="04" title="The relief claimed">
                <KeyValue
                  items={[
                    { k: "Clause", v: lead.clause.locations.join(", ") },
                    {
                      k: "Remedy",
                      v: lead.clause.remedy.altRent?.text ?? `${lead.clause.remedy.abatementPct}% abatement`,
                    },
                    {
                      k: "Relief runs from",
                      v:
                        lead.clause.remedy.reliefRunsFrom === "failure"
                          ? "The failure"
                          : "First of the month after notice",
                    },
                    {
                      k: "Estimated monthly",
                      v:
                        lead.evaluation.monthlyDelta == null
                          ? "Sales needed"
                          : usd(Math.round(lead.evaluation.monthlyDelta)),
                    },
                    {
                      k: "Termination available",
                      v: lead.clause.remedy.capMonths
                        ? `After ${lead.clause.remedy.capMonths} months`
                        : "Not provided",
                    },
                  ]}
                />
              </Section>

              <Section n="05" title="Draft notice">
                <div className="rounded-xl border border-line bg-surface-sunk p-4 text-[0.8125rem] leading-[1.8] text-ink-soft">
                  <p>
                    Re: Co-Tenancy, {lead.center.name}, Store {lead.storeNumber}
                  </p>
                  <p className="mt-3">
                    Pursuant to {lead.clause.locations[0]} of the Lease, Tenant
                    hereby notifies Landlord that the co-tenancy requirement set
                    forth therein is not satisfied. Specifically,{" "}
                    {lead.evaluation.triggers
                      .filter((t) => t.failing)
                      .map((t) => t.observed.toLowerCase())
                      .join(", and ")}
                    .
                  </p>
                  <p className="mt-3">
                    Tenant is open and operating from the Premises and is not in
                    default under the Lease. Tenant elects to pay the
                    alternative rent provided for in the Lease commencing on the
                    first day of the calendar month following delivery of this
                    notice, and reserves all rights.
                  </p>
                  <p className="mt-3 text-muted">
                    Draft for counsel review. Not legal advice.
                  </p>
                </div>
              </Section>
            </div>
          </div>
        </Panel>
      )}

      {/* ---- queue ---- */}
      <Panel flush>
        <div className="px-5 pt-5">
          <PanelHead
            title="All candidates"
            hint="Held items are failing tests that do not yet rest on primary evidence."
          />
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left">
            <thead>
              <tr className="border-y border-line bg-surface-sunk/50">
                {["Location", "Center", "Status", "Evidence", "Per month", ""].map((h) => (
                  <th key={h} className="label px-4 py-2.5 font-semibold text-faint">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {candidates.map((r) => {
                const v = verificationOf(r.evidence);
                const verified = v.tier === "verified";
                return (
                  <tr key={r.id} className="hover:bg-petrol-50/40">
                    <td className="px-4 py-3">
                      <Link
                        href={`/app/locations/${r.id}`}
                        className="text-[0.875rem] font-semibold text-petrol-800 hover:underline"
                      >
                        {r.id}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[0.875rem] text-ink">
                      {r.center.name}
                    </td>
                    <td className="px-4 py-3">
                      <Pill tone={STATE_META[r.evaluation.state].tone as Tone} dot>
                        {STATE_META[r.evaluation.state].label}
                      </Pill>
                    </td>
                    <td className="px-4 py-3">
                      <Pill tone={verified ? "open" : "muted"}>
                        {TIER_META[v.tier].label}
                      </Pill>
                    </td>
                    <td className="tnum px-4 py-3 text-[0.875rem] font-semibold text-brass-600">
                      {r.evaluation.monthlyDelta == null
                        ? "Sales needed"
                        : usd(Math.round(r.evaluation.monthlyDelta))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`text-[0.8125rem] font-semibold whitespace-nowrap ${
                          verified ? "text-petrol-700" : "text-faint"
                        }`}
                      >
                        {verified ? "Assemble" : "Held"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function Section({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-2.5">
        <span className="font-display text-[0.8125rem] text-brass-500">{n}</span>
        <h3 className="text-[0.875rem] font-semibold text-ink">{title}</h3>
      </div>
      <div className="mt-2.5">{children}</div>
    </div>
  );
}

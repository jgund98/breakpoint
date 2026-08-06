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
  NoticeDesk,
  type NoticeCandidate,
} from "@/components/app/NoticeDesk";
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

  const deskRows: NoticeCandidate[] = candidates.map((r) => ({
    id: r.id,
    center: r.center.name,
    city: `${r.center.city}, ${r.center.state}`,
    stateLabel: STATE_META[r.evaluation.state].label,
    stateTone: STATE_META[r.evaluation.state].tone as Tone,
    failing: r.evaluation.triggers
      .filter((t) => t.failing)
      .map((t) => t.label)
      .join(", "),
    monthly:
      r.evaluation.monthlyDelta == null
        ? "Sales needed"
        : `${usd(Math.round(r.evaluation.monthlyDelta))}/mo`,
    verified: verificationOf(r.evidence).tier === "verified",
  }));

  return (
    <div className="space-y-6">
      <PageHead
        eyebrow="Act"
        title="Notice packages"
        lede="We assemble the file. Your authorized signatory serves it."
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
            <p className="text-[0.75rem] text-muted">
              Move it through review below.
            </p>
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
                            Not open: {t.culprits.slice(0, 4).join(", ")}
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
                      k: "Co-tenancy rent runs from",
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

      <NoticeDesk candidates={deskRows} />
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

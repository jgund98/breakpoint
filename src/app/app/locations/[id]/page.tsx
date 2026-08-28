import Link from "next/link";
import { notFound } from "next/navigation";
import {
  COMPUTABILITY_META,
  PRECONDITION_META,
  SOURCE_META,
  STATE_META,
  TIER_META,
  baseRentMonthly,
  clauseStatusOn,
  prettyDate,
  sf,
  usd,
  verificationOf,
} from "@/lib/clause";
import { GRADE_TONE, gradeClause } from "@/lib/grade";
import { TODAY, rowById, rows } from "@/lib/portfolio";
import { ClauseSimulator } from "@/components/app/ClauseSimulator";
import { EstoppelCheck, LocationActions } from "@/components/app/RequestPanels";
import { ScanHistory } from "@/components/app/ScanHistory";
import { PapersOnFile } from "@/components/app/PapersOnFile";
import { Rise } from "@/components/app/Motion";
import {
  ActionButton,
  KeyValue,
  LinkButton,
  Note,
  Panel,
  PanelHead,
  Pill,
  type Tone,
} from "@/components/app/ui";

export function generateStaticParams() {
  return rows.map((r) => ({ id: r.id }));
}

export default async function LocationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = rowById(id);
  if (!row) notFound();

  const { center, clause, econ, claim, evaluation: ev } = row;
  const grade = gradeClause(clause);
  const v = verificationOf(row.evidence);
  const base = baseRentMonthly(econ);
  const tone = STATE_META[ev.state].tone as Tone;

  const canNotice =
    (ev.state === "claimable" || ev.state === "election_open") &&
    v.tier === "verified";

  return (
    <div className="space-y-5">
      {/* ---- breadcrumb ---- */}
      <nav className="flex items-center gap-2 text-[0.8125rem] text-slate-500">
        <Link href="/app/locations" className="hover:text-indigo-700">
          Locations
        </Link>
        <span className="text-slate-400">/</span>
        <span className="text-slate-900">{row.id}</span>
      </nav>

      {/* ---- head ---- */}
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            {/* balance keeps a long center name like "Westfield
                Annapolis (Annapolis Mall)" from dropping a lone word
                onto its own line on a phone. */}
            <h1 className="text-[clamp(1.5rem,3vw,2rem)] text-balance">
              {center.name}
            </h1>
            <Pill tone={tone} dot>
              {STATE_META[ev.state].label}
            </Pill>
          </div>
          <p className="mt-2 text-[0.9375rem] text-slate-700">
            {center.city}, {center.state} · {center.format} · {center.owner}
          </p>
          <p className="mt-1 text-[0.8125rem] text-slate-500">
            Store {row.storeNumber} · {row.unit} · {sf(econ.gla)}
            {econ.expiration
              ? ` · lease to ${prettyDate(econ.expiration)}`
              : " · lease term not supplied"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <LinkButton href="/app/locations">Back to list</LinkButton>
          {canNotice ? (
            <LinkButton href="/app/notices" variant="brass">
              Assemble notice package
            </LinkButton>
          ) : (
            <ActionButton variant="secondary" disabled>
              {ev.state === "blocked"
                ? "Blocked on a precondition"
                : v.tier !== "verified" && ev.anyFailing
                  ? "Awaiting verification"
                  : "Nothing to serve"}
            </ActionButton>
          )}
        </div>
      </div>

      {/* ---- the simulator ---- */}
      <Rise>
        <ClauseSimulator
          center={center}
          clause={clause}
          econ={econ}
          claim={claim}
          asOf={TODAY}
        />
      </Rise>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          {/* ---- the clause ---- */}
          <Panel>
            <PanelHead
              title="The operative language"
              hint={`${clause.locations.join(" · ")} · abstraction confidence ${Math.round(clause.confidence * 100)}%`}
              right={
                <Pill tone={clause.confidence >= 0.92 ? "open" : "watch"}>
                  {clause.confidence >= 0.92 ? "Auto-accepted" : "Human reviewed"}
                </Pill>
              }
            />
            <blockquote className="mt-4 rounded-xl border border-slate-200 bg-slate-100 p-5 text-[0.8125rem] leading-[1.85] text-slate-700">
              {clause.sourceText}
            </blockquote>

            {clause.amendments.length > 0 && (
              <div className="mt-4">
                <p className="label text-slate-500">Amendments that touch it</p>
                <ul className="mt-2.5 space-y-2">
                  {clause.amendments.map((a) => (
                    <li
                      key={a.label}
                      className="rounded-xl border border-amber-200 bg-amber-50 p-3.5"
                    >
                      <p className="text-[0.8125rem] font-semibold text-amber-700">
                        {a.label} · {prettyDate(a.dated)}
                      </p>
                      <p className="mt-1 text-[0.8125rem] leading-relaxed text-slate-700">
                        {a.effect}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {clause.ambiguityNotes.length > 0 && (
              <div className="mt-4">
                <p className="label text-slate-500">Flagged for counsel</p>
                <ul className="mt-2.5 space-y-2">
                  {clause.ambiguityNotes.map((n) => (
                    <li
                      key={n}
                      className="flex gap-2.5 text-[0.8125rem] leading-relaxed text-slate-700"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                      {n}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {row.clauses.length > 1 && (
              <div className="mt-4">
                <p className="label text-slate-500">Version history</p>
                <ul className="mt-2.5 space-y-2">
                  {row.clauses.map((c) => {
                    const status = clauseStatusOn(c, TODAY);
                    return (
                      <li
                        key={c.id}
                        className={`flex flex-wrap items-baseline gap-x-2 rounded-xl border p-3 ${
                          status === "in_force"
                            ? "border-emerald-100 bg-emerald-50"
                            : "border-slate-200 bg-slate-100"
                        }`}
                      >
                        <span className="text-[0.8125rem] font-semibold text-slate-900">
                          {c.locations[0]}
                        </span>
                        <Pill tone={status === "in_force" ? "open" : "muted"}>
                          {status === "in_force" ? "In force" : "Superseded"}
                        </Pill>
                        <span className="text-[0.75rem] text-slate-500">
                          {c.effectiveFrom
                            ? `From ${prettyDate(c.effectiveFrom)}`
                            : "From commencement"}
                          {c.effectiveTo && ` to ${prettyDate(c.effectiveTo)}`}
                          {c.supersededBy && ` · replaced by ${c.supersededBy}`}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-1.5">
              {clause.definedTerms.map((t) => (
                <span
                  key={t}
                  className="rounded-md bg-indigo-50 px-2 py-1 text-[0.6875rem] font-medium text-indigo-800"
                >
                  {t}
                </span>
              ))}
            </div>
          </Panel>

          {/* ---- evidence ---- */}
          <Panel>
            <PanelHead
              title="Evidence chain"
              hint="What we actually hold, and what it is worth. A notice rests on primary evidence or it does not go out."
              right={
                <Pill
                  tone={
                    v.tier === "verified"
                      ? "open"
                      : v.tier === "corroborated"
                        ? "watch"
                        : "muted"
                  }
                  dot
                >
                  {TIER_META[v.tier].label}
                </Pill>
              }
            />

            <p className="mt-3 text-[0.8125rem] leading-relaxed text-slate-500">
              {TIER_META[v.tier].blurb}
            </p>

            {row.evidence.length > 0 ? (
              <ol className="mt-5 space-y-0">
                {row.evidence
                  .slice()
                  .sort((a, b) => (a.observedAt < b.observedAt ? 1 : -1))
                  .map((e, i, arr) => {
                    const meta = SOURCE_META[e.source];
                    const unit = center.suites.find((s) => s.id === e.unitId);
                    return (
                      <li key={e.id} className="relative flex gap-4 pb-5">
                        {i < arr.length - 1 && (
                          <span className="absolute left-[9px] top-5 h-full w-px bg-slate-200" />
                        )}
                        <span
                          className={`relative mt-1 h-[18px] w-[18px] shrink-0 rounded-full border-2 ${
                            meta.tier === "primary"
                              ? "border-emerald-600 bg-emerald-50"
                              : "border-faint bg-white"
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-2.5">
                            <p className="text-[0.8125rem] font-semibold text-slate-900">
                              {meta.label}
                            </p>
                            <Pill tone={meta.tier === "primary" ? "open" : "muted"}>
                              {meta.tier === "primary" ? "Primary" : "Secondary"}
                            </Pill>
                            <span className="tnum text-[0.75rem] text-slate-400">
                              observed {prettyDate(e.observedAt)}
                            </span>
                          </div>
                          <details className="group mt-1">
                            <summary className="cursor-pointer list-none text-[0.8125rem] leading-relaxed text-slate-700 [&::-webkit-details-marker]:hidden">
                              {unit ? `${unit.name}: ` : ""}
                              {e.statement}
                              <span className="ml-1.5 text-[0.6875rem] font-semibold text-indigo-600 group-open:hidden">
                                Details
                              </span>
                            </summary>
                            <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                              <dl className="grid gap-x-6 gap-y-1 text-[0.75rem] sm:grid-cols-2">
                                <div className="flex justify-between gap-3 sm:block">
                                  <dt className="text-slate-400">Source</dt>
                                  <dd className="font-medium text-slate-700">{meta.label}</dd>
                                </div>
                                <div className="flex justify-between gap-3 sm:block">
                                  <dt className="text-slate-400">Evidence tier</dt>
                                  <dd className="font-medium text-slate-700">
                                    {meta.tier === "primary"
                                      ? "Primary: can carry a notice on its own"
                                      : "Secondary: a signal until corroborated or verified"}
                                  </dd>
                                </div>
                                <div className="flex justify-between gap-3 sm:block">
                                  <dt className="text-slate-400">Observed</dt>
                                  <dd className="tnum font-medium text-slate-700">
                                    {prettyDate(e.observedAt)}
                                  </dd>
                                </div>
                                {unit && (
                                  <div className="flex justify-between gap-3 sm:block">
                                    <dt className="text-slate-400">Store</dt>
                                    <dd className="font-medium text-slate-700">{unit.name}</dd>
                                  </div>
                                )}
                              </dl>
                              <p className="mt-2 border-t border-slate-200 pt-2 text-[0.6875rem] leading-snug text-slate-400">
                                The capture behind this observation is on file with
                                Breakpoint and travels with any notice package
                                assembled from it.
                              </p>
                            </div>
                          </details>
                        </div>
                      </li>
                    );
                  })}
              </ol>
            ) : (
              <p className="mt-5 rounded-xl border border-slate-200 bg-slate-100 p-4 text-[0.8125rem] text-slate-500">
                No observations logged. Every named tenant at this center was
                confirmed open on the last sweep.
              </p>
            )}

            {ev.anyFailing && v.tier !== "verified" && (
              <Note tone="watch" title="Verification queued">
                This finding rests on secondary sources. A field visit has been
                requested so the package can carry primary evidence. We do not
                put a listing screenshot in front of a landlord.
              </Note>
            )}
          </Panel>
        </div>

        <div className="space-y-4">
          {/* ---- the watch, on this door ---- */}
          <ScanHistory centerName={center.name} centerRef={center.id} />

          {/* ---- clause strength ---- */}
          <Panel>
            <PanelHead
              title="Clause strength"
              hint="How well this provision protects you, before anything happens in the center."
            />
            <div className="mt-4 flex items-center gap-4">
              <span
                className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl text-[1.75rem] font-bold ${
                  GRADE_TONE[grade.letter] === "open"
                    ? "bg-emerald-50 text-emerald-700"
                    : GRADE_TONE[grade.letter] === "watch"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-rose-50 text-rose-700"
                }`}
              >
                {grade.letter}
              </span>
              <div>
                <p className="tnum text-[0.9375rem] font-semibold text-slate-900">
                  {grade.score} of 100
                </p>
                <p className="no-orphan mt-1 text-[0.8125rem] leading-relaxed text-slate-500">
                  {grade.headline}
                </p>
              </div>
            </div>

            <ul className="mt-5 space-y-3.5">
              {grade.dials.map((d) => (
                <li key={d.key}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[0.8125rem] font-medium text-slate-900">
                      {d.label}
                    </p>
                    <span className="tnum text-[0.75rem] text-slate-500">
                      {Math.round(d.score * 100)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${
                        d.score >= 0.75
                          ? "bg-emerald-600"
                          : d.score >= 0.5
                            ? "bg-amber-500"
                            : "bg-rose-500"
                      }`}
                      style={{ width: `${d.score * 100}%` }}
                    />
                  </div>
                  <p className="no-orphan mt-1.5 text-[0.75rem] leading-snug text-slate-500">
                    {d.verdict}
                  </p>
                </li>
              ))}
            </ul>

            <Note tone="petrol" title="At renewal">
              {grade.dials.sort((a, b) => a.score - b.score)[0].advice}
            </Note>

            {grade.replacementStandard && (
              <Note tone="muted" title="Replacement standard, not scored">
                <span className="block italic">
                  &#8220;{grade.replacementStandard.text}&#8221;
                </span>
                <span className="mt-1.5 block">
                  {grade.replacementStandard.note}
                </span>
              </Note>
            )}
          </Panel>

          {/* ---- money ---- */}
          <Panel>
            <PanelHead title="Lease economics" />
            <KeyValue
              className="mt-3"
              items={[
                { k: "Premises", v: sf(econ.gla) },
                { k: "Minimum rent", v: `${usd(econ.rentPsf)} per SF` },
                { k: "Contract rent, monthly", v: usd(Math.round(base)) },
                {
                  k: "Reported sales, TTM",
                  v: econ.ttmGrossSales
                    ? usd(econ.ttmGrossSales)
                    : "Not reported",
                },
                {
                  k: "Occupancy cost",
                  v: econ.ttmGrossSales
                    ? `${(((base * 12) / econ.ttmGrossSales) * 100).toFixed(1)}%`
                    : "Needs sales",
                },
                {
                  k: "Alternative rent, monthly",
                  v:
                    ev.monthlyDelta == null
                      ? "Needs sales"
                      : usd(Math.round(base - ev.monthlyDelta)),
                },
                {
                  k: "Monthly delta",
                  v:
                    ev.monthlyDelta == null ? (
                      "Needs sales"
                    ) : (
                      <span className="text-amber-600">
                        {usd(Math.round(ev.monthlyDelta))}
                      </span>
                    ),
                },
              ]}
            />

            {ev.monthsBeforeNotice > 0 ? (
              <Note
                tone={ev.potentialMissed ? "brass" : "open"}
                title="Lookback"
              >
                {ev.monthsBeforeNotice} month
                {ev.monthsBeforeNotice === 1 ? "" : "s"} between the condition
                becoming observable and notice.{" "}
                {clause.remedy.reliefRunsFrom === "failure" ? (
                  clause.remedy.retroactiveCapDays != null ? (
                    <>
                      Co-tenancy rent reaches back to the failure but no more than{" "}
                      {clause.remedy.retroactiveCapDays} days before notice, so{" "}
                      {ev.recoverableMonths} of those months are recoverable
                      {ev.potentialMissed ? (
                        <>
                          {" "}
                          and roughly{" "}
                          {usd(Math.round(ev.potentialMissed))} sits beyond the
                          cap
                        </>
                      ) : null}
                      .
                    </>
                  ) : (
                    <>
                      Co-tenancy rent reaches back to the failure with no cap, so the
                      full period remains recoverable.
                    </>
                  )
                ) : (
                  <>
                    Co-tenancy rent runs from notice with no lookback, so roughly{" "}
                    {usd(Math.round(ev.potentialMissed ?? 0))} of potential
                    relief is out of reach.
                  </>
                )}
              </Note>
            ) : null}
          </Panel>

          {/* ---- preconditions ---- */}
          <Panel>
            <PanelHead
              title="Preconditions"
              hint="Everything that must be true before this right arises. These are the most common reason a valid trigger pays nothing."
            />
            <ul className="mt-4 space-y-2.5">
              {clause.preconditions.map((p) => {
                const failed = claim.failedPreconditions.includes(p);
                const meta = PRECONDITION_META[p];
                return (
                  <li
                    key={p}
                    className={`rounded-xl border p-3.5 ${
                      failed
                        ? "border-rose-100 bg-rose-50"
                        : "border-slate-200 bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${failed ? "bg-rose-500" : "bg-emerald-600"}`}
                      />
                      <p className="text-[0.8125rem] font-semibold text-slate-900">
                        {meta.label}
                      </p>
                      <span className="ml-auto text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-500">
                        {failed ? "Not met" : "Met"}
                      </span>
                    </div>
                    <p className="mt-1 text-[0.75rem] leading-relaxed text-slate-500">
                      {meta.risk}
                    </p>
                  </li>
                );
              })}
            </ul>
          </Panel>

          {/* ---- computability ---- */}
          <Panel>
            <PanelHead
              title="What we can prove"
              hint="Each test graded by whether we can evidence it to a standard that survives a landlord's response."
            />
            <ul className="mt-4 space-y-3">
              {ev.triggers.map((t) => (
                <li key={t.id} className="flex items-start gap-3">
                  <Pill
                    tone={COMPUTABILITY_META[t.computability].tone as Tone}
                    className="mt-0.5"
                  >
                    {COMPUTABILITY_META[t.computability].label}
                  </Pill>
                  <div className="min-w-0">
                    <p className="text-[0.8125rem] font-medium text-slate-900">
                      {t.label} <span className="text-slate-400">{t.cite}</span>
                    </p>
                    <p className="no-orphan mt-0.5 text-[0.75rem] leading-relaxed text-slate-500">
                      {t.computabilityNote}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>

          {/* ---- the papers we hold ---- */}
          <PapersOnFile locationId={row.id} />

          {/* ---- the estoppel moment ---- */}
          <EstoppelCheck
            locationId={row.id}
            centerName={center.name}
            live={ev.anyFailing || ev.state === "remedy_active"}
            asOf={prettyDate(TODAY)}
            failing={ev.triggers
              .filter((t) => t.failing)
              .map((t) => ({ label: t.label, cite: t.cite, observed: t.observed }))}
          />

          {/* ---- what the tenant can start themselves ---- */}
          <LocationActions
            locationId={row.id}
            centerName={center.name}
            suites={center.suites.map((s) => ({
              id: s.id,
              name: s.name,
              status: s.status,
            }))}
          />
        </div>
      </div>

      <p className="rounded-xl border border-slate-200 bg-slate-100 p-5 text-[0.75rem] leading-relaxed text-slate-500">
        Illustrative sample data. Breakpoint flags conditions and assembles the
        supporting file. Whether a right exists, and whether to exercise it, is
        a decision for you and your counsel on the executed lease and its
        amendments. Figures shown are estimates of potential co-tenancy rent, not amounts
        owed.
      </p>
    </div>
  );
}

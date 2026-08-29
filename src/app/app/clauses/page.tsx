import { requirePortfolio } from "@/lib/portfolio-gate";
import Link from "next/link";
import { PRECONDITION_META, prettyDate } from "@/lib/clause";
import { GRADE_TONE, gradeClause } from "@/lib/grade";

import {
  EmptyState,
  Note,
  PageHead,
  Panel,
  PanelHead,
  Stat,
  Pill,
  type Tone,
} from "@/components/app/ui";

const GRADES = ["A", "B", "C", "D"] as const;

export default async function ClausesPage() {
  const { rows } = await requirePortfolio();
  const graded = rows
    .map((r) => ({ row: r, grade: gradeClause(r.clause) }))
    .sort((a, b) => a.grade.score - b.grade.score);

  const dist = graded.reduce<Record<string, number>>((acc, g) => {
    acc[g.grade.letter] = (acc[g.grade.letter] ?? 0) + 1;
    return acc;
  }, {});

  const median =
    graded.length > 0
      ? graded[Math.floor(graded.length / 2)].grade.score
      : 0;

  const withAmendments = rows.filter((r) => r.clause.amendments.length > 0);
  const weakest = graded.slice(0, 8);

  return (
    <div className="space-y-5">
      <PageHead
        eyebrow="Analyze"
        title="Clause library"
        lede="Every co-tenancy provision, graded on the seven terms that decide whether it pays."
      />

      {/*
        A distribution is one fact, not four. Five equal cards in a four
        column grid dropped the last grade onto a row of its own, and a
        full card carrying the number zero earns none of the space it
        takes. Median stands alone; the spread reads as a bar.
      */}
      <div className="grid gap-3 lg:grid-cols-3">
        <Stat
          label="Portfolio median"
          value={
            <>
              {median}
              <span className="text-[1rem] text-slate-500"> / 100</span>
            </>
          }
          sub={`Across ${graded.length} graded provisions`}
          tone="petrol"
        />

        <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2">
          <p className="label text-slate-500">Grade distribution</p>

          <div className="mt-3 flex h-2 gap-0.5 overflow-hidden rounded-full bg-slate-100">
            {GRADES.map((letter) => {
              const n = dist[letter] ?? 0;
              if (n === 0) return null;
              return (
                <div
                  key={letter}
                  style={{ width: `${(n / graded.length) * 100}%` }}
                  className={
                    GRADE_TONE[letter] === "open"
                      ? "bg-emerald-600"
                      : GRADE_TONE[letter] === "watch"
                        ? "bg-amber-500"
                        : "bg-rose-500"
                  }
                />
              );
            })}
          </div>

          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
            {GRADES.map((letter) => {
              const n = dist[letter] ?? 0;
              return (
                <div key={letter} className="flex items-baseline gap-1.5">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      n === 0
                        ? "bg-slate-200"
                        : GRADE_TONE[letter] === "open"
                          ? "bg-emerald-600"
                          : GRADE_TONE[letter] === "watch"
                            ? "bg-amber-500"
                            : "bg-rose-500"
                    }`}
                  />
                  <dt className="text-[0.75rem] text-slate-500">Grade {letter}</dt>
                  <dd
                    className={`tnum text-[0.9375rem] font-semibold ${
                      n === 0 ? "text-slate-400" : "text-slate-900"
                    }`}
                  >
                    {n}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      </div>

      <Note tone="petrol" title="Read this before your next renewal">
        A grade is not about whether a clause has tripped. It is about whether
        the clause is worth anything if it ever does. The two most expensive
        sentences in any co-tenancy provision are the one that says what counts
        as a replacement tenant, and the one that says when the clock starts.
      </Note>

      <Panel flush>
        <div className="px-5 pt-5">
          <PanelHead
            title="Weakest protection in the portfolio"
            hint="Where a lease is open, these are the terms to renegotiate first."
          />
        </div>
        {graded.length === 0 ? (
          <EmptyState
            title="No clauses abstracted yet"
            body="Once your leases are read, every co-tenancy provision appears here graded on the terms that decide whether it pays."
            action={{ label: "Portfolio setup", href: "/app/setup" }}
          />
        ) : (
        <ul className="mt-4 divide-y divide-slate-100">
          {weakest.map(({ row, grade }) => {
            const weakestDial = [...grade.dials].sort((a, b) => a.score - b.score)[0];
            return (
              <li key={row.id} className="flex flex-wrap items-start gap-4 px-5 py-4">
                <span
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[1.125rem] font-bold ${
                    GRADE_TONE[grade.letter] === "open"
                      ? "bg-emerald-50 text-emerald-700"
                      : GRADE_TONE[grade.letter] === "watch"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-rose-50 text-rose-700"
                  }`}
                >
                  {grade.letter}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2.5">
                    <Link
                      href={`/app/locations/${row.id}`}
                      className="text-[0.9375rem] font-semibold text-slate-900 hover:text-indigo-700"
                    >
                      {row.center.name}
                    </Link>
                    <span className="text-[0.8125rem] text-slate-500">
                      {row.id}
                      {row.econ.expiration
                        ? ` · lease to ${prettyDate(row.econ.expiration)}`
                        : " · lease term not supplied"}
                    </span>
                  </div>
                  <p className="no-orphan mt-1 text-[0.8125rem] leading-relaxed text-slate-700">
                    <span className="font-medium">
                      Weakest dial: {weakestDial.label}.
                    </span>{" "}
                    {weakestDial.advice}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {row.clause.preconditions.map((p) => (
                      <span
                        key={p}
                        className="rounded-md bg-slate-100 px-2 py-1 text-[0.6875rem] font-medium text-slate-500"
                      >
                        {PRECONDITION_META[p].label}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="tnum shrink-0 text-[0.875rem] font-semibold text-slate-900">
                  {grade.score}
                </span>
              </li>
            );
          })}
        </ul>
        )}
      </Panel>

      {withAmendments.length > 0 && (
        <Panel>
          <PanelHead
            title="Clauses modified by amendment"
            hint="An amendment can narrow a pool, raise a threshold, or waive the provision outright. Reading only the original lease produces confident, wrong answers."
          />
          <ul className="mt-4 space-y-3">
            {withAmendments.slice(0, 6).map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-amber-200 bg-amber-50 p-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Link
                    href={`/app/locations/${r.id}`}
                    className="text-[0.875rem] font-semibold text-slate-900 hover:text-indigo-700"
                  >
                    {r.center.name}
                  </Link>
                  <Pill tone={"watch" as Tone}>
                    {r.clause.amendments.length} amendment
                    {r.clause.amendments.length === 1 ? "" : "s"}
                  </Pill>
                </div>
                {r.clause.amendments.map((a) => (
                  <p
                    key={a.label}
                    className="mt-1.5 text-[0.8125rem] leading-relaxed text-slate-700"
                  >
                    <span className="font-medium">
                      {a.label}, {prettyDate(a.dated)}:
                    </span>{" "}
                    {a.effect}
                  </p>
                ))}
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}

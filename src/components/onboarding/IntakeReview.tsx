"use client";

import { useMemo } from "react";
import { Download } from "lucide-react";
import type { FieldKey, ParsedRow } from "@/lib/ingest";
import { FIELDS } from "@/lib/ingest";
import { type Issue, issuesCsv, validateIntake } from "@/lib/intake";
import { cn } from "@/lib/cn";

/**
 * WHAT THE UPLOAD ACTUALLY SAID
 *
 * A client sends a spreadsheet and wants one question answered: is this
 * right, and if not, what do I change. Everything here serves that.
 *
 * Rows are counted three ways rather than two, because "valid or
 * invalid" is the wrong shape for this data. Most rosters arrive
 * complete enough to start and thin in places that only matter later,
 * and holding an entire portfolio over sixty missing postal codes is
 * how an onboarding dies. So a row is ready, or it loads with something
 * noted, or it is genuinely unplaceable and held.
 *
 * When rows are held the client gets a file back containing only those
 * rows, in the shape they sent, with a column saying what to fix. Fix
 * and return beats start again, and at eight hundred stores it is the
 * difference between an afternoon and a fortnight.
 */

function download(name: string, body: string, type = "text/csv") {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function IntakeReview({
  rows,
  headers,
  mapping,
}: {
  rows: ParsedRow[];
  headers: string[];
  mapping: Record<string, FieldKey>;
}) {
  const report = useMemo(
    () => validateIntake(rows, mapping),
    [rows, mapping],
  );

  /* Group by message so eight hundred rows missing the same column read
     as one problem to fix, not eight hundred. */
  const grouped = useMemo(() => {
    const m = new Map<string, { issue: Issue; count: number; rows: number[] }>();
    for (const i of report.issues) {
      const key = `${i.severity}|${i.field}|${i.message.replace(/\d+/g, "#")}`;
      const e = m.get(key) ?? { issue: i, count: 0, rows: [] };
      e.count += 1;
      if (e.rows.length < 6) e.rows.push(i.row);
      m.set(key, e);
    }
    return [...m.values()].sort(
      (a, b) =>
        (a.issue.severity === "error" ? 0 : 1) - (b.issue.severity === "error" ? 0 : 1) ||
        b.count - a.count,
    );
  }, [report]);

  const labelOf = (k: Issue["field"]) =>
    k === "row" ? "Row" : (FIELDS.find((f) => f.key === k)?.label ?? k);

  if (rows.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* ---- the three counts, as one line ---- */}
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 rounded-xl border border-slate-200 px-4 py-3">
        {(
          [
            ["Ready", report.ready, "text-emerald-700"],
            ["Noted", report.withWarnings, "text-amber-700"],
            ["Held", report.held, report.held > 0 ? "text-rose-700" : "text-slate-400"],
          ] as const
        ).map(([label, n, tone]) => (
          <div key={label} className="flex items-baseline gap-2">
            <span className="label text-slate-400">{label}</span>
            <span className={cn("tnum text-[0.9375rem] font-semibold", tone)}>
              {n.toLocaleString("en-US")}
            </span>
          </div>
        ))}
        <span className="text-[0.75rem] text-slate-500">
          of {report.totalRows.toLocaleString("en-US")} rows
        </span>
      </div>

      {/* ---- what to fix ---- */}
      {grouped.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <h3 className="text-[0.875rem] font-semibold text-slate-900">
              {grouped.length} to look at
            </h3>
            {report.held > 0 && (
              <button
                type="button"
                onClick={() =>
                  download(
                    "rows-to-fix.csv",
                    issuesCsv(rows, headers, report),
                  )
                }
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[0.75rem] font-semibold whitespace-nowrap transition-colors duration-250",
                  report.held > 20
                    ? "bg-indigo-800 text-white hover:bg-indigo-700"
                    : "border border-slate-200 text-slate-900 hover:border-indigo-300 hover:bg-indigo-50",
                )}
              >
                <Download className="h-3 w-3" />
                Return {report.held} row{report.held === 1 ? "" : "s"}
              </button>
            )}
          </div>

          <ul className="divide-y divide-slate-100">
            {grouped.map(({ issue, count, rows: where }) => (
              <li
                key={`${issue.field}-${issue.message}`}
                className="flex flex-wrap items-start gap-3 px-4 py-2.5"
              >
                <span
                  className={cn(
                    "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
                    issue.severity === "error" ? "bg-rose-500" : "bg-amber-500",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[0.8125rem] leading-snug text-slate-900">
                    <span className="font-medium">{labelOf(issue.field)}.</span>{" "}
                    {issue.message}
                  </p>
                  <p className="mt-0.5 text-[0.6875rem] text-slate-500">
                    {count === 1
                      ? `Row ${where[0]}`
                      : `${count.toLocaleString("en-US")} rows, including ${where.slice(0, 4).join(", ")}`}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded px-1.5 py-0.5 text-[0.625rem] font-semibold ring-1 ring-inset",
                    issue.severity === "error"
                      ? "bg-rose-50 text-rose-700 ring-rose-100"
                      : "bg-amber-50 text-amber-700 ring-amber-200",
                  )}
                >
                  {issue.severity === "error" ? "Held" : "Noted"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ---- what we fixed ourselves ---- */}
      {report.repairs.length > 0 && (
        <div className="rounded-xl border border-slate-200 px-4 py-3">
          <p className="text-[0.8125rem] font-semibold text-emerald-700">
            {report.repairs.length} corrected on the way in
          </p>
          <p className="mt-1 text-[0.8125rem] leading-relaxed text-slate-700">
            {[...new Set(report.repairs.map((r) => `${r.from} to ${r.to}`))]
              .slice(0, 6)
              .join(", ")}
            {report.repairs.length > 6 ? ", and others." : "."} Nothing for you
            to do. We list them so the change is on the record rather than
            silent.
          </p>
        </div>
      )}

      {/* ---- columns we never saw, and who solves each ---- */}
      {report.missingFields.length > 0 && (
        <div className="rounded-xl border border-slate-200 px-4 py-3">
          <p className="text-[0.8125rem] font-semibold text-slate-900">
            Not in this file
          </p>
          <ul className="mt-2 space-y-1.5">
            {(["lease", "observed", "client"] as const).map((src) => {
              const list = report.missingFields.filter((f) => f.from === src);
              if (!list.length) return null;
              return (
                <li key={src} className="text-[0.8125rem] leading-relaxed">
                  <span className="font-medium text-slate-900">
                    {list.map((f) => f.label).join(", ")}.
                  </span>{" "}
                  <span className="text-slate-700">
                    {src === "lease"
                      ? "We take these from the leases you are sending. Do not retype them."
                      : src === "observed"
                        ? "We establish this from the center's own directory and come back only if it stays unclear."
                        : "Only you have this. We will ask once, for the stores it matters to."}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

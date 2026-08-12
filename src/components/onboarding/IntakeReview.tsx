"use client";

import { useMemo } from "react";
import { AlertTriangle, CheckCircle2, Download, XCircle } from "lucide-react";
import type { FieldKey, ParsedRow } from "@/lib/ingest";
import { FIELDS } from "@/lib/ingest";
import {
  type Issue,
  intakeTemplateCsv,
  issuesCsv,
  validateIntake,
} from "@/lib/intake";
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

export function TemplateButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => download("breakpoint-store-roster-template.csv", intakeTemplateCsv())}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-4 py-2.5",
        "text-[0.8125rem] font-semibold whitespace-nowrap text-ink transition-colors duration-250",
        "hover:border-petrol-300 hover:bg-petrol-50",
        className,
      )}
    >
      <Download className="h-3.5 w-3.5" />
      Download the template
    </button>
  );
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
    <div className="space-y-4">
      {/* ---- the three counts ---- */}
      <div className="grid gap-3 sm:grid-cols-3">
        {(
          [
            ["Ready", report.ready, CheckCircle2, "open"],
            ["Loaded with notes", report.withWarnings, AlertTriangle, "watch"],
            ["Held", report.held, XCircle, "clay"],
          ] as const
        ).map(([label, n, Icon, tone]) => (
          <div
            key={label}
            className={cn(
              "rounded-2xl border p-4",
              tone === "open"
                ? "border-open-100 bg-open-50"
                : tone === "watch"
                  ? "border-brass-200 bg-brass-50"
                  : n > 0
                    ? "border-clay-100 bg-clay-50"
                    : "border-line bg-surface",
            )}
          >
            <div className="flex items-center gap-2">
              <Icon
                className={cn(
                  "h-4 w-4",
                  tone === "open"
                    ? "text-open-700"
                    : tone === "watch"
                      ? "text-brass-700"
                      : n > 0
                        ? "text-clay-700"
                        : "text-faint",
                )}
              />
              <span className="label text-muted">{label}</span>
            </div>
            <p className="tnum font-display mt-2 text-[1.75rem] leading-none text-ink">
              {n.toLocaleString("en-US")}
            </p>
            <p className="mt-1 text-[0.75rem] text-muted">
              {label === "Ready"
                ? "Nothing outstanding"
                : label === "Loaded with notes"
                  ? "In, with gaps recorded"
                  : n > 0
                    ? "Cannot be placed yet"
                    : "Nothing held"}
            </p>
          </div>
        ))}
      </div>

      {/* ---- what to fix ---- */}
      {grouped.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div>
              <p className="text-[0.9375rem] font-semibold text-ink">
                {grouped.length} thing{grouped.length === 1 ? "" : "s"} to look at
              </p>
              <p className="mt-1 text-[0.8125rem] text-muted">
                Grouped, so a column missing on six hundred rows reads as one fix.
              </p>
            </div>
            {report.held > 0 && (
              <button
                type="button"
                onClick={() =>
                  download(
                    "rows-to-fix.csv",
                    issuesCsv(rows, headers, report),
                  )
                }
                className="inline-flex items-center gap-2 rounded-lg bg-petrol-800 px-4 py-2.5 text-[0.8125rem] font-semibold whitespace-nowrap text-cream transition-colors duration-250 hover:bg-petrol-700"
              >
                <Download className="h-3.5 w-3.5" />
                Download the {report.held} held row
                {report.held === 1 ? "" : "s"}
              </button>
            )}
          </div>

          <ul className="divide-y divide-line">
            {grouped.map(({ issue, count, rows: where }) => (
              <li
                key={`${issue.field}-${issue.message}`}
                className="flex flex-wrap items-start gap-3 px-5 py-3.5"
              >
                <span
                  className={cn(
                    "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
                    issue.severity === "error" ? "bg-clay-500" : "bg-brass-500",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[0.875rem] text-ink">
                    <span className="font-medium">{labelOf(issue.field)}.</span>{" "}
                    {issue.message}
                  </p>
                  <p className="mt-0.5 text-[0.75rem] text-muted">
                    {count === 1
                      ? `Row ${where[0]}`
                      : `${count.toLocaleString("en-US")} rows, including ${where.slice(0, 4).join(", ")}`}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-md px-2 py-1 text-[0.6875rem] font-semibold ring-1 ring-inset",
                    issue.severity === "error"
                      ? "bg-clay-50 text-clay-700 ring-clay-100"
                      : "bg-brass-50 text-brass-700 ring-brass-200",
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
        <div className="rounded-xl border border-open-100 bg-open-50 p-4">
          <p className="text-[0.8125rem] font-semibold text-open-700">
            {report.repairs.length} corrected on the way in
          </p>
          <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-soft">
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
        <div className="rounded-xl border border-line bg-surface-sunk p-4">
          <p className="text-[0.8125rem] font-semibold text-ink">
            Not in this file
          </p>
          <ul className="mt-2 space-y-1.5">
            {(["lease", "observed", "client"] as const).map((src) => {
              const list = report.missingFields.filter((f) => f.from === src);
              if (!list.length) return null;
              return (
                <li key={src} className="text-[0.8125rem] leading-relaxed">
                  <span className="font-medium text-ink">
                    {list.map((f) => f.label).join(", ")}.
                  </span>{" "}
                  <span className="text-ink-soft">
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

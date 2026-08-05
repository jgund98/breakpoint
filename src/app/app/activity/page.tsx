import Link from "next/link";
import {
  Bell,
  CalendarClock,
  Download,
  FileBarChart,
  RefreshCw,
} from "lucide-react";
import { prettyDate, shortDate } from "@/lib/clause";
import {
  REPORT_META,
  activitySummary,
  notifications,
  reports,
  sweeps,
} from "@/lib/activity";
import {
  ActionButton,
  LinkButton,
  PageHead,
  Panel,
  PanelHead,
  Pill,
  type Tone,
} from "@/components/app/ui";

const SEVERITY: Record<string, { label: string; tone: Tone }> = {
  critical: { label: "Critical", tone: "clay" },
  action: { label: "Action", tone: "brass" },
  info: { label: "Info", tone: "muted" },
};

export default function ActivityPage() {
  const a = activitySummary;

  return (
    <div className="space-y-5">
      <PageHead
        eyebrow="Monitor"
        title="Activity"
        lede="Every sweep that ran, every report delivered, every alert sent."
        right={<LinkButton href="/app/coverage">Coverage</LinkButton>}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Sweeps run", a.sweepsRun, `Last ${shortDate(a.lastSweep)}`],
          ["Source checks", a.totalChecks.toLocaleString("en-US"), "Across all sweeps"],
          ["Status changes caught", a.changesDetected, "Stores that moved"],
          ["Reports delivered", a.reportsDelivered, "Automatically"],
        ].map(([k, v, hint], i) => (
          <div
            key={k as string}
            className={`card-enter d-${i + 1} rounded-2xl border border-line bg-surface p-4`}
          >
            <p className="text-[0.75rem] text-muted">{k as string}</p>
            <p className="tnum font-display mt-1.5 text-[1.5rem] leading-none text-ink">
              {v as React.ReactNode}
            </p>
            <p className="mt-1 text-[0.75rem] text-faint">{hint as string}</p>
          </div>
        ))}
      </div>

      {/* ---- sweep history ---- */}
      <Panel flush className="card-enter d-2">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
          <PanelHead
            title="Sweep history"
            hint="One pass over every watched store, weekly. A pass with nothing to report is still the product working."
          />
          <Pill tone="open" dot>
            {a.daysSinceLastSweep === 0
              ? "Ran today"
              : `${a.daysSinceLastSweep}d ago`}
          </Pill>
        </div>

        <ul className="mt-4 divide-y divide-line">
          {sweeps.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-4 px-5 py-3">
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                  s.changes ? "bg-brass-50 text-brass-700" : "bg-open-50 text-open-700"
                }`}
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-[0.875rem] font-medium text-ink">
                  {prettyDate(s.ranOn)}
                  <span className="ml-2 font-normal text-faint">{s.id}</span>
                </p>
                <p className="text-[0.75rem] text-muted">
                  {s.targetsChecked} stores · {s.sourceCalls} source checks ·{" "}
                  {s.durationMin} min
                  {s.moved.length > 0 && (
                    <>
                      {" · "}
                      <span className="text-clay-600">
                        {s.moved.map((m) => m.store).join(", ")} stopped trading
                      </span>
                    </>
                  )}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p
                  className={`tnum text-[0.875rem] font-semibold ${
                    s.changes ? "text-brass-600" : "text-muted"
                  }`}
                >
                  {s.changes === 0 ? "No change" : `${s.changes} changed`}
                </p>
                {s.findings > 0 && (
                  <p className="text-[0.75rem] text-clay-600">
                    {s.findings} finding{s.findings === 1 ? "" : "s"}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <div className="grid gap-3 lg:grid-cols-2">
        {/* ---- reports ---- */}
        <Panel flush className="card-enter d-3">
          <div className="px-5 pt-5">
            <PanelHead
              title="Reports"
              hint="Delivered on schedule to the people who need them."
            />
          </div>
          <ul className="mt-4 divide-y divide-line">
            {reports.map((r) => {
              const meta = REPORT_META[r.kind];
              return (
                <li key={r.id} className="flex items-start gap-3 px-5 py-3.5">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-petrol-50 text-petrol-700">
                    <FileBarChart className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.875rem] font-medium text-ink">
                      {meta.label}
                      <span className="ml-2 font-normal text-muted">
                        {r.period}
                      </span>
                    </p>
                    <p className="text-[0.75rem] text-muted">
                      {r.pages} pages · {r.findings} finding
                      {r.findings === 1 ? "" : "s"} · sent to{" "}
                      {r.recipients.join(", ")}
                    </p>
                    <p className="text-[0.75rem] text-faint">
                      Generated {shortDate(r.generatedOn)} · for {meta.audience}
                    </p>
                  </div>
                  <ActionButton variant="quiet" className="shrink-0 px-2.5 py-1.5">
                    <Download className="h-3.5 w-3.5" />
                  </ActionButton>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-line px-5 py-3">
            <p className="flex items-center gap-1.5 text-[0.75rem] text-muted">
              <CalendarClock className="h-3.5 w-3.5" />
              Next scheduled report {a.nextReport}
            </p>
          </div>
        </Panel>

        {/* ---- notifications ---- */}
        <Panel flush className="card-enter d-4">
          <div className="px-5 pt-5">
            <PanelHead
              title="Alerts sent"
              hint="What we told you, when, and who received it."
            />
          </div>
          <ul className="max-h-[520px] divide-y divide-line overflow-y-auto">
            {notifications.map((n) => {
              const sev = SEVERITY[n.severity];
              return (
                <li key={n.id} className="flex items-start gap-3 px-5 py-3.5">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-sunk text-muted">
                    <Bell className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill tone={sev.tone}>{sev.label}</Pill>
                      <span className="text-[0.75rem] text-faint">
                        {shortDate(n.sentOn)} · {n.channel.replace("_", " ")}
                      </span>
                    </div>
                    <p className="mt-1 text-[0.8125rem] font-medium text-ink">
                      {n.locationId ? (
                        <Link
                          href={`/app/locations/${n.locationId}`}
                          className="hover:text-petrol-700"
                        >
                          {n.subject}
                        </Link>
                      ) : (
                        n.subject
                      )}
                    </p>
                    <p className="mt-0.5 text-[0.75rem] leading-snug text-muted">
                      {n.detail}
                    </p>
                    <p className="mt-0.5 text-[0.75rem] text-faint">
                      To {n.recipients.join(", ")}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
          {notifications.length === 0 && (
            <p className="px-5 py-12 text-center text-[0.8125rem] text-muted">
              No alerts sent. Nothing has crossed a threshold.
            </p>
          )}
        </Panel>
      </div>

      <p className="rounded-xl border border-line bg-surface-sunk p-4 text-[0.75rem] leading-relaxed text-muted">
        Sweeps, reports and alerts are recorded so the watch can be evidenced
        later. Illustrative sample data.
      </p>
    </div>
  );
}

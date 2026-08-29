import { requirePortfolio } from "@/lib/portfolio-gate";
import Link from "next/link";
import {
  Bell,
  Download,
  FileBarChart,
  RefreshCw,
} from "lucide-react";
import { SOURCE_META, prettyDate, shortDate } from "@/lib/clause";
import { REPORT_META, activityFor } from "@/lib/activity";
import {
  EmptyState,
  LinkButton,
  PageHead,
  Stat,
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

export default async function ActivityPage() {
  const p = await requirePortfolio();
  const { signalFeed } = p;
  const { activitySummary, notifications, reports, sweeps } = activityFor(p);
  const a = activitySummary;

  return (
    <div className="space-y-5">
      <PageHead
        eyebrow="Monitor"
        title="Activity"
        lede="Scans, observations, alerts and reports."
        right={<LinkButton href="/app/coverage">Coverage</LinkButton>}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {(
          [
            ["Scans run", a.sweepsRun, `Last ${shortDate(a.lastSweep)}`, "petrol"],
            ["Changes found", a.changesDetected, "Stores that closed or reopened", "brass"],
            ["Reports sent", a.reportsDelivered, "To your team", "muted"],
          ] as const
        ).map(([k, v, hint, tone], i) => (
          <Stat
            key={k}
            label={k}
            value={v}
            sub={hint}
            tone={tone as Tone}
            className={`card-enter d-${i + 1}`}
          />
        ))}
      </div>

      {/* ---- scans ---- */}
      <Panel flush className="card-enter d-2">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
          <PanelHead title="Scan history" hint="Weekly, across every store your clauses name." />
          <Pill tone="open" dot>
            {a.daysSinceLastSweep === 0 ? "Ran today" : `${a.daysSinceLastSweep}d ago`}
          </Pill>
        </div>

        {sweeps.length === 0 ? (
          <EmptyState
            title="No scans yet"
            body="The first scan runs once your locations are live. Every pass is recorded here, including the ones that find nothing."
          />
        ) : (
        <ul className="mt-4 divide-y divide-slate-100">
          {sweeps.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-4 px-5 py-3">
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                  s.changes ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                }`}
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-[0.875rem] font-medium text-slate-900">
                  {prettyDate(s.ranOn)}
                  <span className="ml-2 font-normal text-slate-400">{s.id}</span>
                </p>
                <p className="text-[0.75rem] text-slate-500">
                  {s.targetsChecked} stores checked
                  {s.moved.length > 0 && (
                    <>
                      {" · "}
                      <span className="text-rose-600">
                        {s.moved.map((m) => m.store).join(", ")} closed
                      </span>
                    </>
                  )}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p
                  className={`tnum text-[0.875rem] font-semibold ${
                    s.changes ? "text-amber-600" : "text-slate-500"
                  }`}
                >
                  {s.changes === 0 ? "No change" : `${s.changes} changed`}
                </p>
              </div>
            </li>
          ))}
        </ul>
        )}
      </Panel>

      {/* ---- observations, merged in from the old Signals page ---- */}
      <Panel flush className="card-enter d-3">
        <div className="px-5 pt-5">
          <PanelHead
            title="Observations"
            hint="What each scan saw, and where it came from. A single third-party listing is not treated as confirmation."
          />
        </div>
        {signalFeed.length === 0 && (
          <EmptyState
            title="Nothing observed yet"
            body="Every named tenant we check was open on the last pass. Observations appear here when one changes."
          />
        )}
        <ul className="max-h-[520px] divide-y divide-slate-100 overflow-y-auto">
          {signalFeed.slice(0, 24).map((s) => {
            const meta = SOURCE_META[s.source];
            return (
              <li key={s.id} className="flex flex-wrap items-start gap-4 px-5 py-3.5">
                <span
                  className={`mt-1 h-[14px] w-[14px] shrink-0 rounded-full border-2 ${
                    meta.tier === "primary"
                      ? "border-emerald-600 bg-emerald-50"
                      : "border-faint bg-white"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2.5">
                    <p className="text-[0.875rem] font-semibold text-slate-900">
                      {s.unitName}
                    </p>
                    <Link
                      href={`/app/locations/${s.locationId}`}
                      className="text-[0.8125rem] text-indigo-700 hover:underline"
                    >
                      {s.centerName}
                    </Link>
                    <span className="text-[0.75rem] text-slate-400">{s.city}</span>
                  </div>
                  <p className="mt-1 text-[0.8125rem] leading-relaxed text-slate-700">
                    {s.statement}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <Pill tone={meta.tier === "primary" ? "open" : "muted"}>
                    {meta.label}
                  </Pill>
                  <p className="tnum mt-1.5 text-[0.75rem] text-slate-400">
                    {prettyDate(s.observedAt)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>

      <div className="grid gap-3 lg:grid-cols-2">
        {/* ---- alerts ---- */}
        <Panel flush className="card-enter d-4">
          <div className="px-5 pt-5">
            <PanelHead title="Alerts sent" hint="What we told you, and who received it." />
          </div>
          <ul className="max-h-[480px] divide-y divide-slate-100 overflow-y-auto">
            {notifications.map((n) => {
              const sev = SEVERITY[n.severity];
              return (
                <li key={n.id} className="flex items-start gap-3 px-5 py-3.5">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
                    <Bell className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill tone={sev.tone}>{sev.label}</Pill>
                      <span className="text-[0.75rem] text-slate-400">
                        {shortDate(n.sentOn)} · {n.channel.replace("_", " ")}
                      </span>
                    </div>
                    <p className="mt-1 text-[0.8125rem] font-medium text-slate-900">
                      {n.locationId ? (
                        <Link
                          href={`/app/locations/${n.locationId}`}
                          className="hover:text-indigo-700"
                        >
                          {n.subject}
                        </Link>
                      ) : (
                        n.subject
                      )}
                    </p>
                    <p className="mt-0.5 text-[0.75rem] leading-snug text-slate-500">
                      {n.detail}
                    </p>
                    <p className="mt-0.5 text-[0.75rem] text-slate-400">
                      To {n.recipients.join(", ")}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>

        {/* ---- reports ---- */}
        <Panel flush className="card-enter d-5">
          <div className="px-5 pt-5">
            <PanelHead title="Reports" hint="Sent on schedule." />
          </div>
          <ul className="mt-4 divide-y divide-slate-100">
            {reports.map((r) => {
              const meta = REPORT_META[r.kind];
              return (
                <li key={r.id} className="flex items-start gap-3 px-5 py-3.5">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-700">
                    <FileBarChart className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.875rem] font-medium text-slate-900">
                      {meta.label}
                      <span className="ml-2 font-normal text-slate-500">{r.period}</span>
                    </p>
                    <p className="text-[0.75rem] text-slate-500">
                      Sent {shortDate(r.generatedOn)} to {r.recipients.join(", ")}
                    </p>
                  </div>
                  <LinkButton href="/app/report" className="shrink-0">
                    Open the report
                  </LinkButton>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

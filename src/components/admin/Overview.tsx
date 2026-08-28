"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Inbox,
  MapPinOff,
  MessageSquareDot,
  Radar,
  Link2Off,
  Zap,
  ClipboardList,
  ShieldQuestion,
} from "lucide-react";
import { PageHeader } from "@/components/admin/Shell";
import {
  Badge,
  BarSpark,
  Card,
  IconChip,
  Monogram,
  ProgressBar,
  Rise,
  StatCard,
  type BadgeTone,
} from "@/components/admin/ui";
import { useConsole, KIND_LABEL } from "@/components/admin/useConsole";

/**
 * The Overview: the whole company on one screen, leading with the
 * number the business exists for — locations under watch — backed by
 * the twelve-week scan record, the last pass's actual work, and the
 * gaps that are today's to-do list. Every figure is real and every
 * tile deep-links to the page where the work happens.
 */

export type WeekBar = { ranOn: string; checked: number; changes: number };

const STATUS_TONE: Record<string, BadgeTone> = {
  live: "emerald",
  onboarding: "amber",
  paused: "slate",
};

const KIND_ICON: Record<string, React.ReactNode> = {
  manual_scan: <Radar className="h-4 w-4" />,
  closure_report: <ClipboardList className="h-4 w-4" />,
  estoppel_review: <ShieldQuestion className="h-4 w-4" />,
};

export function Overview({
  weeks,
  lastSweep,
}: {
  weeks: WeekBar[];
  lastSweep: { ranOn: string; checked: number; changes: number; findings: number };
}) {
  const { data } = useConsole();

  if (!data) {
    return <p className="py-16 text-center text-[0.8125rem] text-slate-400">Loading the console.</p>;
  }

  const totalLocations = data.orgs.reduce((n, o) => n + (o.locations ?? 0), 0);
  const totalCenters = data.orgs.reduce((n, o) => n + (o.centers ?? 0), 0);
  const openRequests = data.orgs.reduce((n, o) => n + o.open_requests, 0);
  const waiting = data.submissions.filter((s) => !s.processed_at).length;
  const placeByOrg = new Map(
    data.coverage.withPlaceByOrg.map((r) => [r.org_slug, Number(r.with_place)]),
  );
  const withPlace = [...placeByOrg.values()].reduce((n, v) => n + v, 0);
  const missingPlace = Math.max(0, totalLocations - withPlace);
  const missingDirectory = Math.max(
    0,
    totalCenters - data.coverage.centersWithDirectory,
  );
  const liveClients = data.orgs.filter((o) => o.status === "live").length;
  const quarterChanges = weeks.reduce((n, w) => n + w.changes, 0);

  const attention: { label: string; href: string; count: number; icon: React.ReactNode }[] = [
    { label: "client requests waiting for a person", href: "/admin/requests", count: openRequests, icon: <MessageSquareDot className="h-4 w-4" /> },
    { label: "onboarding submissions to set up", href: "/admin/onboarding", count: waiting, icon: <Inbox className="h-4 w-4" /> },
    { label: "storefronts still missing a Places id", href: "/admin/clients", count: missingPlace, icon: <MapPinOff className="h-4 w-4" /> },
    { label: "centers with no directory link for the scan to read", href: "/admin/clients", count: missingDirectory, icon: <Link2Off className="h-4 w-4" /> },
  ].filter((a) => a.count > 0);

  const recent = data.requestsAll.slice(0, 6);

  const sweepDate = new Date(lastSweep.ranOn + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        blurb="The whole company. Numbers link to the page where the work happens."
        aside={
          <Badge tone="emerald" dot>
            Monitoring active
          </Badge>
        }
      />

      {/* ---- hero: the number, backed by the scan record ---- */}
      <Rise>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-indigo-700 to-indigo-800 p-8 shadow-xl shadow-indigo-500/25">
          <div className="relative grid gap-8 lg:grid-cols-[1fr_20rem]">
            <div>
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="mb-1 text-sm font-medium text-indigo-100">
                    Locations under watch
                  </p>
                  <div className="flex flex-wrap items-baseline gap-3">
                    <span className="tnum text-6xl font-bold tracking-tight text-white">
                      {totalLocations}
                    </span>
                    <span className="flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-sm font-medium text-white">
                      <ArrowUpRight className="h-4 w-4" />
                      {liveClients} live client{liveClients === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                  <Radar className="h-7 w-7 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-white/20 pt-6 sm:grid-cols-4">
                {(
                  [
                    ["Clients", data.orgs.length],
                    ["Centers", totalCenters],
                    ["Open requests", openRequests],
                    ["Changes, 12 weeks", quarterChanges],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k}>
                    <p className="tnum text-2xl font-bold text-white">{v}</p>
                    <p className="text-[0.75rem] font-medium text-indigo-200">{k}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* the twelve-week record, drawn from the real sweeps */}
            <div className="hidden flex-col justify-end rounded-2xl bg-white/10 p-5 backdrop-blur-sm lg:flex">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[0.75rem] font-semibold text-indigo-100">
                  Twelve weeks of scans
                </p>
                <p className="text-[0.6875rem] text-indigo-200">
                  amber&nbsp;=&nbsp;changes found
                </p>
              </div>
              <BarSpark
                data={weeks.map((w) => ({
                  v: w.checked,
                  hot: w.changes > 0,
                  label: `${w.ranOn} · ${w.checked} checked · ${w.changes} changes`,
                }))}
              />
            </div>
          </div>
        </div>
      </Rise>

      {/* ---- what the last pass actually did ---- */}
      <Rise delay={80}>
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-2">
            <IconChip color="amber" size="sm">
              <Zap className="h-4 w-4" />
            </IconChip>
            <span className="text-[0.8125rem] font-semibold text-slate-700">
              Last sweep · {sweepDate}
            </span>
          </span>
          <div className="flex flex-wrap gap-2">
            {(
              [
                [lastSweep.checked, "stores checked"],
                [lastSweep.changes, "changes"],
                [lastSweep.findings, "findings advanced"],
              ] as const
            ).map(([v, k]) => (
              <span
                key={k}
                className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[0.75rem] text-slate-600 shadow-sm"
              >
                <span className="tnum font-bold text-slate-900">{v}</span> {k}
              </span>
            ))}
          </div>
        </div>
      </Rise>

      {/* ---- the gaps, as cards ---- */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Open requests"
          value={openRequests}
          sub="Filed from client workspaces"
          icon={<MessageSquareDot className="h-5 w-5" />}
          color="indigo"
          hot={openRequests > 0}
          delay={100}
        />
        <StatCard
          label="Submissions waiting"
          value={waiting}
          sub="Onboarding work orders"
          icon={<Inbox className="h-5 w-5" />}
          color="sky"
          hot={waiting > 0}
          delay={150}
        />
        <StatCard
          label="Missing Places ids"
          value={missingPlace}
          sub="Storefronts the scan can't ping"
          icon={<MapPinOff className="h-5 w-5" />}
          color="violet"
          hot={missingPlace > 0}
          delay={200}
        />
        <StatCard
          label="Missing directory links"
          value={missingDirectory}
          sub="Centers with nowhere to look"
          icon={<Link2Off className="h-5 w-5" />}
          color="emerald"
          hot={missingDirectory > 0}
          delay={250}
        />
      </div>

      {/* ---- needs attention ---- */}
      {attention.length > 0 && (
        <Rise delay={300}>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <IconChip color="amber" size="lg" className="shrink-0 bg-amber-100">
                <Zap className="h-6 w-6" />
              </IconChip>
              <div className="min-w-0 flex-1">
                <p className="text-[0.9375rem] font-semibold text-slate-900">
                  Needs attention
                </p>
                <p className="mt-0.5 text-[0.8125rem] text-slate-600">
                  What stands between here and full coverage.
                </p>
                <div className="mt-3 grid gap-2 lg:grid-cols-2">
                  {attention.map((a) => (
                    <Link
                      key={a.label}
                      href={a.href}
                      className="flex items-center justify-between gap-3 rounded-xl border border-amber-100 bg-white px-4 py-3 transition-all hover:border-amber-200 hover:shadow-md"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                          {a.icon}
                        </span>
                        <span className="text-[0.8125rem] text-slate-700">
                          <span className="tnum font-bold text-slate-900">{a.count}</span>{" "}
                          {a.label}
                        </span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-amber-500" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Rise>
      )}

      {/* ---- clients with setup coverage + the live request feed ---- */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Rise delay={350} className="lg:col-span-2">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-[0.9375rem] font-semibold text-slate-900">Clients</h2>
              <Link
                href="/admin/clients"
                className="text-[0.75rem] font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Open the registry →
              </Link>
            </div>
            <ul className="divide-y divide-slate-100">
              {data.orgs.map((o) => {
                const placeDone = placeByOrg.get(o.slug) ?? 0;
                return (
                  <li key={o.slug}>
                    <Link
                      href={`/admin/clients/${o.slug}`}
                      className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-slate-50"
                    >
                      <Monogram name={o.name} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-[0.8125rem] font-semibold text-slate-900">
                            {o.name}
                          </span>
                          <Badge tone={STATUS_TONE[o.status]} dot>
                            {o.status}
                          </Badge>
                          {o.open_requests > 0 && (
                            <Badge tone="rose" dot>
                              {o.open_requests} open
                            </Badge>
                          )}
                        </span>
                        {o.locations !== null ? (
                          <span className="mt-1.5 flex items-center gap-3">
                            <ProgressBar
                              value={o.locations ? placeDone / o.locations : 0}
                              className="max-w-48"
                            />
                            <span className="tnum whitespace-nowrap text-[0.6875rem] text-slate-400">
                              {placeDone}/{o.locations} storefronts wired
                            </span>
                          </span>
                        ) : (
                          <span className="mt-1 block text-[0.6875rem] text-slate-400">
                            Awaiting portfolio import
                          </span>
                        )}
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        </Rise>

        <Rise delay={400}>
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-[0.9375rem] font-semibold text-slate-900">
                Latest requests
              </h2>
              <Link
                href="/admin/requests"
                className="text-[0.75rem] font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Work the queue →
              </Link>
            </div>
            {recent.length === 0 ? (
              <p className="px-6 py-10 text-center text-[0.8125rem] text-slate-400">
                Nothing filed yet. Client requests land here the moment they
                are made.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recent.map((r) => (
                  <li key={r.id} className="flex items-start gap-3 px-6 py-3.5">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        r.handled_at
                          ? "bg-slate-100 text-slate-400"
                          : "bg-indigo-50 text-indigo-600"
                      }`}
                    >
                      {KIND_ICON[r.kind] ?? <MessageSquareDot className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.8125rem] font-medium text-slate-800">
                        {KIND_LABEL[r.kind] ?? r.kind}
                        {r.center_name ? ` · ${r.center_name}` : ""}
                      </span>
                      <span className="block text-[0.6875rem] text-slate-400">
                        {r.org_name ?? r.org_slug} ·{" "}
                        {new Date(r.created_at).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </span>
                    <Badge tone={r.handled_at ? "emerald" : "amber"} dot>
                      {r.handled_at ? "Handled" : "Open"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </Rise>
      </div>
    </div>
  );
}

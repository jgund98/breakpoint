"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  Inbox,
  MapPinOff,
  MessageSquareDot,
  Radar,
  Link2Off,
} from "lucide-react";
import { PageHeader } from "@/components/admin/Shell";
import {
  Badge,
  Card,
  Rise,
  StatCard,
  IconChip,
  type BadgeTone,
} from "@/components/admin/ui";
import { useConsole, KIND_LABEL } from "@/components/admin/useConsole";

/**
 * The Overview: the whole company at a glance, leading with the number
 * the business exists for — locations under watch — then the gaps that
 * are today's work. Every tile deep-links to the page where the work
 * happens.
 */

const STATUS_TONE: Record<string, BadgeTone> = {
  live: "emerald",
  onboarding: "amber",
  paused: "slate",
};

export function Overview() {
  const { data } = useConsole();

  if (!data) {
    return <p className="py-16 text-center text-[0.8125rem] text-slate-400">Loading the console.</p>;
  }

  const totalLocations = data.orgs.reduce((n, o) => n + (o.locations ?? 0), 0);
  const totalCenters = data.orgs.reduce((n, o) => n + (o.centers ?? 0), 0);
  const openRequests = data.orgs.reduce((n, o) => n + o.open_requests, 0);
  const waiting = data.submissions.filter((s) => !s.processed_at).length;
  const withPlace = data.coverage.withPlaceByOrg.reduce(
    (n, r) => n + Number(r.with_place),
    0,
  );
  const missingPlace = Math.max(0, totalLocations - withPlace);
  const missingDirectory = Math.max(
    0,
    totalCenters - data.coverage.centersWithDirectory,
  );
  const liveClients = data.orgs.filter((o) => o.status === "live").length;

  const attention: { label: string; href: string; count: number }[] = [
    { label: "client requests waiting for a person", href: "/admin/requests", count: openRequests },
    { label: "onboarding submissions to set up", href: "/admin/onboarding", count: waiting },
    { label: "storefronts still missing a Places id", href: "/admin/clients", count: missingPlace },
    { label: "centers with no directory link for the scan to read", href: "/admin/clients", count: missingDirectory },
  ].filter((a) => a.count > 0);

  const recent = data.requestsAll.slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        blurb="The whole company. Numbers link to the page where the work happens."
      />

      {/* ---- hero: the number the business exists for ---- */}
      <Rise>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-8 shadow-xl shadow-indigo-500/25">
          <div className="absolute right-0 top-0 h-[400px] w-[400px] -translate-y-1/2 translate-x-1/3 rounded-full bg-gradient-to-br from-white/20 to-transparent blur-3xl" />
          <div className="absolute bottom-0 left-0 h-64 w-64 -translate-x-1/4 translate-y-1/2 rounded-full bg-gradient-to-tr from-violet-400/30 to-transparent blur-3xl" />
          <div className="relative">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <p className="mb-1 text-sm font-medium text-indigo-100">
                  Locations under watch
                </p>
                <div className="flex items-baseline gap-3">
                  <span className="tnum text-6xl font-bold tracking-tight text-white">
                    {totalLocations}
                  </span>
                  <span className="flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-sm font-medium text-white">
                    <ArrowUpRight className="h-4 w-4" />
                    {liveClients} live client{liveClients === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                <Radar className="h-7 w-7 text-white" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 border-t border-white/20 pt-6">
              {[
                ["Clients", data.orgs.length],
                ["Centers", totalCenters],
                ["Open requests", openRequests],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="tnum text-2xl font-bold text-white">{v}</p>
                  <p className="text-[0.75rem] font-medium text-indigo-200">{k}</p>
                </div>
              ))}
            </div>
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
          delay={50}
        />
        <StatCard
          label="Submissions waiting"
          value={waiting}
          sub="Onboarding work orders"
          icon={<Inbox className="h-5 w-5" />}
          color="sky"
          hot={waiting > 0}
          delay={100}
        />
        <StatCard
          label="Missing Places ids"
          value={missingPlace}
          sub="Storefronts the scan can't ping"
          icon={<MapPinOff className="h-5 w-5" />}
          color="violet"
          hot={missingPlace > 0}
          delay={150}
        />
        <StatCard
          label="Missing directory links"
          value={missingDirectory}
          sub="Centers with nowhere to look"
          icon={<Link2Off className="h-5 w-5" />}
          color="emerald"
          hot={missingDirectory > 0}
          delay={200}
        />
      </div>

      {/* ---- needs attention ---- */}
      {attention.length > 0 && (
        <Rise delay={250}>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <IconChip color="amber" size="lg" className="bg-amber-100 shrink-0">
                <Radar className="h-6 w-6" />
              </IconChip>
              <div className="min-w-0 flex-1">
                <p className="text-[0.9375rem] font-semibold text-slate-900">
                  Needs attention
                </p>
                <p className="mt-0.5 text-[0.8125rem] text-slate-600">
                  What stands between here and full coverage.
                </p>
                <div className="mt-3 space-y-2">
                  {attention.map((a) => (
                    <Link
                      key={a.label}
                      href={a.href}
                      className="flex items-center justify-between rounded-xl border border-amber-100 bg-white px-4 py-3 transition-all hover:border-amber-200 hover:shadow-md"
                    >
                      <span className="text-[0.8125rem] text-slate-700">
                        <span className="tnum font-bold text-slate-900">{a.count}</span>{" "}
                        {a.label}
                      </span>
                      <ArrowRight className="h-4 w-4 text-amber-500" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Rise>
      )}

      {/* ---- clients + latest requests ---- */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Rise delay={300}>
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-[0.9375rem] font-semibold text-slate-900">Clients</h2>
              <Link
                href="/admin/clients"
                className="text-[0.75rem] font-medium text-indigo-600 hover:text-indigo-800"
              >
                Open the registry →
              </Link>
            </div>
            <ul className="divide-y divide-slate-100">
              {data.orgs.map((o) => (
                <li key={o.slug}>
                  <Link
                    href={`/admin/clients/${o.slug}`}
                    className="flex items-center justify-between gap-3 px-6 py-3.5 transition-colors hover:bg-slate-50"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <IconChip color="indigo" size="sm">
                        <Building2 className="h-4 w-4" />
                      </IconChip>
                      <span className="min-w-0">
                        <span className="block truncate text-[0.8125rem] font-semibold text-slate-900">
                          {o.name}
                        </span>
                        <span className="block text-[0.6875rem] text-slate-400">
                          {o.locations !== null
                            ? `${o.locations} locations · ${o.centers} centers`
                            : "awaiting portfolio import"}
                        </span>
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {o.open_requests > 0 && (
                        <Badge tone="amber" dot>
                          {o.open_requests} open
                        </Badge>
                      )}
                      <Badge tone={STATUS_TONE[o.status]} dot>
                        {o.status}
                      </Badge>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </Rise>

        <Rise delay={350}>
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-[0.9375rem] font-semibold text-slate-900">
                Latest requests
              </h2>
              <Link
                href="/admin/requests"
                className="text-[0.75rem] font-medium text-indigo-600 hover:text-indigo-800"
              >
                Work the queue →
              </Link>
            </div>
            {recent.length === 0 ? (
              <p className="px-6 py-8 text-center text-[0.8125rem] text-slate-400">
                Nothing filed yet. Client requests land here the moment they
                are made.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recent.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-3 px-6 py-3.5"
                  >
                    <span className="min-w-0">
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

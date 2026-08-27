"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/cn";
import { ActionButton, Pill, type Tone } from "@/components/app/ui";
import { Section, StatStrip, StatTile, SearchInput } from "@/components/admin/ui";
import { DirectiveEditor, type Directive } from "@/components/admin/Directives";

/**
 * BREAKPOINT HQ — the whole company on one screen.
 *
 * The client registry (searchable, sortable — ten clients or a
 * hundred), the onboarding pipeline (a submission is promoted into a
 * client account from here), and the system-wide agent canon. Anything
 * scoped to one client lives on that client's board, one level down.
 */

type OrgRow = {
  slug: string;
  name: string;
  status: "onboarding" | "live" | "paused";
  descriptor: string | null;
  created_at: string;
  open_requests: number;
  locations: number | null;
  centers: number | null;
};

type Submission = {
  id: string;
  org_slug: string;
  client_name: string;
  store_estimate: number | null;
  row_count: number | null;
  submitted_at: string;
  processed_at: string | null;
  org_exists: boolean;
};

const STATUS_TONE: Record<OrgRow["status"], Tone> = {
  live: "open",
  onboarding: "watch",
  paused: "muted",
};

type SortKey = "name" | "status" | "locations" | "open_requests" | "created_at";

export function HQBoard() {
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [directives, setDirectives] = useState<Directive[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({
    key: "name",
    dir: 1,
  });

  const load = useCallback(async () => {
    const res = await fetch("/admin/api", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setOrgs(data.orgs ?? []);
    setSubmissions(data.submissions ?? []);
    setDirectives(data.directives ?? []);
    setLoaded(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const post = useCallback(
    async (payload: Record<string, unknown>) => {
      const res = await fetch("/admin/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) await load();
      return res.ok;
    },
    [load],
  );

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? orgs.filter(
          (o) =>
            o.name.toLowerCase().includes(q) || o.slug.toLowerCase().includes(q),
        )
      : orgs;
    const val = (o: OrgRow) =>
      sort.key === "locations"
        ? (o.locations ?? -1)
        : sort.key === "open_requests"
          ? o.open_requests
          : o[sort.key];
    return [...filtered].sort((a, b) => {
      const av = val(a);
      const bv = val(b);
      return (av < bv ? -1 : av > bv ? 1 : 0) * sort.dir;
    });
  }, [orgs, query, sort]);

  const totals = useMemo(
    () => ({
      clients: orgs.length,
      locations: orgs.reduce((n, o) => n + (o.locations ?? 0), 0),
      openRequests: orgs.reduce((n, o) => n + o.open_requests, 0),
      waiting: submissions.filter((s) => !s.processed_at).length,
    }),
    [orgs, submissions],
  );

  const sortBy = (key: SortKey) =>
    setSort((s) => ({ key, dir: s.key === key ? ((s.dir * -1) as 1 | -1) : 1 }));

  if (!loaded) {
    return <p className="px-6 py-10 text-[0.8125rem] text-muted">Loading.</p>;
  }

  const HEADERS: { key: SortKey | null; label: string; right?: boolean }[] = [
    { key: "name", label: "Client" },
    { key: "status", label: "Status" },
    { key: "locations", label: "Locations", right: true },
    { key: "open_requests", label: "Open requests", right: true },
    { key: "created_at", label: "Since" },
    { key: null, label: "" },
  ];

  return (
    <div className="mx-auto max-w-[80rem] space-y-5 px-6 py-6">
      <StatStrip>
        <StatTile label="Clients" value={totals.clients} />
        <StatTile label="Locations under watch" value={totals.locations} />
        <StatTile
          label="Open requests"
          value={totals.openRequests}
          hot={totals.openRequests > 0}
        />
        <StatTile
          label="Submissions waiting"
          value={totals.waiting}
          hot={totals.waiting > 0}
        />
      </StatStrip>

      {/* ---- the registry ---- */}
      <Section
        title="Clients"
        blurb="Each client has its own board: schedule, locations, sources, requests."
        flush
        aside={
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Find a client…"
          />
        }
      >
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-surface-sunk/50">
              {HEADERS.map((h) => (
                <th
                  key={h.label || "arrow"}
                  className={cn(
                    "label px-5 py-2 font-semibold text-faint",
                    h.right && "text-right",
                  )}
                >
                  {h.key ? (
                    <button
                      type="button"
                      onClick={() => sortBy(h.key as SortKey)}
                      className="inline-flex items-center gap-1 hover:text-ink"
                    >
                      {h.label}
                      {sort.key === h.key &&
                        (sort.dir === 1 ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        ))}
                    </button>
                  ) : (
                    h.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {shown.map((o) => (
              <tr key={o.slug} className="group relative hover:bg-surface-sunk/60">
                <td className="px-5 py-3">
                  <Link
                    href={`/admin/clients/${o.slug}`}
                    className="text-[0.8125rem] font-semibold text-ink after:absolute after:inset-0"
                  >
                    {o.name}
                  </Link>
                  <p className="text-[0.6875rem] text-muted">
                    {o.descriptor ?? o.slug}
                  </p>
                </td>
                <td className="px-5 py-3">
                  <Pill tone={STATUS_TONE[o.status]} dot>
                    {o.status}
                  </Pill>
                </td>
                <td className="tnum px-5 py-3 text-right text-[0.8125rem] text-ink-soft">
                  {o.locations !== null
                    ? o.locations
                    : "awaiting import"}
                </td>
                <td
                  className={cn(
                    "tnum px-5 py-3 text-right text-[0.8125rem]",
                    o.open_requests > 0
                      ? "font-semibold text-brass-700"
                      : "text-ink-soft",
                  )}
                >
                  {o.open_requests}
                </td>
                <td className="px-5 py-3 text-[0.75rem] text-muted">
                  {new Date(o.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="px-5 py-3 text-right">
                  <ArrowRight className="ml-auto h-3.5 w-3.5 text-faint transition-colors group-hover:text-petrol-700" />
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td
                  colSpan={HEADERS.length}
                  className="px-5 py-5 text-[0.8125rem] text-muted"
                >
                  No clients match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Section>

      {/* ---- the onboarding pipeline ---- */}
      <Section
        title="Onboarding submissions"
        blurb="A submission is the work order a new account is set up from. Creating the account gives the client a board."
        flush
      >
        {submissions.length === 0 ? (
          <p className="px-5 py-4 text-[0.8125rem] text-muted">
            Nothing waiting. New submissions land here when a client sends
            their onboarding console to us.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {submissions.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
              >
                <div className="min-w-0">
                  <p className="text-[0.8125rem] font-medium text-ink">
                    {s.client_name}
                  </p>
                  <p className="text-[0.6875rem] text-muted">
                    {s.row_count ?? 0} roster rows
                    {s.store_estimate ? ` of ${s.store_estimate} expected` : ""}
                    {" · "}
                    {new Date(s.submitted_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <span className="flex items-center gap-2">
                  {!s.org_exists ? (
                    <ActionButton
                      variant="secondary"
                      onClick={() =>
                        void post({ action: "org_create", submissionId: s.id })
                      }
                    >
                      Create the account
                    </ActionButton>
                  ) : s.processed_at ? (
                    <Pill tone={"open" as Tone} dot>
                      Set up
                    </Pill>
                  ) : (
                    <ActionButton
                      variant="secondary"
                      onClick={() =>
                        void post({ action: "submission_processed", id: s.id })
                      }
                    >
                      Mark set up
                    </ActionButton>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* ---- the system-wide canon ---- */}
      <DirectiveEditor
        title="Agent programming · Breakpoint-wide"
        blurb="The system canon. These rules reach every extraction and scan run for every client."
        scope="global"
        directives={directives}
        onPost={post}
      />

      <p className="text-[0.6875rem] text-faint">
        Internal. Changes persist to the account database and reach the
        agent without a deploy.
      </p>
    </div>
  );
}

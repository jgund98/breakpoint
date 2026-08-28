"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  MapPin,
  Plus,
  Radio,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/admin/Shell";
import {
  Badge,
  Btn,
  Card,
  IconChip,
  Monogram,
  ProgressBar,
  Rise,
  SearchInput,
  StatCard,
  Th,
  inputCls,
  type BadgeTone,
} from "@/components/admin/ui";
import {
  useConsole,
  inviteLink,
  type OrgRow,
} from "@/components/admin/useConsole";
import { sanitizeSlug } from "@/lib/slug";

/**
 * The client registry. Searchable and sortable — ten clients or a
 * hundred — and the place a new company is created and invited: the
 * onboarding console link is minted here and sent to the client, which
 * IS the invite (clients have no accounts until magic-link auth lands).
 */

const STATUS_TONE: Record<string, BadgeTone> = {
  live: "emerald",
  onboarding: "amber",
  paused: "slate",
};

type SortKey = "name" | "status" | "locations" | "open_requests" | "created_at";

export function ClientsTable() {
  const { data, post } = useConsole();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({
    key: "name",
    dir: 1,
  });
  const [creating, setCreating] = useState(false);

  /* The topbar's "New client" lands here with ?new=1. */
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("new=1"))
      setCreating(true);
  }, []);

  const placeByOrg = useMemo(
    () =>
      new Map(
        (data?.coverage.withPlaceByOrg ?? []).map((r) => [
          r.org_slug,
          Number(r.with_place),
        ]),
      ),
    [data],
  );

  const shown = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    const filtered = q
      ? data.orgs.filter(
          (o) =>
            o.name.toLowerCase().includes(q) || o.slug.toLowerCase().includes(q),
        )
      : data.orgs;
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
  }, [data, query, sort]);

  const sortBy = (key: SortKey) =>
    setSort((s) => ({ key, dir: s.key === key ? ((s.dir * -1) as 1 | -1) : 1 }));

  if (!data) {
    return <p className="py-16 text-center text-[0.8125rem] text-slate-400">Loading.</p>;
  }

  const HEADERS: { key: SortKey | null; label: string; right?: boolean }[] = [
    { key: "name", label: "Client" },
    { key: "status", label: "Status" },
    { key: "locations", label: "Locations", right: true },
    { key: null, label: "Setup" },
    { key: "open_requests", label: "Open requests", right: true },
    { key: "created_at", label: "Since" },
    { key: null, label: "" },
  ];

  const totalLocations = data.orgs.reduce((n, o) => n + (o.locations ?? 0), 0);
  const live = data.orgs.filter((o) => o.status === "live").length;
  const onboarding = data.orgs.filter((o) => o.status === "onboarding").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        blurb="Every client, each with its own board: schedule, locations, sources, papers, requests."
        aside={
          <Btn onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> New client
          </Btn>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Clients"
          value={data.orgs.length}
          sub="Under management"
          icon={<Building2 className="h-5 w-5" />}
          color="indigo"
          delay={0}
        />
        <StatCard
          label="Live"
          value={live}
          sub="Monitored on schedule"
          icon={<Radio className="h-5 w-5" />}
          color="emerald"
          delay={50}
        />
        <StatCard
          label="Onboarding"
          value={onboarding}
          sub="Boards in setup state"
          icon={<Plus className="h-5 w-5" />}
          color="amber"
          delay={100}
        />
        <StatCard
          label="Locations"
          value={totalLocations}
          sub="Across every portfolio"
          icon={<MapPin className="h-5 w-5" />}
          color="violet"
          delay={150}
        />
      </div>

      {creating && (
        <NewClientPanel
          onClose={() => setCreating(false)}
          onCreate={async (payload) => post({ action: "org_create_manual", ...payload })}
        />
      )}

      <Rise>
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
            <h2 className="text-[0.9375rem] font-semibold text-slate-900">
              Registry
            </h2>
            <SearchInput value={query} onChange={setQuery} placeholder="Find a client…" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  {HEADERS.map((h) => (
                    <Th key={h.label || "arrow"} className={h.right ? "text-right" : undefined}>
                      {h.key ? (
                        <button
                          type="button"
                          onClick={() => sortBy(h.key as SortKey)}
                          className="inline-flex items-center gap-1 hover:text-slate-700"
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
                    </Th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shown.map((o) => (
                  <tr key={o.slug} className="group relative transition-colors hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-3">
                        <Monogram name={o.name} />
                        <span>
                          <Link
                            href={`/admin/clients/${o.slug}`}
                            className="text-[0.8125rem] font-semibold text-slate-900 after:absolute after:inset-0"
                          >
                            {o.name}
                          </Link>
                          <span className="block text-[0.6875rem] text-slate-400">
                            {o.descriptor ?? o.slug}
                            {o.account_manager ? ` · ${o.account_manager}` : ""}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge tone={STATUS_TONE[o.status]} dot>
                        {o.status}
                      </Badge>
                    </td>
                    <td className="tnum px-6 py-4 text-right text-[0.8125rem] text-slate-700">
                      {o.locations !== null ? o.locations : (
                        <span className="text-[0.75rem] text-slate-400">awaiting import</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {o.locations ? (
                        <span className="flex items-center gap-2">
                          <ProgressBar
                            value={(placeByOrg.get(o.slug) ?? 0) / o.locations}
                            className="w-24"
                          />
                          <span className="tnum whitespace-nowrap text-[0.6875rem] text-slate-400">
                            {placeByOrg.get(o.slug) ?? 0}/{o.locations}
                          </span>
                        </span>
                      ) : (
                        <span className="text-[0.6875rem] text-slate-300">—</span>
                      )}
                    </td>
                    <td
                      className={cn(
                        "tnum px-6 py-4 text-right text-[0.8125rem]",
                        o.open_requests > 0
                          ? "font-bold text-amber-600"
                          : "text-slate-700",
                      )}
                    >
                      {o.open_requests}
                    </td>
                    <td className="px-6 py-4 text-[0.75rem] text-slate-500">
                      {new Date(o.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <ArrowRight className="ml-auto h-4 w-4 text-slate-300 transition-colors group-hover:text-indigo-500" />
                    </td>
                  </tr>
                ))}
                {shown.length === 0 && (
                  <tr>
                    <td colSpan={HEADERS.length} className="px-6 py-8 text-center text-[0.8125rem] text-slate-400">
                      No clients match.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </Rise>
    </div>
  );
}

/* ------------------------------------------------------------------
   creating and inviting a company
   ------------------------------------------------------------------ */

function NewClientPanel({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (payload: {
    name: string;
    slug: string;
    descriptor: string;
  }) => Promise<{ ok: boolean; data: { error?: string } | null }>;
}) {
  const [name, setName] = useState("");
  const [descriptor, setDescriptor] = useState("");
  const [stores, setStores] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const slug = sanitizeSlug(name);
  const link = name ? inviteLink(name.trim(), Number(stores) || null) : "";

  const create = async () => {
    setError(null);
    const res = await onCreate({ name: name.trim(), slug, descriptor: descriptor.trim() });
    if (res.ok) setCreatedSlug(slug);
    else setError(res.data?.error ?? "That did not go through.");
  };

  return (
    <Rise>
      <Card className="overflow-hidden border-indigo-100">
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-indigo-50/60 to-white px-6 py-4">
          <div>
            <h2 className="text-[0.9375rem] font-semibold text-slate-900">
              New client
            </h2>
            <p className="mt-0.5 text-[0.8125rem] text-slate-500">
              Create the account, then send the onboarding console link — that
              link is the invite.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!createdSlug ? (
          <div className="space-y-4 px-6 py-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-[0.75rem] font-medium text-slate-600">
                  Company name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Abercrombie & Fitch"
                  className={cn(inputCls, "w-full")}
                />
                {slug && (
                  <p className="mt-1 text-[0.6875rem] text-slate-400">
                    Board address: /admin/clients/<span className="font-mono">{slug}</span>
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-[0.75rem] font-medium text-slate-600">
                  Stores, roughly
                </label>
                <input
                  value={stores}
                  onChange={(e) => setStores(e.target.value.replace(/\D/g, ""))}
                  placeholder="800"
                  className={cn(inputCls, "w-full")}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[0.75rem] font-medium text-slate-600">
                One-line descriptor
              </label>
              <input
                value={descriptor}
                onChange={(e) => setDescriptor(e.target.value)}
                placeholder="Specialty apparel"
                className={cn(inputCls, "w-full")}
              />
            </div>
            <div className="flex items-center gap-3">
              <Btn disabled={!name.trim()} onClick={() => void create()}>
                Create the account
              </Btn>
              {error && <span className="text-[0.75rem] text-rose-600">{error}</span>}
            </div>
          </div>
        ) : (
          <div className="space-y-4 px-6 py-5">
            <div className="flex items-center gap-3">
              <IconChip color="emerald">
                <Check className="h-5 w-5" />
              </IconChip>
              <div>
                <p className="text-[0.875rem] font-semibold text-slate-900">
                  {name} is on the registry.
                </p>
                <p className="text-[0.75rem] text-slate-500">
                  Their board is live in setup state. Send them their console:
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <code className="min-w-0 flex-1 truncate font-mono text-[0.75rem] text-slate-700">
                {link}
              </code>
              <Btn
                variant="secondary"
                onClick={() => {
                  void navigator.clipboard.writeText(link);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1600);
                }}
              >
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy link"}
              </Btn>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/admin/clients/${createdSlug}`}
                className="inline-flex h-10 items-center rounded-xl bg-indigo-600 px-4 text-[0.8125rem] font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-500 active:scale-95"
              >
                Open their board <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
              <Btn variant="secondary" onClick={onClose}>
                Done
              </Btn>
            </div>
          </div>
        )}
      </Card>
    </Rise>
  );
}

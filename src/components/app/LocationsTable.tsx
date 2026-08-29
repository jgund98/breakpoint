"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { cn } from "@/lib/cn";
import { Segmented } from "@/components/admin/ui";
import { EmptyState, Pill, type Tone } from "./ui";

export type TableRow = {
  id: string;
  storeNumber: string;
  centerName: string;
  city: string;
  state: string;
  region: string;
  stateKey: string;
  stateLabel: string;
  stateTone: Tone;
  failing: string;
  monthly: string | null;
  evidence: string;
  evidenceTone: Tone;
  clockDays: number | null;
  clockLabel: string | null;
};

const VIEWS = [
  { id: "all", label: "All locations" },
  { id: "decision", label: "Triggered" },
  { id: "watch", label: "Watch and clock running" },
  { id: "running", label: "Remedy running" },
] as const;

/** States that rest on client-reported facts rather than our scans. */
const REPORTED = new Set(["remedy_active", "election_open", "lapsed"]);

type SortKey = "monthly" | "center" | "clock";

export function LocationsTable({ rows }: { rows: TableRow[] }) {
  const [view, setView] = useState<(typeof VIEWS)[number]["id"]>("all");
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("All regions");
  const [sort, setSort] = useState<SortKey>("monthly");

  const regions = useMemo(
    () => ["All regions", ...Array.from(new Set(rows.map((r) => r.region))).sort()],
    [rows],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = rows;

    if (view === "decision")
      out = out.filter((r) => r.stateKey === "claimable" || r.stateKey === "election_open");
    if (view === "watch")
      out = out.filter((r) => r.stateKey === "watch" || r.stateKey === "curing");
    if (view === "running") out = out.filter((r) => r.stateKey === "remedy_active");

    if (region !== "All regions") out = out.filter((r) => r.region === region);

    if (needle)
      out = out.filter((r) =>
        [r.id, r.storeNumber, r.centerName, r.city, r.state]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      );

    return [...out].sort((a, b) => {
      if (sort === "center") return a.centerName.localeCompare(b.centerName);
      if (sort === "clock")
        return (a.clockDays ?? 99999) - (b.clockDays ?? 99999);
      return (a.monthly ?? "").localeCompare(b.monthly ?? "");
    });
  }, [rows, view, q, region, sort]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      decision: rows.filter(
        (r) => r.stateKey === "claimable" || r.stateKey === "election_open",
      ).length,
      watch: rows.filter((r) => r.stateKey === "watch" || r.stateKey === "curing")
        .length,
      running: rows.filter((r) => r.stateKey === "remedy_active").length,
    }),
    [rows],
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-xl shadow-slate-200/50">
      {/* ---- saved views ---- */}
      <div className="border-b border-slate-100 px-4 py-3">
        <Segmented
          className="w-fit"
          value={view}
          onChange={setView}
          options={VIEWS.map((v) => ({
            value: v.id,
            label: v.label,
            count: counts[v.id],
          }))}
        />
      </div>

      {/* ---- controls ---- */}
      <div className="flex flex-wrap items-center gap-2.5 border-b border-slate-200 px-4 py-3">
        <label className="relative flex-1 min-w-[200px]">
          <span className="sr-only">Search locations</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search store number, center or city"
            className="h-10 w-full rounded-xl border border-slate-200 bg-white shadow-sm px-3.5 text-[0.8125rem] text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 focus:outline-none"
          />
        </label>

        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="h-10 rounded-xl border border-slate-200 bg-white shadow-sm px-3 text-[0.8125rem] font-medium text-slate-700 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 focus:outline-none"
        >
          {regions.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="h-10 rounded-xl border border-slate-200 bg-white shadow-sm px-3 text-[0.8125rem] font-medium text-slate-700 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 focus:outline-none"
        >
          <option value="monthly">Sort: co-tenancy rent</option>
          <option value="clock">Sort: soonest clock</option>
          <option value="center">Sort: center name</option>
        </select>

        <span className="ml-auto text-[0.75rem] whitespace-nowrap text-slate-500">
          {filtered.length} of {rows.length}
        </span>

        <button
          type="button"
          onClick={() => {
            /* The register as their lease admin actually works: a
               spreadsheet of exactly what is filtered on screen. */
            const esc = (v: unknown) =>
              '"' + String(v ?? "").replace(/"/g, '""') + '"';
            const head = [
              "Location",
              "Store",
              "Center",
              "City",
              "State",
              "Status",
              "Failing test",
              "Evidence",
              "Clock (days)",
              "Potential per month",
            ];
            const lines = filtered.map((r) =>
              [
                r.id,
                r.storeNumber,
                r.centerName,
                r.city,
                r.state,
                r.stateLabel,
                r.failing || "None",
                r.evidence,
                r.clockDays ?? "",
                r.monthly ?? "",
              ]
                .map(esc)
                .join(","),
            );
            const blob = new Blob(
              [[head.map(esc).join(","), ...lines].join("\r\n")],
              { type: "text/csv;charset=utf-8" },
            );
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "breakpoint-locations.csv";
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-[0.8125rem] font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 active:scale-95"
        >
          <Download className="h-4 w-4" /> CSV
        </button>
      </div>

      {/* ---- table ---- */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1040px] border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              {[
                "Location",
                "Center",
                "Status",
                "Failing test",
                "Evidence",
                "Clock",
                "Co-tenancy rent",
              ].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-400">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((r) => (
              <tr
                key={r.id}
                className="group transition-colors duration-200 hover:bg-indigo-50/40"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/app/locations/${r.id}`}
                    className="text-[0.875rem] font-semibold text-indigo-800 group-hover:underline"
                  >
                    {r.id}
                  </Link>
                  <p className="text-[0.75rem] text-slate-500">Store {r.storeNumber}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-[0.875rem] text-slate-900">{r.centerName}</p>
                  <p className="text-[0.75rem] text-slate-500">
                    {r.city}, {r.state}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <Pill tone={r.stateTone} dot>
                    {r.stateLabel}
                  </Pill>
                  {/* provenance: these states rest on facts only the
                      client can supply — notice served, election made */}
                  {REPORTED.has(r.stateKey) && (
                    <p className="mt-1 text-[0.625rem] font-medium uppercase tracking-wide text-slate-400">
                      From your records
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-[0.8125rem] text-slate-700">
                  {r.failing || <span className="text-slate-400">None</span>}
                </td>
                <td className="px-4 py-3">
                  <Pill tone={r.evidenceTone}>{r.evidence}</Pill>
                </td>
                <td className="tnum px-4 py-3 text-[0.8125rem]">
                  {r.clockDays != null ? (
                    <span
                      className={cn(
                        "font-semibold",
                        r.clockDays < 30 ? "text-rose-600" : "text-slate-700",
                      )}
                    >
                      {r.clockDays}d
                      <span className="ml-1 font-normal text-slate-400">
                        {r.clockLabel}
                      </span>
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="tnum px-4 py-3 text-[0.875rem] font-semibold">
                  {r.monthly ? (
                    <span className={r.monthly.startsWith("$") ? "text-amber-600" : "text-slate-500"}>
                      {r.monthly}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* the key, exactly where the pills are: quiet, one line each */}
      {filtered.length > 0 && (
        <p className="border-t border-slate-100 px-6 py-3 text-[0.6875rem] leading-relaxed text-slate-400">
          Evidence: a Signal is one secondary source; Corroborated is two that
          agree; Verified is a primary source and can carry a notice. A state
          marked &#8220;from your records&#8221; rests on facts you supply,
          a served notice, an election, that no scan can see.
        </p>
      )}

      {rows.length === 0 && (
        <EmptyState
          title="No locations yet"
          body="Once your portfolio is loaded and the leases are read, every location with co-tenancy language appears here."
          action={{ label: "Portfolio setup", href: "/app/setup" }}
        />
      )}

      {rows.length > 0 && filtered.length === 0 && (
        <div className="px-6 py-14 text-center">
          <p className="text-[0.9375rem] font-semibold text-slate-900">
            Nothing matches that view
          </p>
          <p className="mt-1.5 text-[0.8125rem] text-slate-500">
            Try a different region, or clear the search.
          </p>
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { Pill, type Tone } from "./ui";

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
  monthly: number | null;
  evidence: string;
  evidenceTone: Tone;
  clockDays: number | null;
  clockLabel: string | null;
};

const VIEWS = [
  { id: "all", label: "All locations" },
  { id: "decision", label: "Needs a decision" },
  { id: "watch", label: "Watch and curing" },
  { id: "running", label: "Remedy running" },
] as const;

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
      return (b.monthly ?? -1) - (a.monthly ?? -1);
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
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      {/* ---- saved views ---- */}
      <div className="scroll-x-clean flex gap-1 overflow-x-auto border-b border-line px-3 pt-3">
        {VIEWS.map((v) => {
          const active = view === v.id;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => setView(v.id)}
              className={cn(
                "relative rounded-t-lg px-3.5 py-2.5 text-[0.8125rem] font-medium whitespace-nowrap transition-colors duration-250",
                active
                  ? "text-petrol-800"
                  : "text-muted hover:text-ink",
              )}
            >
              {v.label}
              <span className="ml-1.5 text-[0.75rem] text-faint">
                {counts[v.id]}
              </span>
              {active && (
                <motion.span
                  layoutId="view-underline"
                  className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-petrol-700"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ---- controls ---- */}
      <div className="flex flex-wrap items-center gap-2.5 border-b border-line px-4 py-3">
        <label className="relative flex-1 min-w-[200px]">
          <span className="sr-only">Search locations</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search store number, center or city"
            className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-[0.8125rem] text-ink placeholder:text-faint focus:border-petrol-300 focus:outline-none"
          />
        </label>

        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="rounded-lg border border-line bg-surface px-3 py-2.5 text-[0.8125rem] font-medium text-ink-soft focus:border-petrol-300 focus:outline-none"
        >
          {regions.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-lg border border-line bg-surface px-3 py-2.5 text-[0.8125rem] font-medium text-ink-soft focus:border-petrol-300 focus:outline-none"
        >
          <option value="monthly">Sort: co-tenancy rent</option>
          <option value="clock">Sort: soonest clock</option>
          <option value="center">Sort: center name</option>
        </select>

        <span className="ml-auto text-[0.75rem] whitespace-nowrap text-muted">
          {filtered.length} of {rows.length}
        </span>
      </div>

      {/* ---- table ---- */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1040px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-surface-sunk/50">
              {[
                "Location",
                "Center",
                "Status",
                "Failing test",
                "Evidence",
                "Clock",
                "Co-tenancy rent",
              ].map((h) => (
                <th key={h} className="label px-4 py-2.5 font-semibold text-faint">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.map((r) => (
              <tr
                key={r.id}
                className="group transition-colors duration-200 hover:bg-petrol-50/40"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/app/locations/${r.id}`}
                    className="text-[0.875rem] font-semibold text-petrol-800 group-hover:underline"
                  >
                    {r.id}
                  </Link>
                  <p className="text-[0.75rem] text-muted">Store {r.storeNumber}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-[0.875rem] text-ink">{r.centerName}</p>
                  <p className="text-[0.75rem] text-muted">
                    {r.city}, {r.state}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <Pill tone={r.stateTone} dot>
                    {r.stateLabel}
                  </Pill>
                </td>
                <td className="px-4 py-3 text-[0.8125rem] text-ink-soft">
                  {r.failing || <span className="text-faint">None</span>}
                </td>
                <td className="px-4 py-3">
                  <Pill tone={r.evidenceTone}>{r.evidence}</Pill>
                </td>
                <td className="tnum px-4 py-3 text-[0.8125rem]">
                  {r.clockDays != null ? (
                    <span
                      className={cn(
                        "font-semibold",
                        r.clockDays < 30 ? "text-clay-600" : "text-ink-soft",
                      )}
                    >
                      {r.clockDays}d
                      <span className="ml-1 font-normal text-faint">
                        {r.clockLabel}
                      </span>
                    </span>
                  ) : (
                    <span className="text-faint">—</span>
                  )}
                </td>
                <td className="tnum px-4 py-3 text-[0.875rem] font-semibold">
                  {r.monthly == null ? (
                    <span className="text-faint">Sales needed</span>
                  ) : r.monthly > 0 ? (
                    <span className="text-brass-600">
                      {r.monthly.toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  ) : (
                    <span className="text-faint">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="px-6 py-14 text-center">
          <p className="text-[0.9375rem] font-semibold text-ink">
            Nothing matches that view
          </p>
          <p className="mt-1.5 text-[0.8125rem] text-muted">
            Try a different region, or clear the search.
          </p>
        </div>
      )}
    </div>
  );
}

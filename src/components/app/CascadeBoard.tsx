"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { CascadeResult } from "@/lib/cascade";
import { STATE_META, compactUsd, usd } from "@/lib/clause";
import { cn } from "@/lib/cn";
import { Note, Panel, PanelHead, Pill, type Tone } from "./ui";

export function CascadeBoard({
  cascades,
}: {
  cascades: CascadeResult[];
}) {
  const [active, setActive] = useState(cascades[0]?.operator ?? "");
  const result = cascades.find((c) => c.operator === active) ?? cascades[0];

  if (!result) return null;

  return (
    <div className="space-y-4">
      {/* ---- operator picker ---- */}
      <Panel flush>
        <div className="px-5 py-4">
          <PanelHead
            title="Pick an operator"
            hint="Ranked by how many of your doors sit in a center where they trade today."
          />
        </div>
        <div className="scroll-x-clean flex gap-2 overflow-x-auto border-t border-line px-5 py-3.5">
          {cascades.map((c) => {
            const on = c.operator === active;
            return (
              <button
                key={c.operator}
                type="button"
                onClick={() => setActive(c.operator)}
                className={cn(
                  "rounded-xl border px-4 py-3 text-left transition-all duration-250",
                  on
                    ? "border-petrol-600 bg-petrol-50 ring-1 ring-petrol-600"
                    : "border-line bg-surface hover:border-petrol-300",
                )}
              >
                <p
                  className={cn(
                    "text-[0.875rem] font-semibold whitespace-nowrap",
                    on ? "text-petrol-800" : "text-ink",
                  )}
                >
                  {c.operator}
                </p>
                <p className="tnum text-[0.75rem] whitespace-nowrap text-muted">
                  {c.locationsExposed} doors · {c.centersExposed} centers
                </p>
              </button>
            );
          })}
        </div>
      </Panel>

      {/* ---- the verdict ---- */}
      <AnimatePresence mode="wait">
        <motion.div
          key={result.operator}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-4"
        >
          <div className="relative overflow-hidden rounded-2xl border border-line bg-petrol-900 p-6 sm:p-8">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-24 h-80 w-80 rounded-full"
              style={{
                background:
                  "radial-gradient(closest-side, rgba(217,154,43,0.3), transparent 72%)",
              }}
            />
            <div className="relative grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-center">
              <div>
                <p className="label text-brass-400">If this happened tomorrow</p>
                <h2 className="mt-3 text-[clamp(1.5rem,3.2vw,2.25rem)] text-cream">
                  {result.operator} goes dark nationally.
                </h2>
                <p className="mt-3 max-w-lg text-[0.9375rem] leading-relaxed text-cream-soft">
                  {result.hits.length === 0 ? (
                    <>
                      Nothing in your portfolio trips. {result.operator} is not
                      named in any of your clauses and its closure does not pull
                      any center below its occupancy floor.
                    </>
                  ) : (
                    <>
                      <strong className="text-cream">
                        {result.hits.length} location
                        {result.hits.length === 1 ? "" : "s"}
                      </strong>{" "}
                      would move into a claimable position, worth an estimated{" "}
                      <strong className="tnum text-cream">
                        {usd(Math.round(result.monthlyDelta))}
                      </strong>{" "}
                      per month while the conditions continue.
                    </>
                  )}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Cell
                  label="Wave one"
                  value={result.wave1}
                  hint="Named and count tests"
                />
                <Cell
                  label="Wave two"
                  value={result.wave2}
                  hint="Occupancy follows"
                />
                <Cell
                  label="Annual"
                  value={compactUsd(result.annualDelta)}
                  hint="Estimated relief"
                  wide
                />
                <Cell
                  label="Doors exposed"
                  value={result.locationsExposed}
                  hint={`${result.centersExposed} centers`}
                />
              </div>
            </div>
          </div>

          {result.wave2 > 0 && (
            <Note tone="brass" title="The second wave is the point">
              {result.wave1} of these fail because {result.operator} is named in
              the lease. The other {result.wave2} fail because its closure pulls
              the center below an occupancy floor in leases that never mentioned{" "}
              {result.operator} at all. Watching only the tenants you named
              misses those entirely.
            </Note>
          )}

          {/* ---- the hits ---- */}
          {result.hits.length > 0 && (
            <Panel flush>
              <div className="px-5 pt-5">
                <PanelHead
                  title="Locations that would trip"
                  hint="Wave one first, then the occupancy cascade behind it."
                />
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[860px] border-collapse text-left">
                  <thead>
                    <tr className="border-y border-line bg-surface-sunk/50">
                      {["Wave", "Location", "Center", "Becomes", "Why", "Per month"].map(
                        (h) => (
                          <th
                            key={h}
                            className="label px-4 py-2.5 font-semibold text-faint"
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {result.hits.map((h) => (
                      <tr key={h.locationId} className="hover:bg-petrol-50/40">
                        <td className="px-4 py-3">
                          <Pill tone={h.wave === 1 ? "clay" : "watch"}>
                            {h.wave === 1 ? "One" : "Two"}
                          </Pill>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/app/locations/${h.locationId}`}
                            className="text-[0.875rem] font-semibold text-petrol-800 hover:underline"
                          >
                            {h.locationId}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-[0.875rem] text-ink">{h.centerName}</p>
                          <p className="text-[0.75rem] text-muted">{h.city}</p>
                        </td>
                        <td className="px-4 py-3">
                          <Pill
                            tone={
                              STATE_META[
                                h.stateAfter as keyof typeof STATE_META
                              ].tone as Tone
                            }
                            dot
                          >
                            {
                              STATE_META[h.stateAfter as keyof typeof STATE_META]
                                .label
                            }
                          </Pill>
                        </td>
                        <td className="px-4 py-3 text-[0.8125rem] leading-snug text-ink-soft">
                          {h.reason}
                        </td>
                        <td className="tnum px-4 py-3 text-[0.875rem] font-semibold text-brass-600">
                          {h.monthlyAfter > 0
                            ? usd(Math.round(h.monthlyAfter))
                            : "Sales needed"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Cell({
  label,
  value,
  hint,
  wide,
}: {
  label: string;
  value: React.ReactNode;
  hint: string;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/12 bg-white/5 p-4",
        wide && "col-span-2",
      )}
    >
      <p className="label text-cream-faint">{label}</p>
      <p className="tnum font-display mt-1.5 text-[1.5rem] leading-none text-cream">
        {value}
      </p>
      <p className="mt-1 text-[0.75rem] text-cream-faint">{hint}</p>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import type { CellState, Matrix } from "@/lib/matrix";
import { compactUsd, prettyDate, usd } from "@/lib/clause";
import { cn } from "@/lib/cn";
import { Panel, PanelHead, Pill } from "./ui";

/**
 * THE ANCHOR EXPOSURE MATRIX
 *
 * Operators down the side, your centers across the top. Read a row for
 * concentration on one retailer, read a column for how fragile one
 * center is. Click a row to model its failure below.
 *
 * At four hundred doors this is the only way to see the shape of the
 * portfolio in one screen.
 */

const CELL: Record<
  CellState,
  { fill: string; ring: string; label: string }
> = {
  named: {
    fill: "bg-petrol-600",
    ring: "ring-petrol-700",
    label: "Named in your lease",
  },
  present: {
    fill: "bg-petrol-100",
    ring: "ring-petrol-100",
    label: "Trading, not named",
  },
  dark: { fill: "bg-clay-500", ring: "ring-clay-600", label: "Dark" },
  absent: { fill: "bg-surface-sunk", ring: "ring-line", label: "Not present" },
};

export function ExposureMatrix({
  matrix,
  active,
  onSelect,
}: {
  matrix: Matrix;
  active: string;
  onSelect: (operator: string) => void;
}) {
  const [hover, setHover] = useState<{
    operator: string;
    center: string;
  } | null>(null);

  const operators = useMemo(
    () => matrix.operators.filter((o) => o.centersPresent > 0).slice(0, 12),
    [matrix],
  );
  const centers = useMemo(() => matrix.centers.slice(0, 18), [matrix]);

  const hovered =
    hover &&
    matrix.operators.find((o) => o.operator === hover.operator)?.cells[
      hover.center
    ];

  const top = operators[0];

  return (
    <Panel flush>
      <div className="px-5 pt-5 sm:px-6 sm:pt-6">
        <PanelHead
          title="Anchor exposure"
          hint="How much of your portfolio depends on any one retailer staying open. Select a row to model its failure."
          right={
            <div className="hidden items-center gap-3 sm:flex">
              {(["named", "present", "dark"] as CellState[]).map((s) => (
                <span
                  key={s}
                  className="flex items-center gap-1.5 text-[0.6875rem] whitespace-nowrap text-muted"
                >
                  <span className={cn("h-2.5 w-2.5 rounded-[3px]", CELL[s].fill)} />
                  {CELL[s].label}
                </span>
              ))}
            </div>
          }
        />
      </div>

      {top && top.concentration > 0 && (
        <div className="mx-5 mt-4 rounded-xl border border-brass-200 bg-brass-50 p-4 sm:mx-6">
          <p className="text-[0.8125rem] leading-relaxed text-ink-soft">
            <span className="font-semibold text-ink">
              {Math.round(top.concentration * 100)}% of your watched doors
            </span>{" "}
            carry a co-tenancy test that depends on{" "}
            <span className="font-semibold text-ink">{top.operator}</span>{" "}
            trading. That is your single largest concentration, worth{" "}
            <span className="tnum font-semibold text-brass-700">
              {compactUsd(top.monthlyAtStake * 12)}
            </span>{" "}
            a year in potential relief if it went dark everywhere.
          </p>
        </div>
      )}

      <div className="mt-4 overflow-x-auto px-5 pb-2 sm:px-6">
        <table className="border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-surface pr-4 pb-2 text-left">
                <span className="label text-faint">Operator</span>
              </th>
              {centers.map((c) => (
                <th key={c.name} className="px-0.5 pb-2 align-bottom">
                  <span
                    className="block h-24 w-6 text-[0.6875rem] whitespace-nowrap text-muted"
                    style={{
                      writingMode: "vertical-rl",
                      transform: "rotate(180deg)",
                    }}
                    title={`${c.name} (${c.doors} door${c.doors === 1 ? "" : "s"})`}
                  >
                    {c.name}
                  </span>
                </th>
              ))}
              <th className="pb-2 pl-4 text-right">
                <span className="label text-faint">At stake</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {operators.map((row) => {
              const on = row.operator === active;
              return (
                <tr key={row.operator}>
                  <td
                    className={cn(
                      "sticky left-0 z-10 py-1 pr-4 transition-colors",
                      on ? "bg-petrol-50" : "bg-surface",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(row.operator)}
                      className="group flex w-full items-center gap-2 text-left"
                    >
                      <span
                        className={cn(
                          "h-4 w-0.5 rounded-full transition-colors",
                          on ? "bg-brass-500" : "bg-transparent",
                        )}
                      />
                      <span
                        className={cn(
                          "text-[0.8125rem] font-medium whitespace-nowrap transition-colors",
                          on
                            ? "text-petrol-800"
                            : "text-ink group-hover:text-petrol-700",
                        )}
                      >
                        {row.operator}
                      </span>
                      {row.rolloverDays != null && row.rolloverDays < 730 && (
                        <Pill tone="watch" className="ml-1">
                          rolls
                        </Pill>
                      )}
                    </button>
                  </td>

                  {centers.map((c) => {
                    const cell = row.cells[c.name];
                    const state: CellState = cell?.state ?? "absent";
                    const isHover =
                      hover?.operator === row.operator && hover?.center === c.name;
                    return (
                      <td key={c.name} className="px-0.5 py-1">
                        <motion.button
                          type="button"
                          onMouseEnter={() =>
                            setHover({ operator: row.operator, center: c.name })
                          }
                          onMouseLeave={() => setHover(null)}
                          onClick={() => onSelect(row.operator)}
                          whileHover={{ scale: 1.25 }}
                          transition={{ duration: 0.15 }}
                          aria-label={`${row.operator} at ${c.name}: ${CELL[state].label}`}
                          className={cn(
                            "block h-6 w-6 rounded-[5px] ring-1 ring-inset transition-opacity",
                            CELL[state].fill,
                            CELL[state].ring,
                            on || isHover ? "opacity-100" : "opacity-90",
                          )}
                        />
                      </td>
                    );
                  })}

                  <td className="py-1 pl-4 text-right">
                    <span
                      className={cn(
                        "tnum text-[0.8125rem] font-semibold whitespace-nowrap",
                        row.monthlyAtStake > 0 ? "text-brass-600" : "text-faint",
                      )}
                    >
                      {row.monthlyAtStake > 0
                        ? `${usd(Math.round(row.monthlyAtStake))}/mo`
                        : "—"}
                    </span>
                    <span className="block text-[0.6875rem] text-muted">
                      {row.namedInLeases} named
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* hover readout */}
      <div className="min-h-[52px] border-t border-line px-5 py-3 sm:px-6">
        {hover && hovered ? (
          <p className="text-[0.8125rem] text-ink-soft">
            <span className="font-semibold text-ink">{hover.operator}</span> at{" "}
            <span className="font-semibold text-ink">{hover.center}</span>:{" "}
            {CELL[hovered.state].label}
            {hovered.locationIds.length > 0 && (
              <>
                {" · "}
                {hovered.locationIds.length} of your door
                {hovered.locationIds.length === 1 ? "" : "s"} here
              </>
            )}
            {hovered.monthly > 0 && (
              <>
                {" · "}
                <span className="tnum font-semibold text-brass-600">
                  {usd(Math.round(hovered.monthly))}/mo
                </span>{" "}
                would become available
              </>
            )}
          </p>
        ) : (
          <p className="text-[0.8125rem] text-muted">
            Hover a cell for detail. Rows marked{" "}
            <span className="font-semibold text-brass-700">rolls</span> have a
            lease of their own expiring inside two years
            {operators.find((o) => o.rolloverOn) && (
              <>
                , the soonest on{" "}
                {prettyDate(
                  operators
                    .filter((o) => o.rolloverOn)
                    .sort((a, b) =>
                      (a.rolloverOn ?? "") < (b.rolloverOn ?? "") ? -1 : 1,
                    )[0].rolloverOn!,
                )}
              </>
            )}
            .
          </p>
        )}
      </div>
    </Panel>
  );
}

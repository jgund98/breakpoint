"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { Panel, PanelHead, type Tone } from "./ui";

/**
 * THE THRESHOLD RAIL
 *
 * Every watched door on one axis, placed by how much margin its
 * tightest co-tenancy test has left.
 *
 * At sixty doors a table cannot answer "how close are we to trouble".
 * At six hundred it is hopeless. This is the shape of the portfolio in
 * one line: everything at the left edge is failing or about to, and
 * the mass on the right is what is comfortable. It is a distribution,
 * so it stays readable whether two things are wrong or forty are.
 *
 * Every position comes from an evaluated ratio. Nothing here is
 * decorative and nothing is invented.
 */

export type RailPoint = {
  id: string;
  center: string;
  city: string;
  /** Tightest test's margin, as a fraction. Negative means failing. */
  margin: number;
  label: string;
  test: string;
  state: string;
  tone: Tone;
  monthly: number | null;
};

/**
 * Three bands, not four.
 *
 * An earlier version split the middle into "at the line" and "thin
 * margin" and the second was always empty. The reason matters: a
 * named-tenant test is binary. One store, one closure, it trips. It
 * has no margin by design, so every such test sits at exactly zero
 * and nothing lands between. Reporting that as "within three points"
 * implied a near miss when it is a structural property of the clause.
 *
 * Saying "no margin left, one closure trips it" is both accurate and
 * the more useful reading, because that is the concentration risk the
 * reader should act on at renewal.
 */
const BANDS = [
  { key: "failing", label: "Failing", max: 0, tone: "clay" as Tone },
  { key: "nomargin", label: "No margin left", max: 0.03, tone: "brass" as Tone },
  { key: "clear", label: "Has margin", max: Infinity, tone: "open" as Tone },
];

const bandOf = (m: number) => BANDS.findIndex((b) => m < b.max);

const DOT: Record<string, string> = {
  clay: "bg-rose-500",
  brass: "bg-amber-500",
  watch: "bg-amber-400",
  open: "bg-emerald-600",
};

export function ThresholdRail({ points }: { points: RailPoint[] }) {
  const [hover, setHover] = useState<RailPoint | null>(null);

  const grouped = useMemo(() => {
    const g: RailPoint[][] = BANDS.map(() => []);
    for (const p of points) g[bandOf(p.margin)].push(p);
    for (const list of g) list.sort((a, b) => a.margin - b.margin);
    return g;
  }, [points]);

  const atRisk = grouped[0].length + grouped[1].length;

  return (
    <Panel flush className="overflow-hidden">
      <div className="px-5 pt-5 sm:px-6 sm:pt-6">
        <PanelHead
          title="Margin to threshold"
          hint="Each door by the margin left on its tightest test."
          right={
            <span className="text-[0.75rem] text-slate-500">
              <span className="tnum font-semibold text-slate-900">{atRisk}</span> of{" "}
              {points.length} with no margin left
            </span>
          }
        />
      </div>

      <div className="mt-5 grid grid-cols-3 gap-px bg-line">
        {BANDS.map((band, i) => {
          const list = grouped[i];
          return (
            <div key={band.key} className="bg-white px-3 pt-3 pb-4">
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className={cn(
                    "text-[0.6875rem] font-semibold tracking-wide uppercase",
                    band.tone === "clay"
                      ? "text-rose-600"
                      : band.tone === "brass"
                        ? "text-amber-700"
                        : band.tone === "watch"
                          ? "text-amber-600"
                          : "text-emerald-700",
                  )}
                >
                  {band.label}
                </span>
                <span className="tnum text-[0.8125rem] font-semibold text-slate-900">
                  {list.length}
                </span>
              </div>

              <p className="mt-0.5 text-[0.6875rem] text-slate-400">
                {i === 0
                  ? "test not met today"
                  : i === 1
                    ? "one closure trips it"
                    : "room before it trips"}
              </p>

              {/* the doors themselves */}
              <div className="mt-3 flex min-h-[72px] flex-wrap content-start gap-1">
                {list.map((p, k) => (
                  <motion.span
                    key={p.id}
                    initial={{ opacity: 0, scale: 0.4 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      delay: Math.min(0.4, k * 0.012),
                      duration: 0.35,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  >
                    <Link
                      href={`/app/locations/${p.id}`}
                      onMouseEnter={() => setHover(p)}
                      onMouseLeave={() => setHover(null)}
                      onFocus={() => setHover(p)}
                      aria-label={`${p.center}, ${p.label}`}
                      className={cn(
                        "block h-3 w-3 rounded-[3px] transition-transform duration-150 hover:scale-150",
                        DOT[p.tone],
                        hover && hover.id === p.id && "scale-150 ring-2 ring-indigo-600 ring-offset-1",
                      )}
                    />
                  </motion.span>
                ))}
                {list.length === 0 && (
                  <span className="text-[0.75rem] text-slate-400">None</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* readout: one row, always present, so the panel never jumps */}
      <div className="flex min-h-[54px] items-center border-t border-slate-200 px-5 py-3 sm:px-6">
        {hover ? (
          <p className="text-[0.8125rem] text-slate-700">
            <Link
              href={`/app/locations/${hover.id}`}
              className="font-semibold text-indigo-800 hover:underline"
            >
              {hover.center}
            </Link>{" "}
            <span className="text-slate-500">{hover.city}</span>
            {" · "}
            {hover.test}: <span className="font-medium text-slate-900">{hover.label}</span>
            {hover.monthly ? (
              <>
                {" · "}
                <span className="tnum font-semibold text-amber-600">
                  ${Math.round(hover.monthly).toLocaleString("en-US")}/mo
                </span>{" "}
                if claimed
              </>
            ) : null}
          </p>
        ) : (
          <p className="text-[0.8125rem] text-slate-500">
            Hover any door for its tightest test. Each square is one location.
          </p>
        )}
      </div>
    </Panel>
  );
}

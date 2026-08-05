"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  type CenterFacts,
  type ClaimStatus,
  type Clause,
  type LeaseEconomics,
  type Suite,
  type SuiteStatus,
  COMPUTABILITY_META,
  STATE_META,
  evaluateClause,
  usd,
} from "@/lib/clause";
import { PLAN, STATUS_LABEL, layoutCenter, suiteFill, suiteStroke } from "@/lib/planLayout";
import { cn } from "@/lib/cn";
import { Meter, Pill, ActionButton, type Tone } from "./ui";

/**
 * THE BOARD
 *
 * The center as a leasing plan, with every storefront live. Close one
 * and the lease re-evaluates underneath: the tests move, the meters
 * move, the money moves. Cause and effect under one finger.
 *
 * This is not a simulation of a generic mall. It is the reader's own
 * center, their own clause, their own rent, so the number that appears
 * when an anchor goes dark is the number on their P&L.
 */

function useCountUp(target: number, ms = 700) {
  const [value, setValue] = useState(target);
  const from = useRef(target);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    const b = target;
    if (a === b) return;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(a + (b - a) * eased);
      if (t < 1) raf.current = requestAnimationFrame(tick);
      else from.current = b;
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      from.current = value;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, ms]);

  return value;
}

type Props = {
  center: CenterFacts;
  clause: Clause;
  econ: LeaseEconomics;
  claim: ClaimStatus;
  asOf: string;
};

export function Board({ center, clause, econ, claim, asOf }: Props) {
  const [overrides, setOverrides] = useState<Record<string, SuiteStatus>>({});
  const [hover, setHover] = useState<string | null>(null);

  const working: CenterFacts = useMemo(
    () => ({
      ...center,
      suites: center.suites.map((s) =>
        overrides[s.id] ? { ...s, status: overrides[s.id] } : s,
      ),
    }),
    [center, overrides],
  );

  const baseline = useMemo(
    () => evaluateClause(clause, center, econ, claim, asOf),
    [clause, center, econ, claim, asOf],
  );
  const live = useMemo(
    () => evaluateClause(clause, working, econ, claim, asOf),
    [clause, working, econ, claim, asOf],
  );

  const plan = useMemo(() => layoutCenter(working), [working]);
  const dirty = Object.keys(overrides).length > 0;

  const monthly = live.monthlyDelta ?? 0;
  const shown = useCountUp(live.anyFailing ? monthly : 0);

  const toggle = (s: Suite) => {
    if (s.subject) return;
    setOverrides((prev) => {
      const next = { ...prev };
      const current = prev[s.id] ?? s.status;
      if (current === "dark") {
        if (s.status === "dark") next[s.id] = "open";
        else delete next[s.id];
      } else {
        next[s.id] = "dark";
      }
      return next;
    });
  };

  /* ---- scenario presets, built from this center's own anchors ---- */
  const anchors = center.suites.filter((s) => s.kind === "anchor");
  const juniors = center.suites.filter((s) => s.kind === "junior");
  const openAnchors = anchors.filter((a) => a.status === "open");

  const scenarios: { id: string; label: string; apply: () => void }[] = [
    { id: "observed", label: "As observed", apply: () => setOverrides({}) },
    ...(openAnchors[0]
      ? [
          {
            id: "anchor",
            label: `If ${openAnchors[0].name} closes`,
            apply: () => setOverrides({ [openAnchors[0].id]: "dark" }),
          },
        ]
      : []),
    ...(juniors.length
      ? [
          {
            id: "juniors",
            label: "If the junior boxes go",
            apply: () =>
              setOverrides(
                Object.fromEntries(juniors.slice(0, 3).map((j) => [j.id, "dark"])),
              ),
          },
        ]
      : []),
    {
      id: "wing",
      label: "If a wing comes offline",
      apply: () =>
        setOverrides(
          Object.fromEntries(
            plan.rows[0].suites
              .filter((s) => !s.subject)
              .slice(0, 9)
              .map((s) => [s.id, "dark" as SuiteStatus]),
          ),
        ),
    },
  ];

  const stateTone = STATE_META[live.state].tone as Tone;
  const hovered = hover
    ? working.suites.find((s) => s.id === hover)
    : null;

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      {/* ---- head ---- */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
        <div>
          <p className="label text-petrol-600">The board</p>
          <h2 className="mt-1.5 text-[1.0625rem] font-semibold text-ink">
            {center.name}
          </h2>
          <p className="mt-1 text-[0.8125rem] text-muted">
            Close any storefront. Your clause re-evaluates underneath.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Pill tone={stateTone} dot>
            {STATE_META[live.state].label}
          </Pill>
          {dirty && (
            <ActionButton variant="secondary" onClick={() => setOverrides({})}>
              Reset to observed
            </ActionButton>
          )}
        </div>
      </div>

      {/* ---- scenario rail ---- */}
      <div className="scroll-x-clean flex gap-2 overflow-x-auto border-b border-line px-5 py-3 sm:px-6">
        {scenarios.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={s.apply}
            className="rounded-lg border border-line bg-surface px-3 py-2 text-[0.75rem] font-semibold whitespace-nowrap text-ink-soft transition-colors duration-250 hover:border-petrol-300 hover:bg-petrol-50 hover:text-petrol-800"
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1.35fr_1fr]">
        {/* ---- the plan ---- */}
        <div className="relative border-b border-line p-4 sm:p-5 lg:border-b-0 lg:border-r">
          <svg
            viewBox={`0 0 ${PLAN.w} ${PLAN.h}`}
            className="w-full"
            role="img"
            aria-label={`Leasing plan for ${center.name}`}
          >
            <rect
              x={0}
              y={0}
              width={PLAN.w}
              height={PLAN.h}
              fill="#fbfbfe"
              rx={14}
            />
            {/* the spine */}
            <rect
              x={186}
              y={298}
              width={628}
              height={62}
              fill="#f4f5fb"
              rx={6}
            />

            {[...plan.anchors, ...plan.rows.flatMap((r) => r.suites)].map((s) => {
              const wide = s.box.w > 62;
              const tall = s.box.h > 90;
              const isHover = hover === s.id;
              return (
                <g
                  key={s.id}
                  onMouseEnter={() => setHover(s.id)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => toggle(s)}
                  className={s.subject ? "cursor-default" : "cursor-pointer"}
                >
                  <rect
                    x={s.box.x}
                    y={s.box.y}
                    width={s.box.w}
                    height={s.box.h}
                    rx={4}
                    fill={suiteFill(s.status, s.subject)}
                    stroke={isHover ? "var(--color-petrol-600)" : suiteStroke(s.status, s.subject)}
                    strokeWidth={isHover ? 2.5 : 1.25}
                    className="transition-[fill,stroke] duration-300"
                  />
                  {s.status === "dark" && (
                    <line
                      x1={s.box.x + 4}
                      y1={s.box.y + 4}
                      x2={s.box.x + s.box.w - 4}
                      y2={s.box.y + s.box.h - 4}
                      stroke="var(--color-clay-500)"
                      strokeWidth={1.25}
                      opacity={0.55}
                    />
                  )}
                  {wide && (
                    <text
                      x={s.box.x + s.box.w / 2}
                      y={s.box.y + (tall ? s.box.h / 2 : s.box.h / 2 + 4)}
                      textAnchor="middle"
                      className="pointer-events-none select-none"
                      style={{
                        fontSize: s.kind === "anchor" ? 15 : 11,
                        fontWeight: s.subject ? 700 : 500,
                        fill: s.subject
                          ? "#ffffff"
                          : s.status === "dark"
                            ? "var(--color-clay-700)"
                            : "var(--color-ink-soft)",
                      }}
                    >
                      {s.box.w < 96 && s.name.length > 12
                        ? s.name.slice(0, 11) + "…"
                        : s.name}
                    </text>
                  )}
                </g>
              );
            })}

            {/* the reader's own store, marked so it is findable instantly */}
            {(() => {
              const me = plan.rows
                .flatMap((r) => r.suites)
                .find((s) => s.subject);
              if (!me) return null;
              const cx = me.box.x + me.box.w / 2;
              const top = me.box.y - 10;
              return (
                <g className="pointer-events-none">
                  <line
                    x1={cx}
                    y1={top}
                    x2={cx}
                    y2={me.box.y}
                    stroke="var(--color-petrol-700)"
                    strokeWidth={1.5}
                  />
                  <circle cx={cx} cy={top - 4} r={4.5} fill="var(--color-petrol-700)" />
                  <text
                    x={cx}
                    y={top - 14}
                    textAnchor="middle"
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      fill: "var(--color-petrol-800)",
                    }}
                  >
                    Your store
                  </text>
                </g>
              );
            })()}
          </svg>

          {/* legend */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 px-1">
            {(
              [
                ["open", "Open"],
                ["dark", "Dark"],
                ["vacant", "Vacant"],
                ["remodeling", "Deemed open"],
              ] as const
            ).map(([status, label]) => (
              <span key={status} className="flex items-center gap-1.5 text-[0.75rem] text-muted">
                <span
                  className="h-2.5 w-2.5 rounded-[3px] border"
                  style={{
                    background: suiteFill(status),
                    borderColor: suiteStroke(status),
                  }}
                />
                {label}
              </span>
            ))}
            <span className="flex items-center gap-1.5 text-[0.75rem] text-muted">
              <span className="h-2.5 w-2.5 rounded-[3px] bg-petrol-600" />
              Your store
            </span>
          </div>

          {hovered && (
            <div className="pointer-events-none absolute bottom-16 left-1/2 -translate-x-1/2 rounded-lg border border-line bg-canvas px-3 py-2 text-center lift">
              <p className="text-[0.8125rem] font-semibold text-ink">
                {hovered.name}
              </p>
              <p className="tnum text-[0.75rem] text-muted">
                {hovered.gla.toLocaleString("en-US")} SF ·{" "}
                {STATUS_LABEL[hovered.status]}
              </p>
            </div>
          )}
        </div>

        {/* ---- the readout ---- */}
        <div className="p-5 sm:p-6">
          <p className="label text-muted">
            {live.anyFailing ? "Estimated monthly relief" : "Nothing claimable"}
          </p>
          <p
            className={cn(
              "tnum font-display mt-2 text-[2.5rem] leading-none transition-colors duration-500",
              live.anyFailing ? "text-brass-600" : "text-faint",
            )}
          >
            {live.monthlyDelta == null
              ? "Sales needed"
              : usd(Math.round(shown))}
          </p>
          <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted">
            {live.anyFailing
              ? `Against ${usd(Math.round((econ.gla * econ.rentPsf) / 12))} contract rent. Potential, not owed, and subject to notice.`
              : "Every test in this lease is satisfied on the board as drawn."}
          </p>

          {dirty && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="mt-4 rounded-xl border border-petrol-100 bg-petrol-50 p-3.5"
            >
              <p className="text-[0.75rem] font-semibold text-petrol-800">
                Modeled, not observed
              </p>
              <p className="mt-1 text-[0.75rem] leading-relaxed text-ink-soft">
                {baseline.anyFailing
                  ? `As observed, this lease is ${STATE_META[baseline.state].label.toLowerCase()} at ${usd(Math.round(baseline.monthlyDelta ?? 0))} per month.`
                  : "As observed, every test here is satisfied."}
              </p>
            </motion.div>
          )}

          {/* tests */}
          <div className="mt-6 space-y-4">
            {live.triggers.map((t) => {
              const tone: Tone = t.failing
                ? "clay"
                : t.ratio < 1.03
                  ? "watch"
                  : "open";
              return (
                <div key={t.id}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[0.8125rem] font-semibold text-ink">
                      {t.label}
                      <span className="ml-1.5 font-normal text-faint">{t.cite}</span>
                    </p>
                    <p
                      className={cn(
                        "tnum text-[0.8125rem] font-semibold",
                        t.failing ? "text-clay-600" : "text-ink-soft",
                      )}
                    >
                      {t.observed}
                    </p>
                  </div>
                  <div className="mt-2">
                    <Meter ratio={t.ratio} tone={tone} />
                  </div>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.75rem] text-muted">
                    <span>{t.headroom}</span>
                    <span className="text-faint">·</span>
                    <span
                      className={cn(
                        t.computability === "observable"
                          ? "text-open-700"
                          : t.computability === "partial"
                            ? "text-brass-700"
                            : "text-clay-600",
                      )}
                    >
                      {COMPUTABILITY_META[t.computability].label}
                    </span>
                  </p>
                  {t.deemedOpenApplied.length > 0 && (
                    <p className="mt-1 text-[0.75rem] text-brass-700">
                      Deemed open: {t.deemedOpenApplied.join("; ")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <p className="mt-6 border-t border-line pt-4 text-[0.75rem] leading-relaxed text-muted">
            Occupancy is recomputed for this clause alone, using its own
            denominator, its own measurement basis and its own deemed-open
            rules. It is not the center&#8217;s headline occupancy figure.
          </p>
        </div>
      </div>
    </div>
  );
}

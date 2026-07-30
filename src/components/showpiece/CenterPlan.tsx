"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  allUnits,
  categoryColor,
  categoryLegend,
  center,
  evaluate,
  leaseEconomics,
  scenarios,
  usd,
  sf,
  type Scenario,
  type TestStatus,
  type Unit,
} from "@/lib/center";
import { layoutPlan, corridor, northCourt, southCourt } from "@/lib/plan";
import { useCountUp } from "@/lib/useCountUp";
import { cn } from "@/lib/cn";

/**
 * The retailer's view of one center: take a storefront dark and watch
 * the clause tests, the occupancy meter and the money move. This is
 * the product demonstration — everything else on the site explains
 * what this widget shows.
 */
export function CenterPlan() {
  const [scenarioId, setScenarioId] = useState<Scenario["id"]>("today");
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [hovered, setHovered] = useState<string | null>(null);

  const scenario = scenarios.find((s) => s.id === scenarioId) ?? scenarios[0];
  const touched = Object.keys(overrides).length > 0;

  const units: Unit[] = useMemo(() => {
    const darkSet = new Set(scenario.dark);
    return allUnits.map((u) => {
      const forced = overrides[u.id];
      const isDark = forced !== undefined ? forced : darkSet.has(u.id);
      if (u.status === "vacant") return { ...u };
      return { ...u, status: isDark ? ("dark" as const) : ("open" as const) };
    });
  }, [scenario, overrides]);

  const evaluation = useMemo(
    () => evaluate(units, { cureElapsedDays: touched ? 0 : scenario.elapsedDays }),
    [units, scenario.elapsedDays, touched],
  );

  const placed = useMemo(() => layoutPlan(units), [units]);

  const animatedHeadline = useCountUp(evaluation.monthlyDelta);
  const animatedOccupancy = useCountUp(evaluation.occupancyPct * 100, 0.7);

  const monthsElapsed = touched ? 0 : Math.floor(scenario.elapsedDays / 30);
  const forgone = evaluation.triggered
    ? leaseEconomics.monthlyDelta * monthsElapsed
    : 0;
  const animatedForgone = useCountUp(forgone);

  const selectScenario = (id: string) => {
    setScenarioId(id);
    setOverrides({});
  };

  const toggleUnit = (unit: Unit) => {
    if (unit.status === "vacant") return;
    setOverrides((prev) => ({
      ...prev,
      [unit.id]: !(prev[unit.id] ?? scenario.dark.includes(unit.id)),
    }));
  };

  const hoveredUnit = placed.find((p) => p.unit.id === hovered);

  return (
    <div className="relative">
      {/* ---------------- controls ---------------- */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="text-[clamp(1.5rem,3.2vw,2.125rem)]">{center.name}</h3>
          <p className="mt-2 text-[0.9375rem] text-muted">
            {center.market} · {center.type} · 628,000 SF
          </p>
        </div>
        <p className="label text-muted lg:pb-1.5">Your store · Unit 214</p>
      </div>

      <div className="scroll-x-clean mt-7 -mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-2 sm:min-w-0 sm:flex-wrap">
          {scenarios.map((s) => {
            const active = s.id === scenarioId && !touched;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => selectScenario(s.id)}
                className={cn(
                  "rounded-xl border px-4 py-3 text-left transition-all duration-300",
                  active
                    ? "border-petrol-800 bg-petrol-800 text-cream"
                    : "border-line bg-surface text-ink hover:border-petrol-300 hover:bg-petrol-50",
                )}
              >
                <span className="block text-sm font-medium">{s.label}</span>
                <span
                  className={cn(
                    "mt-0.5 block whitespace-nowrap text-xs",
                    active ? "text-cream-soft" : "text-muted",
                  )}
                >
                  {s.blurb}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ---------------- plan + panel ---------------- */}
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_384px] xl:gap-8">
        <div>
          <div className="scroll-x-clean -mx-5 overflow-x-auto px-5 sm:mx-0 sm:overflow-visible sm:px-0">
            <div className="min-w-[720px] sm:min-w-0">
              <div
                className="relative aspect-1000/620 w-full overflow-hidden rounded-xl border border-line bg-surface lift"
                onMouseLeave={() => setHovered(null)}
              >
                <div className="plan-grid absolute inset-0 opacity-60" />

                {[corridor, northCourt, southCourt].map((c, i) => (
                  <div
                    key={i}
                    className="absolute rounded-sm bg-surface-sunk"
                    style={{
                      left: `${c.left}%`,
                      top: `${c.top}%`,
                      width: `${c.width}%`,
                      height: `${c.height}%`,
                    }}
                  />
                ))}

                {placed.map((p) => (
                  <UnitBox
                    key={p.unit.id}
                    placed={p}
                    breached={evaluation.triggered}
                    onHover={setHovered}
                    onToggle={toggleUnit}
                    isHovered={hovered === p.unit.id}
                  />
                ))}

                <SubjectMarker
                  placed={placed.find((p) => p.unit.subject)}
                  breached={evaluation.triggered}
                />

                {hoveredUnit && <Tooltip placed={hoveredUnit} />}
              </div>
            </div>
          </div>

          {/* legend sits below the plan so nothing clips on a phone */}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <LegendKey swatch="bg-petrol-900" label="Dark" />
            <LegendKey swatch="border border-dashed border-muted" label="Vacant" />
            <LegendKey swatch="bg-brass-500" label="Named in lease" />
            <span className="hidden h-3 w-px bg-line sm:block" />
            {categoryLegend.map((c) => (
              <LegendKey
                key={c.label}
                swatch="ring-1 ring-inset ring-petrol-800/25"
                style={{ backgroundColor: c.color }}
                label={c.label}
              />
            ))}
          </div>

          <p className="mt-3 text-[0.8125rem] text-muted">
            <span className="sm:hidden">
              Swipe the plan to explore · tap any storefront to close it.
            </span>
            <span className="hidden sm:inline">
              Click any storefront to take it dark. Fill colour is the
              merchandising category.
            </span>{" "}
            Fictional center and tenants; the clause mechanics are real.
          </p>
        </div>

        {/* PANEL */}
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-line bg-surface p-5 lift">
            <div className="flex items-baseline justify-between">
              <span className="label text-muted">Occupied GLA</span>
              <span className="text-xs text-faint">excl. anchors</span>
            </div>
            <div className="mt-3 flex items-end gap-1.5">
              <span
                className={cn(
                  "tnum font-display text-[3.25rem] leading-none transition-colors duration-500",
                  evaluation.occupancyPct < 0.7 ? "text-brass-600" : "text-petrol-800",
                )}
              >
                {animatedOccupancy.toFixed(1)}
              </span>
              <span className="pb-1.5 text-lg text-muted">%</span>
            </div>

            <div className="relative mt-4 h-2.5 overflow-hidden rounded-full bg-surface-sunk">
              <motion.div
                className={cn(
                  "absolute inset-y-0 left-0 rounded-full transition-colors duration-500",
                  evaluation.occupancyPct < 0.7 ? "bg-brass-500" : "bg-open-600",
                )}
                animate={{ width: `${evaluation.occupancyPct * 100}%` }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              />
              <div
                className="absolute inset-y-0 w-px bg-ink/45"
                style={{ left: "70%" }}
              />
            </div>
            <div className="relative mt-1.5 h-4">
              <div className="absolute top-0 -translate-x-1/2" style={{ left: "70%" }}>
                <span className="block whitespace-nowrap text-[0.625rem] font-medium tracking-wide text-muted">
                  70% floor
                </span>
              </div>
            </div>

            <p className="tnum mt-4 border-t border-line pt-3 text-xs text-muted">
              {sf(evaluation.occupiedInlineGla)} of {sf(evaluation.totalInlineGla)}
            </p>
          </div>

          <div className="rounded-xl border border-line bg-surface p-5 lift">
            <div className="flex items-baseline justify-between">
              <span className="label text-muted">Clause tests</span>
              <span className="text-xs text-faint">§ 4.3</span>
            </div>
            <ul className="mt-4 space-y-3.5">
              {evaluation.tests.map((t) => (
                <li key={t.id}>
                  <TestRow {...t} />
                </li>
              ))}
            </ul>
          </div>

          <div
            className={cn(
              "rounded-xl border p-5 transition-colors duration-700",
              evaluation.triggered
                ? "border-brass-200 bg-brass-50"
                : "border-line bg-surface lift",
            )}
          >
            <span className="label text-muted">Potentially claimable — this store</span>

            <div className="mt-3 flex items-baseline gap-1.5">
              <span
                className={cn(
                  "tnum font-display text-[2.75rem] leading-none transition-colors duration-500",
                  evaluation.triggered ? "text-brass-700" : "text-faint",
                )}
              >
                {usd(animatedHeadline)}
              </span>
              <span className="text-sm text-muted">/mo</span>
            </div>

            <AnimatePresence mode="wait">
              {evaluation.triggered ? (
                <motion.div
                  key="hit"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.3 }}
                  className="mt-4 space-y-2.5 border-t border-current/12 pt-4"
                >
                  <Line k="Minimum rent" v={`${usd(leaseEconomics.baseRentMonthly)}/mo`} />
                  <Line
                    k="Alternative rent (4% of sales)"
                    v={`${usd(leaseEconomics.alternativeRentMonthly)}/mo`}
                  />
                  <Line k="Occupancy cost" v="11.1% → 4.0%" accent />
                  <Line k="Annualised" v={usd(leaseEconomics.monthlyDelta * 12)} accent />
                  <p className="pt-1 text-[0.6875rem] leading-relaxed text-muted">
                    Flagged for your team and counsel to review — Breakpoint
                    identifies the potential event and builds the evidence.
                  </p>
                </motion.div>
              ) : (
                <motion.p
                  key="clear"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mt-3 text-sm leading-relaxed text-muted"
                >
                  Every test satisfied. Nothing is claimable against this lease
                  today.
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {evaluation.triggered && monthsElapsed > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="rounded-xl border border-clay-100 bg-clay-50 p-5">
                  <span className="label text-clay-700">Already forgone</span>
                  <p className="tnum mt-2 font-display text-[2rem] leading-none text-clay-700">
                    {usd(animatedForgone)}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                    The remedy runs from the month after notice is delivered, not
                    from the day the test failed. {monthsElapsed} months went by.
                    That money is gone.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={touched ? "custom" : scenario.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 border-t border-line pt-7"
        >
          <p className="no-orphan max-w-3xl text-[1.0625rem] leading-relaxed text-ink-soft">
            {touched ? (
              <>
                <span className="font-medium text-petrol-800">
                  Your scenario.{" "}
                </span>
                Breakpoint re-runs every test as the center changes — the same
                arithmetic, on a recurring schedule, across every lease you hold.
              </>
            ) : (
              scenario.lesson
            )}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function UnitBox({
  placed,
  breached,
  onHover,
  onToggle,
  isHovered,
}: {
  placed: ReturnType<typeof layoutPlan>[number];
  breached: boolean;
  onHover: (id: string | null) => void;
  onToggle: (u: Unit) => void;
  isHovered: boolean;
}) {
  const { unit, left, top, width, height } = placed;
  const isDark = unit.status === "dark";
  const isVacant = unit.status === "vacant";
  const showLabel = width > 5.2 || Boolean(unit.anchor);

  return (
    <motion.button
      type="button"
      disabled={isVacant}
      onMouseEnter={() => onHover(unit.id)}
      onFocus={() => onHover(unit.id)}
      onClick={() => onToggle(unit)}
      aria-label={`${unit.name} — ${unit.status}`}
      className={cn(
        "absolute overflow-hidden rounded-[3px] text-left ring-1 ring-inset transition-shadow duration-300",
        !isVacant && "cursor-pointer",
        isDark ? "ring-petrol-950" : "ring-petrol-800/30",
        isVacant && "ring-0",
        isHovered && "z-20 shadow-[0_0_0_2px_var(--color-petrol-600)]",
      )}
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: `${width}%`,
        height: `${height}%`,
      }}
      animate={{
        backgroundColor: isVacant
          ? "rgba(0,0,0,0)"
          : isDark
            ? "#0a2f2a"
            : categoryColor[unit.category],
      }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
    >
      {isVacant && (
        <span className="absolute inset-0 rounded-[3px] border border-dashed border-muted/70" />
      )}

      {unit.named && (
        <span
          className={cn(
            "absolute right-1 top-1 h-1.5 w-1.5 rounded-[1px]",
            isDark ? "bg-brass-400/70" : "bg-brass-500",
          )}
        />
      )}

      {unit.subject && (
        <>
          <span
            className={cn(
              "absolute inset-0 rounded-[3px] ring-2 ring-inset transition-colors duration-500",
              breached ? "ring-brass-500" : "ring-petrol-800",
            )}
          />
          {breached && (
            <span className="anim-pulse-dot absolute left-1 top-1 h-1.5 w-1.5 rounded-full bg-brass-500" />
          )}
        </>
      )}

      {showLabel && (
        <span
          className={cn(
            "pointer-events-none absolute inset-0 flex items-center justify-center px-1 text-center leading-tight transition-colors duration-500",
            unit.anchor ? "text-[0.8125rem] font-medium" : "text-[0.5625rem]",
            isDark ? "text-cream-soft" : isVacant ? "text-faint" : "text-ink",
          )}
        >
          {unit.name}
        </span>
      )}
    </motion.button>
  );
}

/** Leader line + chip pointing at the viewer's own store. */
function SubjectMarker({
  placed,
  breached,
}: {
  placed?: ReturnType<typeof layoutPlan>[number];
  breached: boolean;
}) {
  if (!placed) return null;
  const { left, top, width } = placed;
  return (
    <div
      className="pointer-events-none absolute z-10 flex flex-col items-center"
      style={{
        left: `${left + width / 2}%`,
        top: `${top}%`,
        transform: "translate(-50%, -100%)",
      }}
    >
      <span
        className={cn(
          "rounded-md px-2 py-1 text-[0.625rem] font-semibold whitespace-nowrap transition-colors duration-500",
          breached ? "bg-brass-500 text-petrol-950" : "bg-petrol-800 text-cream",
        )}
      >
        Your store · Unit 214
      </span>
      <span
        className={cn(
          "h-2 w-px transition-colors duration-500",
          breached ? "bg-brass-500" : "bg-petrol-800",
        )}
      />
    </div>
  );
}

function Tooltip({ placed }: { placed: ReturnType<typeof layoutPlan>[number] }) {
  const { unit, left, top, width } = placed;
  return (
    <div
      className="pointer-events-none absolute z-30"
      style={{
        left: `${Math.min(Math.max(left + width / 2, 13), 87)}%`,
        top: `${top}%`,
        transform: "translate(-50%, -112%)",
      }}
    >
      <div className="min-w-44 rounded-lg border border-line bg-petrol-900 px-3 py-2.5 shadow-xl">
        <p className="text-[0.8125rem] font-medium text-cream">{unit.name}</p>
        <p className="tnum mt-0.5 text-[0.6875rem] text-cream-faint">
          {unit.category} · {sf(unit.gla)}
        </p>
        <div className="mt-2 flex items-center gap-2 border-t border-white/12 pt-2">
          <span
            className={cn(
              "h-1.5 w-1.5 shrink-0 rounded-full",
              unit.status === "open"
                ? "bg-open-600"
                : unit.status === "dark"
                  ? "bg-cream-faint"
                  : "bg-transparent ring-1 ring-cream-faint",
            )}
          />
          <span className="label text-cream-soft">
            {unit.status === "open"
              ? "Open & operating"
              : unit.status === "dark"
                ? "Gone dark"
                : "Vacant"}
          </span>
        </div>
        {unit.named && (
          <p className="label mt-1.5 text-brass-400">Named in § 4.3</p>
        )}
      </div>
    </div>
  );
}

function TestRow({
  label,
  cite,
  requirement,
  observed,
  status,
}: {
  label: string;
  cite: string;
  requirement: string;
  observed: string;
  status: TestStatus;
}) {
  const tone =
    status === "satisfied"
      ? { dot: "bg-open-600", text: "text-open-700", word: "Satisfied" }
      : status === "cure"
        ? { dot: "bg-brass-400", text: "text-brass-700", word: "In cure" }
        : { dot: "bg-brass-500", text: "text-brass-700", word: "Failed" };

  return (
    <div className="flex gap-3">
      <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", tone.dot)} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium text-ink">{label}</span>
          <span className={cn("label shrink-0", tone.text)}>{tone.word}</span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted">{requirement}</p>
        <p className="tnum mt-1 text-[0.6875rem] text-ink-soft">
          <span className="text-faint">§{cite} observed:</span> {observed}
        </p>
      </div>
    </div>
  );
}

function LegendKey({
  swatch,
  label,
  style,
}: {
  swatch: string;
  label: string;
  style?: React.CSSProperties;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("h-2.5 w-2.5 shrink-0 rounded-[2px]", swatch)} style={style} />
      <span className="text-[0.625rem] font-medium tracking-wide text-muted uppercase">
        {label}
      </span>
    </span>
  );
}

function Line({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs text-muted">{k}</span>
      <span
        className={cn(
          "tnum shrink-0 text-xs",
          accent ? "font-semibold text-ink" : "text-ink-soft",
        )}
      >
        {v}
      </span>
    </div>
  );
}

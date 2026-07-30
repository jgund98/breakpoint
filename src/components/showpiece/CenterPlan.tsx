"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useInView } from "motion/react";
import {
  allUnits,
  categoryColor,
  center,
  evaluate,
  leaseEconomics,
  scenarios,
  usd,
  sf,
  type Evaluation,
  type Scenario,
  type TestStatus,
  type Unit,
} from "@/lib/center";
import { layoutPlan, corridor, northCourt, southCourt } from "@/lib/plan";
import { useCountUp } from "@/lib/useCountUp";
import { cn } from "@/lib/cn";

/**
 * The guided demonstration: one center, one lease. Close a storefront
 * and Breakpoint re-runs the lease's co-tenancy tests, leading with the
 * business outcome — was a potential trigger detected, and what is it
 * worth — before the supporting math.
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
  const darkCount = units.filter((u) => u.status === "dark").length;
  const monthsElapsed = touched ? 0 : Math.floor(scenario.elapsedDays / 30);

  const selectScenario = (id: string) => {
    setScenarioId(id);
    setOverrides({});
  };

  const toggleUnit = (unit: Unit) => {
    if (unit.status === "vacant" || unit.subject) return;
    setOverrides((prev) => ({
      ...prev,
      [unit.id]: !(prev[unit.id] ?? scenario.dark.includes(unit.id)),
    }));
  };

  const hoveredUnit = placed.find((p) => p.unit.id === hovered);

  // Tablet widths can still pan the drawn plan; open it centered on
  // the viewer's store. (Phones get the native tile plan instead.)
  const scrollRef = useRef<HTMLDivElement>(null);
  const mobileGridRef = useRef<HTMLDivElement>(null);
  const mobileGridInView = useInView(mobileGridRef, {
    margin: "-15% 0px -15% 0px",
  });
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    const subject = placed.find((p) => p.unit.subject);
    if (subject) {
      el.scrollLeft =
        (el.scrollWidth * (subject.left + subject.width / 2)) / 100 -
        el.clientWidth / 2;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative">
      {/* ---------------- header ---------------- */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-[clamp(1.4rem,3vw,2rem)]">{center.name}</h3>
          <p className="mt-1.5 text-[0.9375rem] text-muted">
            {center.market} · 628,000 SF · fictional center, real clause
            mechanics
          </p>
        </div>
      </div>

      {/* scenario switcher — single-line segmented control */}
      <div className="scroll-x-clean mt-6 -mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        <div className="inline-flex min-w-max rounded-full border border-line bg-surface p-1.5 shadow-[0_1px_2px_rgba(20,20,46,0.05)]">
          {scenarios.map((s) => {
            const active = s.id === scenarioId && !touched;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => selectScenario(s.id)}
                className={cn(
                  "relative rounded-full px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors duration-300 sm:px-5",
                  active ? "text-cream" : "text-ink-soft hover:text-ink",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="scenario-pill"
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute inset-0 rounded-full bg-petrol-800"
                  />
                )}
                <span className="relative">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ---------------- outcome + plan ---------------- */}
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_384px] xl:gap-8">
        {/* plan column — second on phones so the outcome leads */}
        <div className="order-2 xl:order-1">
          <p className="mb-3 flex items-center gap-2.5 text-sm font-medium text-petrol-800">
            <span className="anim-pulse-dot h-1.5 w-1.5 shrink-0 rounded-full bg-petrol-600" />
            <span className="sm:hidden">
              Tap any storefront to close it — everything recalculates.
            </span>
            <span className="hidden sm:inline">
              Click any storefront to close it — everything recalculates
              instantly.
            </span>
          </p>

          {/* phone-native plan — only the storefronts your lease actually
              names, so every tap moves a test. The live bar pinned to the
              bottom of the screen reacts the instant you tap. */}
          <div className="sm:hidden" ref={mobileGridRef}>
            <p className="label text-muted">Named anchors</p>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {units
                .filter((u) => u.anchor && u.named)
                .map((u) => (
                  <MobileTile key={u.id} unit={u} onToggle={toggleUnit} tall />
                ))}
            </div>
            <p className="label mt-4 text-muted">Named inline stores + you</p>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {units
                .filter((u) => !u.anchor && (u.named || u.subject))
                .sort((a, b) => (a.subject ? -1 : b.subject ? 1 : 0))
                .map((u) => (
                  <MobileTile
                    key={u.id}
                    unit={u}
                    onToggle={toggleUnit}
                    breached={evaluation.triggered}
                  />
                ))}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              Tap a store to close or reopen it. The other 23 storefronts stay
              as the scenario sets them — the drawn plan on larger screens
              shows every unit.
            </p>
          </div>

          {/* live outcome bar — pinned while the tiles are on screen */}
          <AnimatePresence>
            {mobileGridInView && (
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 24 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="fixed inset-x-3 bottom-3 z-40 sm:hidden"
              >
                <motion.div
                  key={`${evaluation.triggered}-${evaluation.curing}`}
                  initial={{ scale: 0.97 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.25 }}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-full px-4 py-3 shadow-xl backdrop-blur-md",
                    evaluation.triggered
                      ? "bg-brass-500 text-petrol-950"
                      : "bg-petrol-900/95 text-cream",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className={cn(
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        evaluation.triggered
                          ? "anim-pulse-dot bg-petrol-950"
                          : evaluation.curing
                            ? "bg-brass-400"
                            : "bg-open-600",
                      )}
                    />
                    <span className="truncate text-[0.8125rem] font-semibold">
                      {evaluation.triggered
                        ? `${evaluation.tests.filter((t) => t.status === "breached").length} tests failed · potential trigger`
                        : evaluation.curing
                          ? "Cure window running"
                          : "All tests satisfied"}
                    </span>
                  </span>
                  <span className="tnum shrink-0 text-[0.9375rem] font-bold">
                    {usd(evaluation.monthlyDelta)}/mo
                  </span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative hidden sm:block">
            <div
              ref={scrollRef}
              className="scroll-x-clean -mx-5 overflow-x-auto px-5 sm:mx-0 sm:overflow-visible sm:px-0"
            >
              <div className="min-w-[760px] sm:min-w-0">
                <div
                  className="relative aspect-1000/620 w-full overflow-hidden rounded-xl border border-line bg-linear-to-b from-surface to-petrol-50/50 lift"
                  onMouseLeave={() => setHovered(null)}
                >
                  <div className="plan-grid absolute inset-0 opacity-60" />

                  {[corridor, northCourt, southCourt].map((c, i) => (
                    <div
                      key={i}
                      className="absolute rounded-sm bg-petrol-50"
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

          </div>

          {/* plain-language legend */}
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2.5">
            <LegendKey label="Your store">
              <span className="h-3 w-3 rounded-[3px] bg-surface ring-2 ring-petrol-700" />
            </LegendKey>
            <LegendKey label="Open (color = category)">
              <span className="flex -space-x-0.5">
                <span className="h-3 w-2 rounded-l-[3px]" style={{ backgroundColor: categoryColor.Apparel }} />
                <span className="h-3 w-2" style={{ backgroundColor: categoryColor.Beauty }} />
                <span className="h-3 w-2 rounded-r-[3px]" style={{ backgroundColor: categoryColor.Home }} />
              </span>
            </LegendKey>
            <LegendKey label="Closed">
              <span className="h-3 w-3 rounded-[3px] bg-petrol-900" />
            </LegendKey>
            <LegendKey label="Vacant">
              <span className="h-3 w-3 rounded-[3px] border border-dashed border-muted" />
            </LegendKey>
            <LegendKey label="Named in your lease">
              <span className="h-3 w-3 rounded-[3px] bg-brass-500" />
            </LegendKey>
          </div>
        </div>

        {/* outcome rail — first on phones */}
        <div className="order-1 flex flex-col gap-4 xl:order-2">
          <OutcomeCard
            evaluation={evaluation}
            darkCount={darkCount}
            monthsElapsed={monthsElapsed}
          />
          <LeaseMathCard evaluation={evaluation} />
        </div>
      </div>

      {/* ---------------- narration ---------------- */}
      <AnimatePresence mode="wait">
        <motion.div
          key={touched ? "custom" : scenario.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="mt-7 border-t border-line pt-6"
        >
          <p className="no-orphan max-w-3xl text-[1.0625rem] leading-relaxed text-ink-soft">
            {touched ? (
              <>
                <span className="font-medium text-petrol-800">
                  Your scenario.{" "}
                </span>
                Breakpoint re-runs every test as the center changes — the same
                arithmetic, across every lease you hold, from one store to
                thousands.
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

/* ==================================================================
   The outcome — the business answer, before the math
   ================================================================== */

function OutcomeCard({
  evaluation,
  darkCount,
  monthsElapsed,
}: {
  evaluation: Evaluation;
  darkCount: number;
  monthsElapsed: number;
}) {
  const status = evaluation.triggered
    ? "trigger"
    : evaluation.curing
      ? "cure"
      : "clear";
  const amount = useCountUp(evaluation.monthlyDelta);
  const failed = evaluation.tests.filter((t) => t.status === "breached");
  const forgone = leaseEconomics.monthlyDelta * monthsElapsed;

  return (
    <motion.div
      layout
      className={cn(
        "rounded-xl border p-5 transition-colors duration-500 sm:p-6",
        status === "trigger"
          ? "border-brass-500/60 bg-brass-50"
          : status === "cure"
            ? "border-brass-200 bg-surface lift"
            : "border-line bg-surface lift",
      )}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "h-2 w-2 shrink-0 rounded-full",
            status === "trigger"
              ? "anim-pulse-dot bg-brass-500"
              : status === "cure"
                ? "bg-brass-400"
                : "bg-open-600",
          )}
        />
        <span
          className={cn(
            "label",
            status === "trigger"
              ? "text-brass-700"
              : status === "cure"
                ? "text-brass-700"
                : "text-open-700",
          )}
        >
          {status === "trigger"
            ? "Potential trigger detected"
            : status === "cure"
              ? "Cure window running"
              : "No potential remedy detected"}
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={status}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="mt-3 flex items-baseline gap-1.5">
            <span
              className={cn(
                "tnum font-display text-[2.75rem] leading-none",
                status === "trigger" ? "text-brass-700" : "text-faint",
              )}
            >
              {usd(amount)}
            </span>
            <span className="text-sm text-muted">/mo est.</span>
          </div>

          {status === "trigger" ? (
            <div className="mt-4 space-y-3 border-t border-brass-200 pt-4">
              <p className="text-sm leading-relaxed text-ink-soft">
                ≈ <span className="tnum font-semibold text-ink">{usd(evaluation.annualDelta)}</span>{" "}
                per year in potential rent relief on this store.
              </p>
              <div>
                <span className="label text-muted">What changed</span>
                <ul className="mt-2 space-y-1.5">
                  <li className="text-[0.8125rem] leading-snug text-ink-soft">
                    {darkCount} storefront{darkCount === 1 ? "" : "s"} closed in
                    this scenario
                  </li>
                  {failed.map((t) => (
                    <li key={t.id} className="text-[0.8125rem] leading-snug text-ink-soft">
                      <span className="font-medium text-ink">{t.label}</span> —{" "}
                      {t.observed}
                    </li>
                  ))}
                </ul>
              </div>
              {monthsElapsed > 0 && (
                <p className="rounded-lg bg-clay-50 px-3 py-2 text-[0.8125rem] leading-snug text-clay-700">
                  ≈ {usd(forgone)} in potential savings already missed —{" "}
                  {monthsElapsed} months undetected before this evaluation.
                </p>
              )}
              <p className="text-[0.8125rem] leading-relaxed text-muted">
                Any remedy would begin only after written notice. Breakpoint
                would assemble the review package for your team and counsel.
              </p>
            </div>
          ) : status === "cure" ? (
            <p className="mt-4 border-t border-line pt-4 text-sm leading-relaxed text-ink-soft">
              A test would fail, but the landlord&#8217;s{" "}
              {90}
              -day cure window is still open — nothing is claimable yet.
              Breakpoint tracks the window so the day it lapses, you know.
            </p>
          ) : (
            <p className="mt-4 border-t border-line pt-4 text-sm leading-relaxed text-ink-soft">
              Every co-tenancy test in this lease is currently satisfied. Close
              a storefront on the map — or pick a scenario above — and watch
              the lease react.
            </p>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

/* ==================================================================
   The math — credibility on demand, beneath the outcome
   ================================================================== */

function LeaseMathCard({ evaluation }: { evaluation: Evaluation }) {
  const occupancy = useCountUp(evaluation.occupancyPct * 100, 0.7);
  return (
    <div className="rounded-xl border border-line bg-surface p-5 lift sm:p-6">
      <div className="flex items-baseline justify-between">
        <span className="label text-muted">The lease math</span>
        <span className="text-xs text-faint">§ 4.3</span>
      </div>

      <div className="mt-4 flex items-baseline justify-between gap-3">
        <span className="text-sm text-ink-soft">Occupied space</span>
        <span
          className={cn(
            "tnum font-display text-xl leading-none",
            evaluation.occupancyPct < 0.7 ? "text-brass-600" : "text-petrol-800",
          )}
        >
          {occupancy.toFixed(1)}%
        </span>
      </div>
      <div className="relative mt-2.5 h-2 overflow-hidden rounded-full bg-surface-sunk">
        <motion.div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full transition-colors duration-500",
            evaluation.occupancyPct < 0.7 ? "bg-brass-500" : "bg-open-600",
          )}
          animate={{ width: `${evaluation.occupancyPct * 100}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
        <div className="absolute inset-y-0 w-px bg-ink/45" style={{ left: "70%" }} />
      </div>
      <p className="tnum mt-1.5 text-[0.6875rem] text-muted">
        {sf(evaluation.occupiedInlineGla)} of {sf(evaluation.totalInlineGla)}{" "}
        non-anchor space · lease floor 70%
      </p>

      <ul className="mt-5 space-y-3.5 border-t border-line pt-4">
        {evaluation.tests.map((t) => (
          <li key={t.id}>
            <TestRow {...t} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/** A storefront as a thumb-sized tile — the phone-native plan. */
function MobileTile({
  unit,
  onToggle,
  breached,
  tall,
}: {
  unit: Unit;
  onToggle: (u: Unit) => void;
  breached?: boolean;
  tall?: boolean;
}) {
  const isDark = unit.status === "dark";
  const isVacant = unit.status === "vacant";
  return (
    <button
      type="button"
      disabled={isVacant || unit.subject}
      onClick={() => onToggle(unit)}
      aria-label={`${unit.name} — ${unit.status}`}
      className={cn(
        "relative flex flex-col items-center justify-center rounded-lg px-1 text-center transition-colors duration-300",
        tall ? "h-16" : "h-14",
        isVacant
          ? "border border-dashed border-muted/70 bg-transparent"
          : unit.subject
            ? cn(
                "bg-surface ring-2 ring-inset",
                breached
                  ? "ring-brass-500 shadow-[0_0_0_3px_rgba(217,154,43,0.25)]"
                  : "ring-petrol-700",
              )
            : isDark
              ? "bg-petrol-900 text-cream-soft"
              : "shadow-[0_1px_2px_rgba(20,20,46,0.08)] ring-1 ring-inset ring-petrol-800/25",
      )}
      style={
        !isVacant && !isDark && !unit.subject
          ? { backgroundColor: categoryColor[unit.category] }
          : undefined
      }
    >
      {unit.named && !isVacant && (
        <span
          className={cn(
            "absolute right-1 top-1 h-1.5 w-1.5 rounded-[1px]",
            isDark ? "bg-brass-400/70" : "bg-brass-500",
          )}
        />
      )}
      {unit.subject ? (
        <>
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[0.5625rem] font-bold",
              breached ? "bg-brass-500 text-petrol-950" : "bg-petrol-800 text-cream",
            )}
          >
            YOU
          </span>
          <span className="mt-0.5 text-[0.5625rem] font-medium text-ink">
            Unit 214
          </span>
        </>
      ) : (
        <span
          className={cn(
            "line-clamp-2 text-[0.625rem] leading-tight font-medium",
            isDark ? "text-cream-soft" : isVacant ? "text-faint" : "text-ink",
          )}
        >
          {isVacant ? "Vacant" : unit.name}
        </span>
      )}
    </button>
  );
}

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
        !isVacant && !unit.subject && "cursor-pointer",
        unit.subject && "cursor-default",
        isDark ? "ring-petrol-950" : "ring-petrol-800/30",
        !isVacant && "shadow-[0_1px_2px_rgba(20,20,46,0.08)]",
        isVacant && "ring-0",
        isHovered && !unit.subject && "z-20 shadow-[0_0_0_2px_var(--color-petrol-600)]",
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
          : unit.subject
            ? "#ffffff"
            : isDark
              ? "#191553"
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
              "absolute inset-0 rounded-[3px] ring-inset transition-all duration-500",
              breached
                ? "ring-[2.5px] ring-brass-500 shadow-[0_0_0_4px_rgba(217,154,43,0.25)]"
                : "ring-[2.5px] ring-petrol-700 shadow-[0_0_0_4px_rgba(79,70,229,0.15)]",
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
          "rounded-md px-2 py-1 text-[0.625rem] font-semibold whitespace-nowrap shadow-md transition-colors duration-500",
          breached ? "bg-brass-500 text-petrol-950" : "bg-petrol-800 text-cream",
        )}
      >
        Your store
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
  const { unit, left, top, width, height } = placed;
  // The plan clips its overflow, so a tooltip above a top-row unit
  // would be cut off — flip it underneath instead.
  const flipDown = top < 24;
  return (
    <div
      className="pointer-events-none absolute z-30"
      style={{
        left: `${Math.min(Math.max(left + width / 2, 13), 87)}%`,
        top: flipDown ? `${top + height}%` : `${top}%`,
        transform: flipDown ? "translate(-50%, 10px)" : "translate(-50%, -112%)",
      }}
    >
      <div className="min-w-44 rounded-lg border border-line bg-petrol-900 px-3 py-2.5 shadow-xl">
        <p className="text-[0.8125rem] font-medium text-cream">
          {unit.subject ? "Your store · Unit 214" : unit.name}
        </p>
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
                ? "Closed"
                : "Vacant"}
          </span>
        </div>
        {unit.named && (
          <p className="label mt-1.5 text-brass-400">Named in your lease</p>
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
        : { dot: "bg-brass-500", text: "text-brass-700", word: "Not met" };

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
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <span className="flex items-center gap-2">
      {children}
      <span className="text-xs font-medium text-ink-soft">{label}</span>
    </span>
  );
}

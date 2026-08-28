"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Check, RotateCcw, X } from "lucide-react";
import {
  type CenterFacts,
  type ClaimStatus,
  type Clause,
  type LeaseEconomics,
  type SuiteStatus,
  STATE_META,
  evaluateClause,
  formatCoTenancyRent,
  usd,
} from "@/lib/clause";
import { cn } from "@/lib/cn";
import { ActionButton, Pill, type Tone } from "./ui";

/**
 * THE CLAUSE SIMULATOR
 *
 * "If Macy's closes, do I have a claim?" is the question a retail real
 * estate team actually asks, and it is the one thing a lease
 * administration system cannot answer.
 *
 * This replaces an earlier center-plan view that drew the whole mall
 * from an invented rent roll. The named tenants a clause depends on
 * come from the lease itself, so the simulation is built on exactly
 * those and stays honest whatever else we do or do not hold.
 *
 * Toggle any of them closed and the requirement re-evaluates: which
 * limb fails, whether the clause as a whole is met, what happens next
 * and when.
 *
 * Occupancy limbs are shown but not toggleable. Where the center's
 * published directory gives us the roster we compute the percentage
 * and show it; where it does not, we say the landlord's report is
 * needed rather than estimating. Either way it is not something a
 * reader should be able to move with a click, because it is an
 * aggregate over the whole center rather than one store's status.
 */

type Props = {
  center: CenterFacts;
  clause: Clause;
  econ: LeaseEconomics;
  claim: ClaimStatus;
  asOf: string;
};

export function ClauseSimulator({ center, clause, econ, claim, asOf }: Props) {
  const [overrides, setOverrides] = useState<Record<string, SuiteStatus>>({});

  /** Every named store this clause depends on, with its live status. */
  const watched = useMemo(() => {
    const ids = new Set<string>();
    for (const t of clause.triggers) {
      if (t.kind === "named_tenant") t.names.forEach((n) => ids.add(n));
      else if (t.kind === "tenant_count") t.pool.forEach((n) => ids.add(n));
    }
    return [...ids]
      .map((id) => center.suites.find((s) => s.id === id))
      .filter(Boolean) as CenterFacts["suites"];
  }, [clause, center]);

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

  const dirty = Object.keys(overrides).length > 0;
  const stateTone = STATE_META[live.state].tone as Tone;

  const toggle = (id: string, current: SuiteStatus) =>
    setOverrides((prev) => {
      const next = { ...prev };
      const original = center.suites.find((s) => s.id === id)?.status;
      const target: SuiteStatus = current === "open" ? "dark" : "open";
      if (target === original) delete next[id];
      else next[id] = target;
      return next;
    });

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
        <div>
          <p className="text-[0.75rem] font-medium text-slate-500">
            Co-tenancy requirement
          </p>
          <h2 className="mt-0.5 text-[1.0625rem] font-semibold text-slate-900">
            {clause.locations[0]}
          </h2>
          <p className="mt-1 text-[0.8125rem] text-slate-500">
            {live.requirementText}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Pill tone={stateTone} dot>
            {STATE_META[live.state].label}
          </Pill>
          {dirty && (
            <ActionButton variant="secondary" onClick={() => setOverrides({})}>
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </ActionButton>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.15fr_1fr]">
        {/* ---- the named tenants ---- */}
        <div className="border-b border-slate-200 p-5 lg:border-b-0 lg:border-r sm:p-6">
          <p className="text-[0.8125rem] font-medium text-slate-900">
            Named in this lease
          </p>
          <p className="mt-1 text-[0.75rem] text-slate-500">
            Click any to model it closing.
          </p>

          <ul className="mt-4 space-y-2">
            {watched.map((s) => {
              const status = overrides[s.id] ?? s.status;
              const open = status === "open";
              const changed = Boolean(overrides[s.id]);
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => toggle(s.id, status)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors duration-200",
                      open
                        ? "border-slate-200 bg-white hover:border-indigo-300"
                        : "border-rose-100 bg-rose-50",
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-8 w-8 shrink-0 place-items-center rounded-lg",
                        open
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-rose-100 text-rose-700",
                      )}
                    >
                      {open ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[0.875rem] font-medium text-slate-900">
                        {s.name}
                      </span>
                      <span className="block text-[0.75rem] text-slate-500 capitalize">
                        {s.kind} · {open ? "open and operating" : "closed"}
                        {changed && (
                          <span className="ml-1.5 text-indigo-700">modeled</span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {watched.length === 0 && (
            <p className="mt-4 rounded-xl border border-slate-200 bg-slate-100 p-4 text-[0.8125rem] text-slate-500">
              This clause names no specific tenants. It turns on an occupancy
              threshold alone, which requires the landlord&#8217;s report.
            </p>
          )}
        </div>

        {/* ---- what it does ---- */}
        <div className="p-5 sm:p-6">
          <p className="text-[0.8125rem] font-medium text-slate-900">Result</p>

          <div
            className={cn(
              "mt-3 rounded-xl border p-4",
              live.requirementMet
                ? "border-emerald-100 bg-emerald-50"
                : "border-rose-100 bg-rose-50",
            )}
          >
            <p
              className={cn(
                "text-[0.9375rem] font-semibold",
                live.requirementMet ? "text-emerald-700" : "text-rose-700",
              )}
            >
              {live.requirementMet
                ? "Requirement met"
                : "Requirement not met"}
            </p>
            <p className="mt-1 text-[0.8125rem] leading-snug text-slate-700">
              {live.requirementMet
                ? "No co-tenancy right arises on these conditions."
                : STATE_META[live.state].blurb}
            </p>
          </div>

          {/* limb by limb */}
          <ul className="mt-4 space-y-2.5">
            {live.triggers.map((t) => (
              <li
                key={t.id}
                className="flex items-start gap-2.5 border-b border-slate-200 pb-2.5 last:border-0"
              >
                <span
                  className={cn(
                    "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
                    t.failing ? "bg-rose-500" : "bg-emerald-600",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[0.8125rem] font-medium text-slate-900">
                    {t.label}
                    <span className="ml-1.5 font-normal text-slate-400">{t.cite}</span>
                  </p>
                  <p className="text-[0.75rem] text-slate-500">{t.requirement}</p>
                  <p
                    className={cn(
                      "text-[0.75rem] font-medium",
                      t.failing ? "text-rose-600" : "text-slate-700",
                    )}
                  >
                    {t.computability === "observable"
                      ? t.observed
                      : "Needs the landlord's occupancy report"}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          {/* what happens next */}
          {!live.requirementMet && (
            <motion.dl
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="mt-4 space-y-2 rounded-xl border border-slate-200 bg-slate-100 p-4"
            >
              <Row
                k="Landlord's window"
                v={
                  clause.remedy.cureDays === 0
                    ? "None"
                    : `${clause.remedy.cureDays} ${clause.remedy.cureBasis} days`
                }
              />
              <Row
                k="Notice required"
                v={clause.remedy.noticeRequired ? "Yes" : "No"}
              />
              <Row
                k="Co-tenancy rent"
                v={formatCoTenancyRent(live.monthlyDelta)}
              />
              {clause.remedy.capMonths && (
                <Row
                  k="Termination available"
                  v={`After ${clause.remedy.capMonths} months`}
                />
              )}
            </motion.dl>
          )}

          {dirty && (
            <p className="mt-3 text-[0.75rem] leading-relaxed text-indigo-700">
              Modeled, not observed. As observed today this lease is{" "}
              {STATE_META[baseline.state].label.toLowerCase()}.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-[0.75rem] text-slate-500">{k}</dt>
      <dd className="tnum text-[0.8125rem] font-medium text-slate-900">{v}</dd>
    </div>
  );
}

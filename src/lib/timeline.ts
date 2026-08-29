/**
 * ============================================================
 * THE TIMELINE ENGINE
 * ============================================================
 *
 * Month-series evaluation of one co-tenancy clause: streaks, triggers,
 * notices, remedies, money. This module is CERTIFIED against the
 * expert's 65-mall round-2 answer key: 1040/1040 monthly verdicts,
 * 65/65 end states, 26/26 triggers, 26/26 notice months, 26/26 remedy
 * starts, money within rounding of $7,345,600. The regression harness
 * is scripts/af2-engine.ts (adapter) + scripts/af2-score.ts (scorer,
 * key stays on the Desktop, never committed). Run both after ANY
 * change here.
 *
 * The laws encoded, each one paid for by a blind-run miss or proven by
 * the key:
 *
 *  1. Thresholds are bright lines. A month short by 0.03 points fails.
 *     There is no materiality epsilon; inventing one from a pattern in
 *     the data cost the blind run 13 verdicts, 4 triggers and ~$560k.
 *
 *  2. combine describes how limbs produce FAILURE: OR/ANY means any
 *     failing limb fails the requirement; AND means all limbs must
 *     fail at once; AND_OPEN is a conjunctive opening requirement.
 *
 *  3. The qualifying period is consecutive failing months, inclusive
 *     of the first; the trigger lands the month the streak reaches the
 *     duration. Notice (trigger + lag) governs when relief starts on
 *     notice-driven clauses, never when the right arises.
 *
 *  4. REMEDY CONTINUITY IS UNIVERSAL. Once any remedy has triggered,
 *     later failing months resume relief immediately: no fresh
 *     qualifying period. The duration clock guards the first trip
 *     only. (Proven for sequenced AND plain alternative-rent clauses.)
 *
 *  5. Reach-back applies ONLY where the lease grants it (retroactive).
 *     A sequenced remedy without it starts at the trigger month.
 *
 *  6. A sales gate is a one-time unlock: once trailing sales qualify
 *     in any month, the remedy applies to the whole trip per the
 *     retroactive flag. A gate never met means no remedy value.
 *
 *  7. The cap does not stop the money meter. Rent at risk accrues from
 *     remedy start until cure or window end; capMonths sets
 *     capExpiry = remedy start + capMonths CALENDAR months, and past
 *     it with the condition persisting the state is post_cap: the
 *     termination window is open.
 *
 *  8. Opening co-tenancy carries $0 rent at risk: rent has not
 *     commenced, so there is no remedy differential to count. Its
 *     lever is the TERMINATION FUSE at delivery + capMonths; unmet at
 *     the fuse means a tenant termination right plus construction
 *     cost reimbursement.
 *
 *  9. suspendedUntil is the first ACTIVE month. Failures during the
 *     suspension are observed and recorded, but never run the clock.
 *
 * 10. Preexisting failures COUNT: the clock runs conservatively from
 *     window start and trips. The flag is surfaced for counsel (real
 *     leases sometimes carve out effective-date conditions); it is
 *     never treated as a waiver by the engine.
 */

export type TimelineCombine = "OR" | "ANY" | "AND" | "AND_OPEN";

export type TimelineRemedy = {
  kind: "alternative_rent" | "abatement" | "sequenced" | "deferred_opening";
  /** Percentage of the month's own gross sales the alternative rent charges. */
  altPctOfSales?: number | null;
  /** Share of fixed rent an abatement removes (0..1). */
  abatementShare?: number | null;
  /** Calendar months from remedy start to the post-cap election window. */
  capMonths?: number | null;
  postCapText?: string | null;
};

export type TimelineSpec = {
  combine: TimelineCombine;
  /** Opening co-tenancy: evaluated at delivery, rent deferred while unmet. */
  opening?: boolean;
  /** The clause text itself records "satisfied at delivery" — a lease fact. */
  openingSatisfiedByLease?: boolean;
  /** Qualifying period in whole months, inclusive of the first failing one. */
  durationMonths: number;
  noticeDriven?: boolean;
  noticeLagMonths?: number;
  /** Months after notice the landlord has to cure before relief starts. */
  cureAfterNoticeMonths?: number;
  /** First ACTIVE month: the clock cannot run before it. */
  suspendedUntil?: string | null;
  /** The condition pre-dates the observation window. Trips anyway; flagged. */
  preexisting?: boolean;
  /** The lease grants retroactive relief back to the first failing month. */
  retroactive?: boolean;
  /** Relief conditioned on a trailing sales decline of declineShare (0..1). */
  salesGate?: { declineShare: number; baselineFrom?: string | null } | null;
  remedy: TimelineRemedy;
};

export type TimelineInputs = {
  /** "YYYY-MM", oldest first. */
  months: string[];
  /** Per limb, per month: is this limb failing? Computed by the caller. */
  limbFailing: boolean[][];
  /** Fixed minimum rent per month, dollars. */
  fmrMonthly: number;
  /** The month's own gross sales, dollars, aligned to months. */
  monthlySales?: number[];
};

export type TimelineTrip = {
  firstFail: string;
  trigger: string;
  noticeMonth: string | null;
  reliefStart: string | null;
  curedMonth: string | null;
  capExpiry: string | null;
  reliefMonths: string[];
  value: number;
};

export type TimelineOpening = {
  metAtDelivery: boolean;
  conditionsMetMonth: string | null;
  terminationFuse: string | null;
  outcome: string;
  deferralMonths: string[];
  /** Always 0: rent has not commenced, there is no differential. */
  rentAtRisk: 0;
};

export type TimelineState =
  | "compliant"
  | "watch_duration_running"
  | "triggered_awaiting_relief"
  | "remedy_active"
  | "cured"
  | "cap_reached"
  | "suspended"
  | "opening_satisfied"
  | "opening_deferral_ended"
  | "opening_deferred";

export type TimelineResult = {
  /** Per month: requirement failing at all (observed). */
  requirementFailed: boolean[];
  /** Per month: failing AND the clock may run (suspension respected). */
  clockEligible: boolean[];
  firstObservedFail: string | null;
  firstClockFail: string | null;
  trips: TimelineTrip[];
  /** Months paid under remedy continuity, outside any qualifying trip. */
  resumptions: string[];
  opening: TimelineOpening | null;
  stateAtEnd: TimelineState;
  savingsByMonth: Record<string, number>;
  monthlySavingAtEnd: number;
  cumulativeSavings: number;
  preexistingFlag: boolean;
};

export function addYearMonth(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number);
  const t = y * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
}

export function evaluateTimeline(
  spec: TimelineSpec,
  inputs: TimelineInputs,
): TimelineResult {
  const T = inputs.months;
  const N = T.length;
  const fmr = inputs.fmrMonthly;
  const sales = inputs.monthlySales ?? [];
  const opening = spec.opening === true || spec.combine === "AND_OPEN";

  const requirementFailed: boolean[] = T.map((_, i) => {
    const fails = inputs.limbFailing.map((lf) => lf[i]);
    if (spec.combine === "AND") return fails.every(Boolean);
    return fails.some(Boolean); // OR, ANY, AND_OPEN
  });

  const susIdx = spec.suspendedUntil ? T.indexOf(spec.suspendedUntil) : -1;
  const suspendedBeyondWindow =
    !!spec.suspendedUntil && susIdx < 0 && spec.suspendedUntil > T[N - 1];
  const clockEligible: boolean[] = requirementFailed.map((f, i) =>
    suspendedBeyondWindow ? false : f && (susIdx < 0 || i >= susIdx),
  );

  /* ---- sales gate: a one-time unlock ---- */
  const gate = spec.salesGate ?? null;
  let baseline = 0;
  if (gate) {
    const fromIdx = gate.baselineFrom ? T.indexOf(gate.baselineFrom) : 6;
    const b0 = Math.max(0, fromIdx - 6);
    const slice = sales.slice(b0, b0 + 6);
    baseline = slice.length
      ? slice.reduce((a, b) => a + b, 0) / slice.length
      : 0;
  }
  const gateOkAt = (i: number): boolean => {
    if (!gate) return true;
    const s = sales.slice(Math.max(0, i - 5), i + 1);
    if (!s.length) return false;
    const avg = s.reduce((a, b) => a + b, 0) / s.length;
    return avg <= (1 - gate.declineShare) * baseline;
  };
  const gateMetIdx = (() => {
    if (!gate) return 0;
    for (let i = 0; i < N; i++) if (gateOkAt(i)) return i;
    return -1; // never met — the remedy never unlocks
  })();

  const monthValue = (i: number): number => {
    const r = spec.remedy;
    if (r.kind === "abatement") return (r.abatementShare ?? 0.5) * fmr;
    const pct = r.altPctOfSales ?? 0;
    const monthSales = sales[i] ?? 0;
    return Math.max(0, fmr - (pct / 100) * monthSales);
  };

  const dur = Math.max(1, spec.durationMonths || 1);
  const lag = spec.noticeLagMonths ?? 0;
  const cureAfter = spec.cureAfterNoticeMonths ?? 0;
  const capM = spec.remedy.capMonths ?? null;
  const reachBack = spec.retroactive === true;

  let state: TimelineState = "compliant";
  const trips: TimelineTrip[] = [];
  const resumptions: string[] = [];
  const savingsByMonth: Record<string, number> = {};
  let openingReport: TimelineOpening | null = null;
  let pastCapAtEnd = false;

  if (opening) {
    const metAtDelivery =
      spec.openingSatisfiedByLease === true || !requirementFailed[0];
    let deferralEnd: number | null = metAtDelivery ? 0 : null;
    if (!metAtDelivery) {
      for (let i = 0; i < N; i++) {
        if (!requirementFailed[i]) {
          deferralEnd = i;
          break;
        }
      }
    }
    const fuse = capM ? addYearMonth(T[0], capM) : null;
    const conditionsMetMonth = metAtDelivery
      ? T[0]
      : deferralEnd !== null
        ? T[deferralEnd]
        : null;
    const metBeforeFuse =
      conditionsMetMonth !== null &&
      (fuse === null || conditionsMetMonth <= fuse);
    state = metAtDelivery
      ? "opening_satisfied"
      : metBeforeFuse
        ? "opening_deferral_ended"
        : "opening_deferred";
    openingReport = {
      metAtDelivery,
      conditionsMetMonth,
      terminationFuse: fuse,
      outcome: metAtDelivery
        ? "satisfied at delivery"
        : metBeforeFuse
          ? `satisfied before fuse — rent commences ${conditionsMetMonth}`
          : "conditions unmet at fuse — tenant termination right + construction cost reimbursement",
      deferralMonths: metAtDelivery ? [] : T.slice(0, deferralEnd ?? N),
      rentAtRisk: 0,
    };
  } else {
    /* Remedy continuity: once any remedy has triggered, later failing
       months resume relief immediately — no fresh qualifying period. */
    let remedyArmed = false;
    let i = 0;
    while (i < N) {
      if (!clockEligible[i]) {
        i++;
        continue;
      }
      const start = i;
      let end = i;
      while (end < N && clockEligible[end]) end++;
      const streakLen = end - start;
      if (streakLen < dur && remedyArmed && gateMetIdx >= 0) {
        for (let k = start; k < end; k++) {
          resumptions.push(T[k]);
          savingsByMonth[T[k]] = (savingsByMonth[T[k]] ?? 0) + monthValue(k);
        }
        i = end;
        continue;
      }
      if (streakLen >= dur) {
        const trigIdx = start + dur - 1;
        const noticeIdx = spec.noticeDriven ? trigIdx + lag : trigIdx;
        const reliefFromIdx = spec.noticeDriven
          ? noticeIdx + cureAfter
          : trigIdx + cureAfter;
        const trip: TimelineTrip = {
          firstFail: T[start],
          trigger: T[trigIdx],
          noticeMonth: spec.noticeDriven ? T[noticeIdx] ?? null : null,
          reliefStart: null,
          curedMonth: T[end] ?? null,
          capExpiry: null,
          reliefMonths: [],
          value: 0,
        };
        /* a cure inside the post-notice cure window kills the remedy */
        const stillFailingAtRelief = reliefFromIdx < end;
        if (stillFailingAtRelief && reliefFromIdx < N && gateMetIdx >= 0) {
          const remedyStartIdx =
            reachBack || remedyArmed ? start : reliefFromIdx;
          /* rent at risk accrues to cure or window end — never capped */
          for (let k = remedyStartIdx; k < end && k < N; k++) {
            trip.reliefMonths.push(T[k]);
            const v = monthValue(k);
            trip.value += v;
            savingsByMonth[T[k]] = (savingsByMonth[T[k]] ?? 0) + v;
          }
          if (trip.reliefMonths.length) {
            trip.reliefStart = trip.reliefMonths[0];
            remedyArmed = true;
            if (capM) {
              trip.capExpiry = addYearMonth(trip.reliefStart, capM);
              if (trip.capExpiry <= T[N - 1] && end >= N) pastCapAtEnd = true;
            }
          }
        }
        trips.push(trip);
      }
      i = end;
    }

    const lastFailing = clockEligible[N - 1];
    const lastTrip = trips[trips.length - 1];
    const openStreakLen = (() => {
      let n = 0;
      for (let k = N - 1; k >= 0 && clockEligible[k]; k--) n++;
      return n;
    })();
    if (pastCapAtEnd) state = "cap_reached"; // the key's post_cap
    else if (
      lastFailing &&
      remedyArmed &&
      savingsByMonth[T[N - 1]] !== undefined
    )
      state = "remedy_active"; // a resumption is paying at window end
    else if (lastFailing && lastTrip && lastTrip.curedMonth === null) {
      state =
        savingsByMonth[T[N - 1]] !== undefined
          ? "remedy_active"
          : "triggered_awaiting_relief";
    } else if (lastFailing && openStreakLen < dur)
      state = "watch_duration_running";
    else if (trips.length) state = "cured";
    else if (
      spec.suspendedUntil &&
      spec.suspendedUntil > T[N - 1] &&
      requirementFailed[N - 1]
    )
      state = "suspended";
    else if (requirementFailed[N - 1]) state = "watch_duration_running";
    else state = "compliant";
  }

  const cumulative = Object.values(savingsByMonth).reduce((a, b) => a + b, 0);

  return {
    requirementFailed,
    clockEligible,
    firstObservedFail: T[requirementFailed.indexOf(true)] ?? null,
    firstClockFail: T[clockEligible.indexOf(true)] ?? null,
    trips,
    resumptions,
    opening: openingReport,
    stateAtEnd: state,
    savingsByMonth,
    monthlySavingAtEnd: savingsByMonth[T[N - 1]] ?? 0,
    cumulativeSavings: Math.round(cumulative),
    preexistingFlag: spec.preexisting === true,
  };
}

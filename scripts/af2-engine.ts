/**
 * ROUND-2 LEARNED ENGINE — the blind evaluator (af2-blind.ts, frozen at
 * a95e74b) corrected with the ground-truth conventions from the round-2
 * answer key. This file is the engine spec going forward.
 *
 *   node --experimental-strip-types scripts/af2-engine.ts
 *
 * Corrections learned from scoring the blind run:
 *  1. NO materiality epsilon — a pct month fails on the raw comparison,
 *     even by 0.03 points. The "bimodal margin" tier was designed drift,
 *     not a measurement-noise signal. (Blind guard cost 13 months, 4
 *     trips and ~$560k.)
 *  2. Reach-back applies ONLY when the clause says retroactive:true —
 *     a sequenced remedy without it starts at the trigger month.
 *  3. A sales gate is a one-time unlock: once trailing sales qualify in
 *     any month, the remedy applies to the whole trip per the
 *     retroactive flag (south_hills: gate met 2026-02, remedy runs from
 *     first fail 2025-04).
 *  4. Rent at risk accrues from remedy start until cure or window end —
 *     the cap does NOT stop the meter. cap_expiry = remedy_start +
 *     cap_m CALENDAR months; past it with the condition persisting the
 *     state is post_cap (termination window open).
 *  5. Opening co-tenancy carries $0 rent at risk (rent simply has not
 *     commenced — there is no remedy differential). Its lever is the
 *     termination fuse: delivery + cap_m months; conditions met before
 *     the fuse = rent commences that month; unmet at the fuse = tenant
 *     termination right + construction cost reimbursement.
 */
import { readFileSync, writeFileSync } from "node:fs";

const DATA = JSON.parse(
  readFileSync("C:/Users/Lucky/Desktop/af_portfolio_dataset (2).json", "utf8"),
);
const T: string[] = DATA.timeline; // 24 months, 2024-09..2026-08
const N = T.length;

const fold = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const addMonths = (ym: string, n: number): string => {
  const [y, m] = ym.split("-").map(Number);
  const t = y * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
};

type Limb = {
  id: string;
  type: "named" | "pct" | "count";
  name?: string;
  threshold?: number;
  basis?: "inline" | "total" | "zone";
  required?: number;
  pool?: string[];
};

type Trip = {
  firstFail: string;
  trigger: string;
  noticeMonth: string | null;
  reliefStart: string | null;
  curedMonth: string | null;
  capExpiry: string | null;
  reliefMonths: string[];
  value: number;
};

const predictions: Record<string, unknown> = {};

for (const [slug, mm] of Object.entries<any>(DATA.malls)) {
  const c = mm.clause;
  const limbs: Limb[] = c.limbs;
  const fmrMonthly = mm.af_store.annual_fmr / 12;
  const salesK: number[] = mm.af_store.monthly_sales_k;
  const opening = c.combine === "AND_OPEN" || c.opening === true;

  const closedFolded: Set<string>[] = mm.months.map(
    (mo: any) => new Set(mo.closed_stores.map((s: string) => fold(s))),
  );

  const pctSeries = (basis: string, i: number): number => {
    const mo = mm.months[i];
    if (basis === "total") return mo.total_open_pct;
    if (basis === "zone") return mo.zone_open_pct;
    return c.deemed_open_remodel ? mo.inline_open_pct_deemed : mo.inline_open_pct;
  };

  /* Raw comparison, no epsilon: the key fails a month short by 0.03. */
  const limbFailed = (l: Limb, i: number): boolean => {
    if (l.type === "named") return closedFolded[i].has(fold(l.name!));
    if (l.type === "pct") return pctSeries(l.basis!, i) < l.threshold!;
    const open = l.pool!.filter((p) => !closedFolded[i].has(fold(p))).length;
    return open < l.required!;
  };

  const limbFails: boolean[][] = limbs.map((l) =>
    T.map((_, i) => limbFailed(l, i)),
  );

  const requirementFailed: boolean[] = T.map((_, i) => {
    const fails = limbFails.map((lf) => lf[i]);
    if (c.combine === "AND") return fails.every(Boolean);
    return fails.some(Boolean); // OR, ANY, AND_OPEN
  });

  /* suspended_until = first ACTIVE month (verified: cielo trigger). */
  const susIdx = c.suspended_until ? T.indexOf(c.suspended_until) : -1;
  const clockEligible: boolean[] = requirementFailed.map(
    (f, i) => f && (susIdx < 0 || i >= susIdx),
  );

  /* ---- sales gate: a one-time unlock ---- */
  const gate = c.sales_gate ?? null;
  let baseline = 0;
  if (gate) {
    const fromIdx = c.sales_decline_from ? T.indexOf(c.sales_decline_from) : 6;
    const b0 = Math.max(0, fromIdx - 6);
    const slice = salesK.slice(b0, b0 + 6);
    baseline = slice.reduce((a, b) => a + b, 0) / slice.length;
  }
  const gateOkAt = (i: number): boolean => {
    if (!gate) return true;
    const s = salesK.slice(Math.max(0, i - 5), i + 1);
    const avg = s.reduce((a, b) => a + b, 0) / s.length;
    return avg <= (1 - gate) * baseline;
  };
  const gateMetIdx = (() => {
    if (!gate) return 0;
    for (let i = 0; i < N; i++) if (gateOkAt(i)) return i;
    return -1; // never met — remedy never unlocks
  })();

  const monthValue = (i: number): number => {
    const r = c.remedy;
    if (r.type === "abatement") {
      const m = /([0-9.]+)\s*%/.exec(r.alt ?? "");
      const share = m ? Number(m[1]) / 100 : 0.5;
      return share * fmrMonthly;
    }
    const pct = r.alt_pct ?? 0;
    return Math.max(0, fmrMonthly - (pct / 100) * salesK[i] * 1000);
  };

  const dur = Math.max(1, c.duration_m ?? 1);
  const lag = c.tenant_notice_lag_m ?? 0;
  const cureAfter = c.cure_after_notice_m ?? 0;
  const capM = c.remedy.cap_m ?? null;
  const reachBack = c.retroactive === true;

  let state = "compliant";
  const trips: Trip[] = [];
  const resumptions: string[] = [];
  const savingsByMonth: Record<string, number> = {};
  let openingReport: Record<string, unknown> | null = null;
  let pastCapAtEnd = false;

  if (opening) {
    /* ---- opening co-tenancy: $0 rent at risk; the lever is the
       termination fuse at delivery + cap_m months ---- */
    const satisfiedByLease = /opening_sat|satisfied at delivery/i.test(
      c.template ?? "",
    );
    const metAtDelivery = satisfiedByLease || !requirementFailed[0];
    let deferralEnd: number | null = metAtDelivery ? 0 : null;
    if (!metAtDelivery) {
      for (let i = 0; i < N; i++) {
        if (!requirementFailed[i]) {
          deferralEnd = i;
          break;
        }
      }
    }
    const fuse = capM ? addMonths(T[0], capM) : null;
    const conditionsMetMonth = metAtDelivery
      ? T[0]
      : deferralEnd !== null
        ? T[deferralEnd]
        : null;
    const metBeforeFuse =
      conditionsMetMonth !== null && (fuse === null || conditionsMetMonth <= fuse);
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
      deferralMonths: metAtDelivery
        ? []
        : T.slice(0, deferralEnd ?? N),
      rentAtRisk: 0, // rent has not commenced; no remedy differential
    };
  } else {
    /* ---- operating co-tenancy: streaks, trips, relief ---- */
    /* Remedy continuity (key: cherry_creek sequenced, mall_of_america
       alternative_rent): once ANY remedy has triggered, later failing
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
          const v = monthValue(k);
          savingsByMonth[T[k]] = (savingsByMonth[T[k]] ?? 0) + v;
        }
        i = end;
        continue;
      }
      if (streakLen >= dur) {
        const trigIdx = start + dur - 1;
        const noticeIdx = c.notice_driven ? trigIdx + lag : trigIdx;
        const reliefFromIdx = c.notice_driven
          ? noticeIdx + cureAfter
          : trigIdx + cureAfter;
        const trip: Trip = {
          firstFail: T[start],
          trigger: T[trigIdx],
          noticeMonth: c.notice_driven ? T[noticeIdx] ?? null : null,
          reliefStart: null,
          curedMonth: T[end] ?? null,
          capExpiry: null,
          reliefMonths: [],
          value: 0,
        };
        /* cure inside the post-notice cure window kills the remedy */
        const stillFailingAtRelief = reliefFromIdx < end;
        const gateUnlocked = gateMetIdx >= 0;
        if (stillFailingAtRelief && reliefFromIdx < N && gateUnlocked) {
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
            remedyArmed = true; // any remedy type: continuity is universal
            if (capM) {
              trip.capExpiry = addMonths(trip.reliefStart, capM);
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
    if (pastCapAtEnd) state = "cap_reached"; // = the key's post_cap
    else if (lastFailing && remedyArmed && savingsByMonth[T[N - 1]] !== undefined)
      state = "remedy_active"; // a resumption is paying at window end
    else if (lastFailing && lastTrip && lastTrip.curedMonth === null) {
      state =
        savingsByMonth[T[N - 1]] !== undefined
          ? "remedy_active"
          : "triggered_awaiting_relief";
    } else if (lastFailing && openStreakLen < dur) state = "watch_duration_running";
    else if (trips.length) state = "cured";
    else if (
      c.suspended_until &&
      c.suspended_until > T[N - 1] &&
      requirementFailed[N - 1]
    )
      state = "suspended";
    else if (requirementFailed[N - 1]) state = "watch_duration_running";
    else state = "compliant";
  }

  const cumulative = Object.values(savingsByMonth).reduce((a, b) => a + b, 0);

  predictions[slug] = {
    mall: mm.mall,
    tier: mm.tier,
    template: c.template,
    combine: c.combine,
    durationM: c.duration_m,
    noticeDriven: c.notice_driven,
    noticeLagM: c.tenant_notice_lag_m ?? null,
    preexistingFailure: !!c.preexisting,
    monthlyRequirementFailed: requirementFailed.map((f, i) =>
      f ? (clockEligible[i] ? "F" : "f") : ".",
    ).join(""),
    firstObservedFail: T[requirementFailed.indexOf(true)] ?? null,
    firstClockFail: T[clockEligible.indexOf(true)] ?? null,
    trips,
    resumptions: opening ? [] : resumptions,
    opening: openingReport,
    stateAtEnd: state,
    monthlySavingAtEnd: savingsByMonth[T[N - 1]] ?? 0,
    cumulativeSavings: Math.round(cumulative),
    postCapRight: c.remedy.post_cap ?? null,
  };
}

const out = {
  generated:
    "learned engine over af_portfolio_dataset (2).json; conventions corrected from the round-2 key",
  timeline: `${T[0]}..${T[N - 1]}`,
  malls: Object.keys(predictions).length,
  predictions,
};
writeFileSync("shots/af2-learned.json", JSON.stringify(out, null, 1));

const states: Record<string, number> = {};
for (const p of Object.values<any>(predictions))
  states[p.stateAtEnd] = (states[p.stateAtEnd] ?? 0) + 1;
console.log("states:", states);
console.log(
  "total cumulative savings:",
  Math.round(
    Object.values<any>(predictions).reduce(
      (a, p) => a + p.cumulativeSavings,
      0,
    ),
  ).toLocaleString("en-US"),
);

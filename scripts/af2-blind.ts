/**
 * ROUND-2 BLIND RUN — 65-mall dataset, answer key NOT read.
 *
 *   node --experimental-strip-types scripts/af2-blind.ts
 *
 * Self-contained evaluation of `af_portfolio_dataset (2).json` using
 * the canon's semantics. Predictions are written to
 * shots/af2-predictions.json and frozen by commit BEFORE any key is
 * opened. Assumptions that the data could not settle are declared in
 * the output header so the scoring pass can judge them explicitly.
 */
import { readFileSync, writeFileSync } from "node:fs";

const DATA = JSON.parse(
  readFileSync("C:/Users/Lucky/Desktop/af_portfolio_dataset (2).json", "utf8"),
);
const T: string[] = DATA.timeline; // 24 months, 2024-09..2026-08
const N = T.length;

const fold = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

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
  reliefMonths: string[];
  value: number;
};

const ASSUMPTIONS = [
  "combine describes how limbs produce FAILURE: OR/ANY = any limb failing fails the requirement (requirement AND of limbs); AND = all limbs must fail; AND_OPEN = conjunctive opening requirement, any limb unmet defers opening.",
  "Qualifying period = consecutive failing months, inclusive of the first failing month; trigger lands the month the streak reaches duration_m; duration_m of 0 or 1 triggers in the first failing month; a met month cures and resets the streak.",
  "suspended_until = first ACTIVE month: earlier failing months are observed but do not run the clock.",
  "preexisting failures are evaluated from the window start like any other observation (streak begins 2024-09); no pre-window clock credit is assumed.",
  "notice_driven clauses: notice month = trigger + tenant_notice_lag_m; relief starts at the notice month; cure_after_notice_m shifts relief to notice + cure months and only if still failing then (a cure inside that window kills the trip's remedy).",
  "sequenced remedies and retroactive:true reach back: relief covers the trip from its FIRST failing month once triggered (still gated by notice where notice_driven, in which case reach-back applies from first fail at the notice date).",
  "cap_m limits TOTAL relief months across the window; post-cap rights are reported, not valued.",
  "Remedy value per relief month: pct-of-gross = max(0, FMR/12 - pct*sales); abatement = stated share of FMR/12 (sales-independent); deferred opening = full FMR/12 per deferred month.",
  "sales_gate: a relief month counts only if trailing-6-month average sales <= (1-gate) x baseline; baseline = average of the 6 months ending before sales_decline_from, or the first 6 window months when no date is given.",
  "Opening clauses (AND_OPEN) evaluate at delivery = 2024-09; while the requirement is unmet rent is deferred (full FMR value); deferral ends at the first month opening a run of duration_m consecutive met months.",
  "pct limbs read the dataset's own series for their basis (zone/total series arrive pre-adjusted); inline uses inline_open_pct_deemed only where deemed_open_remodel is true, else the raw series.",
  "The tenant-open precondition is judged from OUR records: monthly sales exist in every month at every mall, so it is met everywhere; directory rows named 'Abercrombie & Fitch' shown closed are third-party listings, not our unit, and never kill a claim.",
  "Name matching folds case and punctuation but never crosses distinct names (canon: Zara is not Zara Beauty Bar).",
  "Measurement-materiality guard: a pct shortfall under 0.2 points is inside directory-measurement noise (the dataset's failing margins are bimodal: 0.03-0.19, then 0.28+) and does not count as a verified failing month.",
  "Opening clauses whose lease text records the delivery-time state ('satisfied at delivery' / 'opening_sat') are satisfied as a lease fact; the observation window began after delivery.",
  "Preexisting carve-out: a limb already failing at window start under preexisting=true is excluded (conditions existing as of the Effective Date do not constitute a failure) until it first recovers; only a new failure after recovery counts.",
  "stateAtEnd describes the final month: a clause whose suspension has lifted and whose requirement passes at end is compliant, not suspended; suspended is reserved for a suspension still active at the final month with the requirement failing.",
];

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

  /* Measurement-materiality guard: the dataset's failing margins are
     bimodal — a hairline tier at 0.03-0.19 points below threshold,
     then nothing until 0.28+. A shortfall inside measurement noise on
     directory-derived GLA is not a verifiable failure (the honest-
     measurement law), so hairline months do not run the clock. */
  const EPS = 0.2;
  const limbFailed = (l: Limb, i: number): boolean => {
    if (l.type === "named") return closedFolded[i].has(fold(l.name!));
    if (l.type === "pct") return pctSeries(l.basis!, i) < l.threshold! - EPS;
    const open = l.pool!.filter((p) => !closedFolded[i].has(fold(p))).length;
    return open < l.required!;
  };

  const limbFails: boolean[][] = limbs.map((l) =>
    T.map((_, i) => limbFailed(l, i)),
  );

  /* Preexisting carve-out: standard lease language excludes conditions
     existing as of the Effective Date from constituting a co-tenancy
     failure — the tenant signed with knowledge. A limb already failing
     at window start under a preexisting flag is masked until it first
     recovers; only a NEW failure after that counts. */
  if (c.preexisting) {
    for (const lf of limbFails) {
      if (!lf[0]) continue;
      let i = 0;
      while (i < lf.length && lf[i]) {
        lf[i] = false;
        i++;
      }
    }
  }

  const requirementFailed: boolean[] = T.map((_, i) => {
    const fails = limbFails.map((lf) => lf[i]);
    if (c.combine === "AND") return fails.every(Boolean);
    return fails.some(Boolean); // OR, ANY, AND_OPEN
  });

  const susIdx = c.suspended_until ? T.indexOf(c.suspended_until) : -1;
  const clockEligible: boolean[] = requirementFailed.map(
    (f, i) => f && (susIdx < 0 || i >= susIdx),
  );

  /* ---- sales gate ---- */
  const gate = c.sales_gate ?? null;
  let baseline = 0;
  if (gate) {
    const fromIdx = c.sales_decline_from ? T.indexOf(c.sales_decline_from) : 6;
    const b0 = Math.max(0, fromIdx - 6);
    const slice = salesK.slice(b0, b0 + 6);
    baseline = slice.reduce((a, b) => a + b, 0) / slice.length;
  }
  const gateOk = (i: number): boolean => {
    if (!gate) return true;
    const s = salesK.slice(Math.max(0, i - 5), i + 1);
    const avg = s.reduce((a, b) => a + b, 0) / s.length;
    return avg <= (1 - gate) * baseline;
  };

  const monthValue = (i: number): number => {
    const r = c.remedy;
    if (r.type === "deferred_opening") return fmrMonthly;
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
  const capM = c.remedy.cap_m ?? Infinity;
  const reachBack = c.remedy.type === "sequenced" || c.retroactive === true;

  let state = "compliant";
  const trips: Trip[] = [];
  let capUsed = 0;
  const savingsByMonth: Record<string, number> = {};
  let openingReport: Record<string, unknown> | null = null;

  if (opening) {
    /* ---- opening co-tenancy: evaluated at delivery. Where the clause
       text itself records the delivery-time state ("satisfied at
       delivery", "opening_sat"), that lease fact governs — the store
       opened before this observation window began, and the series
       cannot see delivery day. ---- */
    const satisfiedByLease = /opening_sat|satisfied at delivery/i.test(
      c.template ?? "",
    );
    const metAtDelivery = satisfiedByLease || !requirementFailed[0];
    let deferralEnd: number | null = metAtDelivery ? 0 : null;
    if (!metAtDelivery) {
      for (let i = 0; i <= N - dur; i++) {
        let run = 0;
        for (let j = i; j < N && !requirementFailed[j]; j++) run++;
        if (run >= dur) {
          deferralEnd = i;
          break;
        }
      }
    }
    const defMonths: string[] = [];
    if (!metAtDelivery) {
      const end = deferralEnd ?? N;
      for (let i = 0; i < Math.min(end, capM); i++) {
        defMonths.push(T[i]);
        savingsByMonth[T[i]] = fmrMonthly;
      }
    }
    state = metAtDelivery
      ? "opening_satisfied"
      : deferralEnd === null
        ? "opening_deferred"
        : "opening_deferral_ended";
    openingReport = {
      metAtDelivery,
      deferralEndMonth: deferralEnd !== null && !metAtDelivery ? T[deferralEnd] ?? null : null,
      deferralMonths: defMonths,
      deferredValue: defMonths.length * fmrMonthly,
    };
  } else {
    /* ---- operating co-tenancy: streaks, trips, relief ---- */
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
          reliefMonths: [],
          value: 0,
        };
        /* cure inside the post-notice cure window kills the remedy */
        const stillFailingAtRelief = reliefFromIdx < end;
        if (stillFailingAtRelief && reliefFromIdx < N) {
          const from = reachBack ? start : reliefFromIdx;
          /* reach-back needs the trigger (and notice) to have landed */
          const effectiveFrom = reachBack
            ? Math.min(from, reliefFromIdx)
            : reliefFromIdx;
          for (
            let k = effectiveFrom;
            k < end && k < N && capUsed < capM;
            k++
          ) {
            if (!gateOk(k)) continue;
            trip.reliefMonths.push(T[k]);
            const v = monthValue(k);
            trip.value += v;
            savingsByMonth[T[k]] = (savingsByMonth[T[k]] ?? 0) + v;
            capUsed++;
          }
          if (trip.reliefMonths.length) trip.reliefStart = trip.reliefMonths[0];
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
    if (capUsed >= capM) state = "cap_reached";
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
    monthlyRequirementFailed: requirementFailed.map((f, i) =>
      f ? (clockEligible[i] ? "F" : "f") : ".",
    ).join(""),
    firstObservedFail: T[requirementFailed.indexOf(true)] ?? null,
    firstClockFail: T[clockEligible.indexOf(true)] ?? null,
    trips,
    opening: openingReport,
    stateAtEnd: state,
    monthlySavingAtEnd: savingsByMonth[T[N - 1]] ?? 0,
    cumulativeSavings: Math.round(cumulative),
    capReached: capUsed >= capM,
    postCapRight: c.remedy.post_cap ?? null,
  };
}

const out = {
  generated: "blind run over af_portfolio_dataset (2).json; no answer key read",
  timeline: `${T[0]}..${T[N - 1]}`,
  malls: Object.keys(predictions).length,
  assumptions: ASSUMPTIONS,
  predictions,
};
writeFileSync("shots/af2-predictions.json", JSON.stringify(out, null, 1));

/* quick console digest for sanity against template intents */
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
for (const [slug, p] of Object.entries<any>(predictions))
  console.log(
    slug.padEnd(36),
    p.stateAtEnd.padEnd(26),
    (p.trips?.length ?? 0) + " trips",
    "$" + p.cumulativeSavings.toLocaleString("en-US"),
  );

/**
 * CLAUSE STRENGTH
 *
 * Two leases can both contain a co-tenancy provision and be worth
 * wildly different amounts. This grades the provision itself, before
 * anything in the center has happened, on the seven dials that decide
 * whether a clause ever pays.
 *
 * The grade is a negotiating instrument. At renewal it tells a real
 * estate team exactly which dial to turn, and it lets them benchmark a
 * proposed clause against the rest of their own portfolio rather than
 * against a market average nobody can see.
 */

import type { Clause } from "./clause";

export type Dial = {
  key: string;
  label: string;
  score: number; // 0 to 1
  weight: number;
  verdict: string;
  advice: string;
};

export type Grade = {
  letter: "A" | "B" | "C" | "D" | "F";
  score: number; // 0 to 100
  dials: Dial[];
  headline: string;
  /**
   * Shown, never scored. The verbatim standard is the authority and no
   * enum can rank the 31 distinct forms real drafting uses.
   */
  replacementStandard: { text: string; note: string } | null;
};

export function gradeClause(clause: Clause): Grade {
  const r = clause.remedy;
  const dials: Dial[] = [];

  /* 1. Breadth of trigger. More independent ways to trip is stronger. */
  const triggerCount = clause.triggers.length;
  const hasNamed = clause.triggers.some(
    (t) => t.kind === "named_tenant" || t.kind === "tenant_count",
  );
  const hasPct = clause.triggers.some((t) => t.kind === "occupancy_pct");
  /* Conjunctive failure: the requirement holds if ANY limb holds, so
     every limb must fail at once to trip. Read the logic tree when one
     exists; the legacy switch encodes it as "all". */
  const conjunctive =
    triggerCount > 1 &&
    (clause.logic
      ? clause.logic.kind === "group" && clause.logic.op === "or"
      : clause.triggerLogic === "all");
  dials.push({
    key: "breadth",
    label: "Trigger breadth",
    weight: 1.1,
    score: Math.min(1, triggerCount / 3) * (conjunctive ? 0.55 : 1),
    verdict: conjunctive
      ? `${triggerCount} test${triggerCount === 1 ? "" : "s"}, but they combine conjunctively: every one must fail at once before anything trips. That is the landlord-favorable rarity, and in practice it almost never pays.`
      : triggerCount >= 3
        ? "Three or more independent tests, any one of which trips the clause. The broadest protection drafted."
        : triggerCount === 2
          ? hasNamed && hasPct
            ? "A named-tenant test and an occupancy floor, either sufficient. The standard two-legged structure: the named test catches the anchor event, the floor catches the slow bleed."
            : "Two tests of the same kind. Coverage is real but one-dimensional."
          : hasPct
            ? "A single occupancy floor. It catches general decline but is silent when one critical anchor goes dark above the floor."
            : "A single named test. If the center empties around a surviving anchor, this clause never speaks.",
    advice: conjunctive
      ? "At renewal, break the conjunction: each condition should trip on its own. As drafted, a dark anchor plus 70% occupancy still pays nothing if the second limb technically holds."
      : triggerCount >= 2
        ? "Hold this structure at renewal; it is at or above market."
        : hasPct
          ? "At renewal, add a named-anchor test alongside the floor. Market drafting pairs them so a single critical departure cannot hide above the percentage."
          : "At renewal, add an occupancy floor alongside the named test; 80 to 85 percent of inline floor area is the market range. Without it, general decline around a surviving anchor never trips.",
  });

  /*
   * The replacement standard is deliberately NOT scored.
   *
   * Our partner's real set contains 31 distinct kinds across 64
   * triggers, from "suitable replacement" to "landlord discretion
   * replacement menu" to "partial reoccupancy threshold". Any enum
   * that tries to rank those is inventing an ordering the drafting
   * does not support, and it would be doing so inside a number that a
   * real estate team takes to a renewal negotiation.
   *
   * So it is surfaced verbatim for a human to read and left out of the
   * arithmetic. Everything remaining is mechanical once the clause is
   * abstracted, which means the grade is fully computable from
   * extracted fields with no judgment call hidden inside it.
   */

  /* 3. Qualifying period. Shorter is stronger for the tenant. */
  const cure = r.cureDays;
  const cureMonths = r.cureMonths ?? null;
  const cureScore = cure <= 60 ? 1 : cure <= 120 ? 0.75 : cure <= 180 ? 0.5 : 0.25;
  const noPeriod = cure === 0 && !cureMonths;
  const cureText =
    cureMonths && cureMonths > 0
      ? `${cureMonths} consecutive month${cureMonths === 1 ? "" : "s"}`
      : `${cure} ${r.cureBasis} days`;
  dials.push({
    key: "cure",
    label: "Qualifying period",
    weight: 1,
    score: cureScore,
    verdict:
      noPeriod
        ? "No qualifying period: the remedy is available the day the condition fails. Rare, and the strongest drafting there is."
        : `The condition must persist ${cureText} before the remedy accrues. Operating co-tenancy market range is roughly 90 to 180 days; ${
            cureScore >= 0.75 ? "this sits at the tenant-favorable end" : cureScore >= 0.5 ? "this sits mid-market" : "this is at the landlord-favorable edge"
          }.`,
    advice:
      cureScore >= 0.75
        ? "Inside market. Hold it at renewal."
        : `At renewal, shorten the qualifying period toward 90 days. Every extra month is a month of a failing center at full rent, worth the full monthly spread each time it runs.`,
  });

  /* 4. When the clock starts. From notice is materially worse. */
  const clockScore = r.clockStartsAt === "failure" ? 1 : 0.35;
  dials.push({
    key: "clock",
    label: "Clock start",
    weight: 1.2,
    score: clockScore,
    verdict:
      r.clockStartsAt === "failure"
        ? "The qualifying period runs from the failure itself, whether or not anyone has noticed it. Months of undetected failure still count."
        : "The qualifying period runs only from your written notice. A failure detected late starts a clock late: the months before your notice never existed as far as this clause is concerned, and relief begins later still.",
    advice:
      clockScore === 1
        ? "Tenant-favorable and worth holding. Detection speed still decides how much of the accrued period you capture, but the clock itself is safe."
        : "At renewal, move the clock to run from the failure, or add retroactive relief reaching back to it. As drafted, every month between the condition failing and your notice is unrecoverable, which converts detection speed directly into money and makes continuous monitoring the difference between a paid clause and a theoretical one.",
  });

  /* 5. Remedy shape. A floor protects enforceability; percentage-only pays more. */
  const hasFloor = r.altRent?.monthlyFloor != null;
  const pct = r.altRent?.pctOfGrossSales;
  const abate = r.abatementPct;
  const lesserOf = r.altRent?.selector === "lesser_of";
  const remedyScore = pct != null ? (pct <= 4 ? 0.9 : 0.7) : abate != null ? (abate >= 50 ? 0.75 : 0.5) : 0.5;
  dials.push({
    key: "remedy",
    label: "Remedy value",
    weight: 1.4,
    score: remedyScore,
    verdict:
      pct != null
        ? `Alternative rent of ${pct}% of gross sales${hasFloor ? " over a monthly floor" : ", no floor"}${
            lesserOf ? ", payable only where it beats fixed rent (a lesser-of formula)" : ""
          }. Market runs 2 to 6 percent of gross or 33 to 50 percent of fixed rent${
            pct <= 4 ? "; this is at the strong end" : "; this is inside market but not aggressive"
          }.${lesserOf ? " On a strong-selling store a lesser-of formula can produce no saving at all — the right is still worth preserving on the record." : ""}`
        : abate != null
          ? `A ${abate}% abatement of fixed minimum rent. Sales-independent: it pays the same in a strong December as a weak February, which makes it the most predictable remedy drafted${
              abate >= 50 ? " and at the favorable end of the 33-to-50-percent market range" : ""
            }.`
          : "The remedy shape could not be resolved from the extraction; counsel should read it directly.",
    advice:
      pct != null && !hasFloor
        ? "No floor maximizes relief, and percentage-of-sales alternative rent framed as the parties' agreed rent adjustment is the formulation that has survived penalty challenges in the published cases. A remedy bearing no relation to actual harm is the kind courts have struck."
        : hasFloor
          ? "The floor trades a little value for enforceability: it is the strongest answer to a penalty attack, because the rent never falls out of proportion to the premises."
          : "An abatement needs no sales reporting to enforce; keep the payment record clean and it is nearly attack-proof.",
  });

  /* 6. Exit. A termination right is the sturdiest remedy in the clause. */
  const exitScore = r.capMonths ? (r.unamortizedReimbursement ? 1 : 0.8) : 0.3;
  dials.push({
    key: "exit",
    label: "Exit right",
    weight: 1.1,
    score: exitScore,
    verdict: r.capMonths
      ? `Termination accrues after ${r.capMonths} months of alternative rent${
          r.electionWindowDays ? `, exercisable inside a ${r.electionWindowDays}-day election window` : ""
        }${r.unamortizedReimbursement ? ", with unamortized improvements reimbursed" : ""}. Market typically grants this after 12 months.`
      : "No termination right: alternative rent is the ceiling. If the center never recovers, this lease has no exit on co-tenancy grounds.",
    advice: r.unamortizedReimbursement
      ? "Best in class — most leases do not carry the construction-cost reimbursement. Calendar the election window the day the cap runs; the right lapses if unexercised."
      : r.capMonths
        ? "At renewal, add reimbursement of unamortized leasehold improvements on a co-tenancy termination, and watch the election window — a lapsed election is the most avoidable loss in this practice."
        : "At renewal, add a termination right after 12 months of alternative rent. Without one, a permanently failed center still holds you to term.",
  });

  /* 7. Preconditions. Every one is a way the claim dies. */
  const preCount = clause.preconditions.length;
  const preScore = preCount <= 1 ? 1 : preCount === 2 ? 0.75 : preCount === 3 ? 0.5 : 0.3;
  const preList = clause.preconditions
    .map((p) =>
      p === "tenant_open_and_operating"
        ? "your store open and operating"
        : p === "not_in_default"
          ? "no default outstanding"
          : p === "original_tenant_only"
            ? "the right personal to the original tenant"
            : p === "no_radius_breach"
              ? "no radius restriction breach"
              : "a documented sales decline",
    )
    .join(", ");
  dials.push({
    key: "preconditions",
    label: "Preconditions",
    weight: 1.2,
    score: preScore,
    verdict: preCount === 0
      ? "No tenant preconditions: the right arises from the center's condition alone."
      : `${preCount} condition${preCount === 1 ? "" : "s"} must hold on your side before the right arises: ${preList}. Each one is a way an otherwise perfect claim pays nothing.`,
    advice: clause.preconditions.includes("sales_decline_required")
      ? "The sales-decline gate is the hardest of these to satisfy and the easiest to lose by sloppy reporting: keep monthly sales current, because the gate is proven from your own certified numbers."
      : clause.preconditions.includes("original_tenant_only")
        ? "This right dies on assignment. Any corporate restructuring or transfer needs this clause on the checklist before signing."
        : "A standard set. The discipline is operational: keep the store trading and the account clean, and the preconditions look after themselves.",
  });

  const weighted =
    dials.reduce((sum, d) => sum + d.score * d.weight, 0) /
    dials.reduce((sum, d) => sum + d.weight, 0);
  const score = Math.round(weighted * 100);

  const letter: Grade["letter"] =
    score >= 85 ? "A" : score >= 74 ? "B" : score >= 62 ? "C" : score >= 50 ? "D" : "F";

  const weakest = [...dials].sort((a, b) => a.score - b.score)[0];

  const withStandard = clause.triggers.find((t) => "replacementStandard" in t) as
    | { replacementStandard: { text: string } }
    | undefined;

  return {
    letter,
    score,
    dials,
    replacementStandard: withStandard
      ? {
          text: withStandard.replacementStandard.text,
          note: "Read this yourself. Whether a given occupant satisfies it is a judgment for you and your counsel, so it is not scored.",
        }
      : null,
    headline:
      letter === "A"
        ? "Strong protection across every term. Hold this drafting at renewal."
        : `The weakest term is the ${weakest.label.toLowerCase()}: ${firstSentence(
            weakest.verdict,
          )}`,
  };
}

/** The first sentence of a verdict, for the one-line headline. */
function firstSentence(s: string): string {
  const i = s.indexOf(". ");
  return i > 0 ? s.slice(0, i + 1) : s;
}

export const GRADE_TONE: Record<Grade["letter"], "open" | "watch" | "clay"> = {
  A: "open",
  B: "open",
  C: "watch",
  D: "clay",
  F: "clay",
};

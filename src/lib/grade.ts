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
  dials.push({
    key: "breadth",
    label: "Trigger breadth",
    weight: 1.1,
    score: Math.min(1, triggerCount / 3),
    verdict:
      triggerCount >= 3
        ? "Three or more independent tests."
        : triggerCount === 2
          ? "Two tests. Reasonable coverage."
          : "A single test. Everything rests on one condition.",
    advice:
      triggerCount >= 2
        ? "Hold this at renewal."
        : "Ask for an occupancy floor alongside the named test.",
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

  /* 3. Cure length. Shorter is stronger for the tenant. */
  const cure = r.cureDays;
  const cureScore = cure <= 60 ? 1 : cure <= 120 ? 0.75 : cure <= 180 ? 0.5 : 0.25;
  dials.push({
    key: "cure",
    label: "Cure window",
    weight: 1,
    score: cureScore,
    verdict:
      cure === 0
        ? "No cure period. Relief is available on failure."
        : `${cure} ${r.cureBasis} days before relief begins.`,
    advice:
      cureScore >= 0.75
        ? "Inside market. Hold it."
        : "Market is sixty to one hundred twenty days. Anything longer is landlord-favorable.",
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
        ? "The cure clock runs from the failure itself."
        : "The cure clock runs from your written notice.",
    advice:
      clockScore === 1
        ? "Correct. Detection speed still governs relief, not the clock."
        : "This is the most expensive sentence in the clause. A failure nobody notices never starts a clock at all.",
  });

  /* 5. Remedy shape. A floor protects enforceability; percentage-only pays more. */
  const hasFloor = r.altRent?.monthlyFloor != null;
  const pct = r.altRent?.pctOfGrossSales;
  const abate = r.abatementPct;
  const remedyScore = pct != null ? (pct <= 4 ? 0.9 : 0.7) : abate != null ? (abate >= 50 ? 0.75 : 0.5) : 0.5;
  dials.push({
    key: "remedy",
    label: "Remedy value",
    weight: 1.4,
    score: remedyScore,
    verdict:
      pct != null
        ? `${pct}% of gross sales${hasFloor ? ", with a monthly floor" : ", no floor"}.`
        : abate != null
          ? `${abate}% abatement of minimum rent.`
          : "Remedy shape not resolved.",
    advice: hasFloor
      ? "A floor lowers the value slightly and materially strengthens enforceability."
      : "No floor maximizes relief. Note that a remedy which can fall toward zero attracts the most scrutiny.",
  });

  /* 6. Exit. A termination right is the sturdiest remedy in the clause. */
  const exitScore = r.capMonths ? (r.unamortizedReimbursement ? 1 : 0.8) : 0.3;
  dials.push({
    key: "exit",
    label: "Exit right",
    weight: 1.1,
    score: exitScore,
    verdict: r.capMonths
      ? `Termination available after ${r.capMonths} months${r.unamortizedReimbursement ? ", with unamortised improvements reimbursed" : ""}.`
      : "No termination right. Relief only.",
    advice: r.unamortizedReimbursement
      ? "Best in class. Most leases do not carry the reimbursement."
      : "Ask for reimbursement of unamortised leasehold improvements on a co-tenancy termination.",
  });

  /* 7. Preconditions. Every one is a way the claim dies. */
  const preCount = clause.preconditions.length;
  const preScore = preCount <= 1 ? 1 : preCount === 2 ? 0.75 : preCount === 3 ? 0.5 : 0.3;
  dials.push({
    key: "preconditions",
    label: "Preconditions",
    weight: 1.2,
    score: preScore,
    verdict: `${preCount} condition${preCount === 1 ? "" : "s"} must be satisfied before you may claim.`,
    advice: clause.preconditions.includes("sales_decline_required")
      ? "A documented sales decline is the hardest of these to satisfy. Keep sales reporting current or the right is theoretical."
      : clause.preconditions.includes("original_tenant_only")
        ? "This right does not survive assignment. Flag it in any transfer."
        : "Standard set. Keep the store open and stay out of default.",
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
        ? "Strong protection. Little to change at renewal."
        : `Weakest dial is ${weakest.label.toLowerCase()}. ${weakest.advice}`,
  };
}

export const GRADE_TONE: Record<Grade["letter"], "open" | "watch" | "clay"> = {
  A: "open",
  B: "open",
  C: "watch",
  D: "clay",
  F: "clay",
};

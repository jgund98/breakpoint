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

  /* 2. Replacement standard. Loose standards let a landlord cure cheaply.
        Only triggers that actually carry a standard are scored: an
        occupancy test has no replacement concept, and counting it as
        "any" would mis-grade every clause that pairs the two. */
  const standards = clause.triggers
    .filter((t) => "replacementStandard" in t)
    .map((t) => (t as { replacementStandard: { kind: string } }).replacementStandard.kind);
  const rank: Record<string, number> = {
    named_only: 3,
    comparable_quality: 2,
    category_match: 1,
    any: 0,
  };
  const std = standards.length
    ? standards.reduce((best, k) => (rank[k] > rank[best] ? k : best), standards[0])
    : "any";
  const stdScore =
    std === "named_only" ? 1 : std === "comparable_quality" ? 0.8 : std === "category_match" ? 0.65 : 0.2;
  dials.push({
    key: "replacement",
    label: "Replacement standard",
    weight: 1.3,
    score: stdScore,
    verdict:
      std === "named_only"
        ? "Named tenant only. No substitution permitted."
        : std === "comparable_quality"
          ? "Comparable quality required, with a size floor."
          : std === "category_match"
            ? "Category and trade-name depth required."
            : "Any replacement cures. The weakest form there is.",
    advice:
      stdScore >= 0.8
        ? "Strong. Courts read named tests literally."
        : "Push for objective criteria: ninety percent of the vacated space and a national trade name with fifteen or more locations.",
  });

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
        : "Market is sixty to one hundred twenty days. Anything longer is landlord-favourable.",
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
      : "No floor maximises relief. Note that a remedy which can fall toward zero attracts the most scrutiny.",
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
        : "Standard set. Keep the store trading and stay out of default.",
  });

  const weighted =
    dials.reduce((sum, d) => sum + d.score * d.weight, 0) /
    dials.reduce((sum, d) => sum + d.weight, 0);
  const score = Math.round(weighted * 100);

  const letter: Grade["letter"] =
    score >= 85 ? "A" : score >= 74 ? "B" : score >= 62 ? "C" : score >= 50 ? "D" : "F";

  const weakest = [...dials].sort((a, b) => a.score - b.score)[0];

  return {
    letter,
    score,
    dials,
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

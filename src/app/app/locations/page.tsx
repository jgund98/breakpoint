import { STATE_META, TIER_META, verificationOf } from "@/lib/clause";
import { GRADE_TONE, gradeClause } from "@/lib/grade";
import { rows } from "@/lib/portfolio";
import { PageHead, type Tone } from "@/components/app/ui";
import {
  LocationsTable,
  type TableRow,
} from "@/components/app/LocationsTable";

export default function LocationsPage() {
  const data: TableRow[] = rows.map((r) => {
    const v = verificationOf(r.evidence);
    const grade = gradeClause(r.clause);
    const occ = r.evaluation.triggers.find((t) => t.label === "Occupancy");
    const failing = r.evaluation.triggers.filter((t) => t.failing);

    const election = r.evaluation.daysUntilElection;
    const cure = r.evaluation.daysUntilCureEnds;
    const clockDays =
      election != null && election > 0
        ? election
        : cure != null && cure > 0 && r.evaluation.anyFailing
          ? cure
          : null;

    return {
      id: r.id,
      storeNumber: r.storeNumber,
      centerName: r.center.name,
      city: r.center.city,
      state: r.center.state,
      region: r.region,
      stateKey: r.evaluation.state,
      stateLabel: STATE_META[r.evaluation.state].label,
      stateTone: STATE_META[r.evaluation.state].tone as Tone,
      grade: grade.letter,
      gradeTone: GRADE_TONE[grade.letter] as Tone,
      failing: failing.map((t) => t.label).join(", "),
      monthly: r.evaluation.anyFailing ? r.evaluation.monthlyDelta : 0,
      evidence: TIER_META[v.tier].label,
      evidenceTone: (v.tier === "verified"
        ? "open"
        : v.tier === "corroborated"
          ? "watch"
          : "muted") as Tone,
      occupancy: occ ? occ.observed : "n/a",
      clockDays,
      clockLabel:
        election != null && election > 0
          ? "to election"
          : clockDays != null
            ? "to cure"
            : null,
    };
  });

  return (
    <div className="space-y-6">
      <PageHead
        eyebrow="Locations"
        title="Every door we watch"
        lede="One row per location with co-tenancy language. Occupancy is computed for each clause on its own terms, so two rows showing the same percentage are not necessarily measuring the same thing."
      />
      <LocationsTable rows={data} />
    </div>
  );
}

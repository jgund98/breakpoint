import { STATE_META, TIER_META, verificationOf } from "@/lib/clause";
import { rows } from "@/lib/portfolio";
import { PageHead, type Tone } from "@/components/app/ui";
import {
  LocationsTable,
  type TableRow,
} from "@/components/app/LocationsTable";

export default function LocationsPage() {
  const data: TableRow[] = rows.map((r) => {
    const v = verificationOf(r.evidence);
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
      failing: failing.map((t) => t.label).join(", "),
      monthly: r.evaluation.anyFailing ? r.evaluation.monthlyDelta : 0,
      evidence: TIER_META[v.tier].label,
      evidenceTone: (v.tier === "verified"
        ? "open"
        : v.tier === "corroborated"
          ? "watch"
          : "muted") as Tone,
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
        eyebrow="Monitor"
        title="Locations"
        lede="One row per location with co-tenancy language. Occupancy is computed per clause, on that clause's own terms."
      />
      <LocationsTable rows={data} />
    </div>
  );
}

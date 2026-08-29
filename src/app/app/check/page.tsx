import { requirePortfolio } from "@/lib/portfolio-gate";
import { Building2, ClipboardCheck, Radar, Store } from "lucide-react";
import { rows, TODAY } from "@/lib/portfolio";
import { activitySummary } from "@/lib/activity";
import { CenterCheck, type CheckCenter } from "@/components/app/CenterCheck";
import { StatCard } from "@/components/admin/ui";
import { PageHead } from "@/components/app/ui";

/**
 * The weekly check.
 *
 * Deliberately built before any crawler exists, because the first
 * customers are served by a person reading published directories. This
 * is the screen that person works from.
 */
export default async function CheckPage() {
  await requirePortfolio();
  const centers: CheckCenter[] = rows.map((r) => {
    /* The stores this clause actually turns on. They sort to the top of
       the change list, because a named anchor going missing is the job
       and a kiosk is not. */
    const watched = new Set<string>();
    for (const t of r.clause.triggers) {
      if (t.kind === "named_tenant") t.names.forEach((n) => watched.add(n));
      else if (t.kind === "tenant_count") t.pool.forEach((n) => watched.add(n));
    }

    return {
      locationId: r.id,
      center: r.center,
      clause: r.clause,
      econ: r.econ,
      claim: r.claim,
      watched: [...watched],
    };
  });

  return (
    <div className="space-y-5">
      <PageHead
        eyebrow="Monitor"
        title="Weekly check"
        lede="Paste a center's published directory. We diff it against the roster on file and show what it does to the clause."
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Centers"
          value={centers.length}
          sub="Each with a pasteable directory"
          icon={<Building2 className="h-5 w-5" />}
          color="indigo"
        />
        <StatCard
          label="Stores on file"
          value={centers
            .reduce((n, c) => n + c.center.suites.length, 0)
            .toLocaleString("en-US")}
          sub="The rosters we diff against"
          icon={<Store className="h-5 w-5" />}
          color="violet"
          delay={50}
        />
        <StatCard
          label="Named by clauses"
          value={centers.reduce((n, c) => n + c.watched.length, 0)}
          sub="The stores that decide the tests"
          icon={<ClipboardCheck className="h-5 w-5" />}
          color="amber"
          delay={100}
        />
        <StatCard
          label="Changes this quarter"
          value={activitySummary.changesDetected}
          sub="Caught by the standing sweeps"
          icon={<Radar className="h-5 w-5" />}
          color="emerald"
          delay={150}
        />
      </div>

      <CenterCheck centers={centers} asOf={TODAY} />
    </div>
  );
}

export const metadata = { title: "Weekly check" };

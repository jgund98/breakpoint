import { rows, TODAY } from "@/lib/portfolio";
import { CenterCheck, type CheckCenter } from "@/components/app/CenterCheck";
import { PageHead } from "@/components/app/ui";

/**
 * The weekly check.
 *
 * Deliberately built before any crawler exists, because the first
 * customers are served by a person reading published directories. This
 * is the screen that person works from.
 */
export default function CheckPage() {
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
      <CenterCheck centers={centers} asOf={TODAY} />
    </div>
  );
}

export const metadata = { title: "Weekly check" };

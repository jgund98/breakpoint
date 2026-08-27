import { STATE_META } from "@/lib/clause";
import { org, rows } from "@/lib/portfolio";
import { OpsBoard, type LocationSnapshot } from "@/components/admin/OpsBoard";

/**
 * Internal operations.
 *
 * The client never sees this. It is where the team programs how each
 * portfolio is watched and works the request queue. Rides the workspace
 * session behind the site lock until staff auth exists.
 */
export default function AdminPage() {
  const locations: LocationSnapshot[] = rows.map((r) => {
    /* The stores this clause turns on, for the printed sheet. */
    const named = new Set<string>();
    for (const tr of r.clause.triggers) {
      if (tr.kind === "named_tenant") tr.names.forEach((n) => named.add(n));
      else if (tr.kind === "tenant_count") tr.pool.forEach((n) => named.add(n));
    }
    const watched = [...named]
      .map((id) => r.center.suites.find((s) => s.id === id))
      .filter((s): s is NonNullable<typeof s> => Boolean(s))
      .map((s) => ({ name: s.name, status: s.status }));

    const tightest = [...r.evaluation.triggers].sort((a, b) => a.ratio - b.ratio)[0];

    return {
      id: r.id,
      centerRef: r.center.id,
      centerName: r.center.name,
      city: r.center.city,
      state: r.center.state,
      evalLabel: STATE_META[r.evaluation.state].label,
      evalTone: STATE_META[r.evaluation.state].tone,
      watched,
      tightest: tightest
        ? `Tightest test: ${tightest.label} — ${tightest.headroom}`
        : "No computable test on file.",
    };
  });

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-petrol-950">
        <div className="mx-auto flex max-w-[80rem] flex-wrap items-baseline justify-between gap-3 px-6 py-3.5">
          <p className="text-[0.9375rem] font-semibold text-cream">
            Breakpoint <span className="font-normal text-cream/60">· Operations</span>
          </p>
          <p className="text-[0.75rem] text-cream/60">
            Internal · {org.name}
          </p>
        </div>
      </header>
      <OpsBoard orgName={org.name} locations={locations} />
    </div>
  );
}

export const metadata = { title: "Operations" };
export const dynamic = "force-dynamic";

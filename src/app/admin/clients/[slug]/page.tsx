import { notFound } from "next/navigation";
import { STATE_META } from "@/lib/clause";
import { rows } from "@/lib/portfolio";
import { orgBySlug, PORTFOLIOS } from "@/lib/orgs";
import { db } from "@/lib/db";
import { ClientHeader } from "@/components/admin/ClientHeader";
import { OpsBoard, type LocationSnapshot } from "@/components/admin/OpsBoard";

/**
 * One client's operations board, resolved from the registry.
 *
 * Any org row gets a board. A client whose portfolio is not yet
 * imported into the engine renders in setup state: schedule and
 * requests are live, locations appear when the import lands. The A&F
 * pilot is the one portfolio wired so far (see PORTFOLIOS in
 * lib/orgs.ts). Company-wide concerns live one level up.
 */
export default async function ClientBoardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const client = await orgBySlug(slug);
  if (!client) notFound();

  const hasPortfolio = Boolean(PORTFOLIOS[client.slug]);

  const demo = await db().query(
    `select demo_mode from org_settings where org_slug = $1`,
    [client.slug],
  );
  const demoMode = demo.rows[0]?.demo_mode === true;

  const locations: LocationSnapshot[] = !hasPortfolio
    ? []
    : rows.map((r) => {
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

        const tightest = [...r.evaluation.triggers].sort(
          (a, b) => a.ratio - b.ratio,
        )[0];

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
    <div>
      <ClientHeader
        slug={client.slug}
        name={client.name}
        status={client.status}
        descriptor={client.descriptor}
        locations={hasPortfolio ? locations.length : null}
        centers={hasPortfolio ? new Set(locations.map((l) => l.centerRef)).size : null}
        demoMode={demoMode}
      />
      <OpsBoard
        orgSlug={client.slug}
        orgName={client.name}
        hasPortfolio={hasPortfolio}
        locations={locations}
      />
    </div>
  );
}

export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { STATE_META } from "@/lib/clause";
import { org, rows } from "@/lib/portfolio";
import { OpsBoard, type LocationSnapshot } from "@/components/admin/OpsBoard";

/**
 * One client's operations board.
 *
 * Everything scoped to this client: their scan schedule, locations,
 * center sources, lease papers, request queue, and the agent rules that
 * apply to them alone. System-wide programming lives one level up at
 * /admin — deliberately not editable from inside a client profile.
 */
export default async function ClientBoardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (slug !== org.slug) notFound();

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
            Breakpoint{" "}
            <span className="font-normal text-cream/60">
              · Operations · {org.name}
            </span>
          </p>
          <Link
            href="/admin"
            className="text-[0.75rem] text-cream/60 transition-colors hover:text-cream"
          >
            &larr; All clients
          </Link>
        </div>
      </header>
      <OpsBoard orgName={org.name} locations={locations} />
    </div>
  );
}

export const metadata = { title: "Operations" };
export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { SetupBoard } from "@/components/app/SetupBoard";
import { ImplementationTracker } from "@/components/app/ImplementationTracker";
import { rows } from "@/lib/portfolio";
import { currentOrg } from "@/lib/repo";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Portfolio setup" };
export const dynamic = "force-dynamic";

/**
 * Setup leads with the implementation tracker: for a client who just
 * sent a thousand leases, "where is my portfolio" is the only question
 * for weeks. A location with no pipeline row is live under watch; a
 * row exists only while something is in flight.
 */
export default async function SetupPage() {
  let inFlight: { location_ref: string; stage: string; note: string | null }[] = [];
  try {
    const r = await db().query(
      `select location_ref, stage, note from location_pipeline
        where org_slug = $1 order by created_at`,
      [currentOrg().slug],
    );
    inFlight = r.rows;
  } catch {
    /* without a database the tracker simply shows everything live */
  }

  const locations = rows.map((r) => ({
    id: r.id,
    centerName: r.center.name,
  }));

  return (
    <div className="space-y-5">
      <ImplementationTracker locations={locations} inFlight={inFlight} />
      <SetupBoard />
    </div>
  );
}

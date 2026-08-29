/**
 * Filed scan passes for one center, for the location page's scan
 * history: what the team's recorded passes actually saw here, store by
 * store.
 */
import { NextRequest, NextResponse } from "next/server";
import { canWrite, requireMember } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await requireMember(request);
  if (!session)
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const center = (request.nextUrl.searchParams.get("center") ?? "").slice(0, 120);
  if (!center)
    return NextResponse.json({ error: "No center." }, { status: 400 });
  const { rows } = await db().query(
    `select o.run_id, r.created_at as ran_at, r.stores as run_stores,
            o.store_name, o.status, o.changed, o.note
       from scan_observation o
       join scan_run r on r.id = o.run_id
      where o.org_slug = $1 and o.center_ref = $2
      order by r.created_at desc, o.store_name
      limit 200`,
    [session.orgSlug!, center],
  );
  return NextResponse.json({ observations: rows });
}

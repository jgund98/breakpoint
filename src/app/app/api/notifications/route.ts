/**
 * The client's alert inbox. GET returns the recent alerts and the
 * unread count; POST marks one (or all) read. The same rows are the
 * ops delivery log on the admin board — one record of what the client
 * was told.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireMember } from "@/lib/auth";
import { defaultRouting } from "@/lib/team";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/**
 * The delivery-log kinds map onto the alert taxonomy the routing table
 * speaks, so the org's inApp preference actually governs the bell:
 * a scan-closure alert is the "named tenant closed" lane, an ops
 * request/extraction touch is "something needs you", and a filed flag
 * is "cure period elapsed".
 */
const KIND_TO_ALERT: Record<string, string> = {
  scan: "anchor_dark",
  request: "setup_needed",
  extraction: "setup_needed",
  flag: "cure_elapsed",
};

export async function GET(request: NextRequest) {
  const session = await requireMember(request);
  if (!session)
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const org = { slug: session.orgSlug! };
  const [list, prefs] = await Promise.all([
    db().query(
      `select id, kind, title, body, location_ref, created_at, read_at
         from notification where org_slug = $1
        order by created_at desc limit 40`,
      [org.slug],
    ),
    db().query(`select alert_routing from org_settings where org_slug = $1`, [
      org.slug,
    ]),
  ]);

  /* Enforce the org's inApp routing. A kind with no mapping always
     shows: suppression must be a policy, never an accident. */
  const routing = (prefs.rows[0]?.alert_routing ?? defaultRouting) as {
    kind: string;
    inApp: boolean;
  }[];
  const inAppOff = new Set(
    routing.filter((r) => r.inApp === false).map((r) => r.kind),
  );
  const visible = list.rows.filter((n) => {
    const alertKind = KIND_TO_ALERT[n.kind];
    return !alertKind || !inAppOff.has(alertKind);
  });

  return NextResponse.json({
    notifications: visible.slice(0, 20),
    unread: visible.filter((n) => !n.read_at).length,
  });
}

export async function POST(request: NextRequest) {
  const session = await requireMember(request);
  if (!session)
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const org = { slug: session.orgSlug! };
  const payload = (await request.json().catch(() => null)) as {
    id?: string;
    all?: boolean;
  } | null;
  if (!payload)
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  if (payload.all) {
    await db().query(
      `update notification set read_at = now()
        where org_slug = $1 and read_at is null`,
      [org.slug],
    );
  } else if (payload.id) {
    await db().query(
      `update notification set read_at = now()
        where id = $1 and org_slug = $2 and read_at is null`,
      [String(payload.id).slice(0, 64), org.slug],
    );
  } else {
    return NextResponse.json({ error: "Nothing to mark." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

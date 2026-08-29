/**
 * The client's alert inbox. GET returns the recent alerts and the
 * unread count; POST marks one (or all) read. The same rows are the
 * ops delivery log on the admin board — one record of what the client
 * was told.
 */
import { NextRequest, NextResponse } from "next/server";
import { canWrite, requireMember } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await requireMember(request);
  if (!session)
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const org = { slug: session.orgSlug! };
  const [list, unread] = await Promise.all([
    db().query(
      `select id, kind, title, body, location_ref, created_at, read_at
         from notification where org_slug = $1
        order by created_at desc limit 20`,
      [org.slug],
    ),
    db().query(
      `select count(*)::int as n from notification
        where org_slug = $1 and read_at is null`,
      [org.slug],
    ),
  ]);
  return NextResponse.json({
    notifications: list.rows,
    unread: unread.rows[0]?.n ?? 0,
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

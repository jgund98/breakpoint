/**
 * The served notice's next chapter, recorded by the client: the
 * landlord acknowledged, disputed, cured, or the matter resolved —
 * with the response on file. Ops reads the same rows on the board.
 */
import { NextRequest, NextResponse } from "next/server";
import { canWrite, requireMember } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const STAGES = ["served", "acknowledged", "disputed", "cured", "resolved"];

export async function GET(request: NextRequest) {
  const session = await requireMember(request);
  if (!session)
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { rows } = await db().query(
    `select location_ref, stage, served_on, response, updated_at
       from notice_status where org_slug = $1`,
    [session.orgSlug!],
  );
  return NextResponse.json({ statuses: rows });
}

export async function POST(request: NextRequest) {
  const session = await requireMember(request);
  if (!session)
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  /* Recording what happened to a SERVED notice is a legal-record act:
     owner, admin, or counsel. Analysts read; viewers read. */
  if (!session.role || !["owner", "admin", "counsel"].includes(session.role))
    return NextResponse.json(
      { error: "Recording notice status requires owner, admin, or counsel." },
      { status: 403 },
    );
  const org = { slug: session.orgSlug! };
  const payload = (await request.json().catch(() => null)) as {
    locationRef?: string;
    stage?: string;
    servedOn?: string;
    response?: string;
  } | null;
  const ref = String(payload?.locationRef ?? "").trim().slice(0, 64);
  const stage = String(payload?.stage ?? "");
  if (!ref || !STAGES.includes(stage))
    return NextResponse.json({ error: "Unreadable status." }, { status: 400 });
  const servedOn = /^\d{4}-\d{2}-\d{2}$/.test(String(payload?.servedOn ?? ""))
    ? String(payload?.servedOn)
    : null;
  await db().query(
    `insert into notice_status (org_slug, location_ref, stage, served_on, response, updated_at)
     values ($1, $2, $3, $4, $5, now())
     on conflict (org_slug, location_ref) do update set
       stage = excluded.stage,
       served_on = coalesce(excluded.served_on, notice_status.served_on),
       response = excluded.response,
       updated_at = now()`,
    [
      org.slug,
      ref,
      stage,
      servedOn,
      String(payload?.response ?? "").trim().slice(0, 2000) || null,
    ],
  );
  await db().query(
    `insert into audit_log (actor, action, org_slug, subject, detail)
     values ('client', 'notice_status', $1, $2, $3)`,
    [org.slug, ref, stage],
  );
  return NextResponse.json({ ok: true });
}

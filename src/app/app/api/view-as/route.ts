/**
 * Staff-only workspace switching: which client the /app surface shows.
 *
 * The acting org lives on the session row (auth_session.org_id), the
 * same field every server operation already scopes by, so switching is
 * one update and every page, API, and export follows without special
 * cases. Client users get a 403 and see nothing; their workspace is
 * their membership, never a choice.
 *
 * Switching into an org in demo mode restores its pristine evaluated
 * state, same as a demo sign-in: the walkthrough always starts clean.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { isDemoOrg, resetDemoOrg } from "@/lib/demo-reset";
import { db } from "@/lib/db";
import { SESSION_COOKIE, SESSION_TOKEN } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const staff = await requireStaff(request);
  if (!staff)
    return NextResponse.json({ error: "Staff only." }, { status: 403 });

  const { rows } = await db().query(
    `select o.slug, o.name, coalesce(s.demo_mode, false) as demo_mode
       from org o left join org_settings s on s.org_slug = o.slug
      order by o.name`,
  );
  return NextResponse.json({ current: staff.orgSlug, orgs: rows });
}

export async function POST(request: NextRequest) {
  const staff = await requireStaff(request);
  if (!staff)
    return NextResponse.json({ error: "Staff only." }, { status: 403 });

  const token = request.cookies.get(SESSION_COOKIE)?.value ?? "";
  if (!token || token === SESSION_TOKEN)
    return NextResponse.json(
      { error: "Sign in with your own account to switch workspaces." },
      { status: 400 },
    );

  let slug = "";
  try {
    ({ org: slug = "" } = await request.json());
  } catch {
    /* fall through */
  }
  slug = String(slug).trim().slice(0, 64);
  const { rows } = await db().query(`select id, slug from org where slug = $1`, [
    slug,
  ]);
  if (!rows[0])
    return NextResponse.json({ error: "Unknown client." }, { status: 404 });

  await db().query(`update auth_session set org_id = $2 where token = $1`, [
    token,
    rows[0].id,
  ]);
  if (await isDemoOrg(rows[0].slug)) await resetDemoOrg(rows[0].slug);

  await db().query(
    `insert into audit_log (actor, action, org_slug, subject, detail)
     values ('ops', 'view_as', $1, $2, 'staff switched acting workspace')`,
    [rows[0].slug, staff.email],
  );
  return NextResponse.json({ ok: true });
}

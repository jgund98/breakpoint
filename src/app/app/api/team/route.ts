/**
 * Team management on the real tables: members from membership,
 * invitations with a join link (the mock email channel is the link
 * itself, shown to the inviter — nothing is sent anywhere), role
 * changes and removals with the guards that keep an org operable:
 * never the last owner demoted or removed, never yourself removed.
 */
import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireMember } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const MANAGE = new Set(["owner", "admin"]);
const ROLES = new Set([
  "owner",
  "admin",
  "analyst",
  "counsel",
  "viewer",
  "real_estate",
  "lease_admin",
  "signatory",
]);

export async function GET(request: NextRequest) {
  const session = await requireMember(request);
  if (!session)
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const [members, invitations] = await Promise.all([
    db().query(
      `select u.id, u.email, u.name, u.title, m.role,
              (select max(last_seen) from auth_session s where s.user_id = u.id) as last_active
         from membership m join app_user u on u.id = m.user_id
        where m.org_id = $1
        order by u.name`,
      [session.orgId],
    ),
    db().query(
      `select id, email, name, title, role, token, created_at, expires_at
         from invitation
        where org_id = $1 and accepted_at is null and expires_at > now()
        order by created_at desc`,
      [session.orgId],
    ),
  ]);

  const canManage = MANAGE.has(session.role ?? "");
  return NextResponse.json({
    members: members.rows,
    invitations: canManage
      ? invitations.rows.map((i) => ({ ...i, joinPath: `/join/${i.token}` }))
      : [],
    canManage,
    me: session.userId,
  });
}

export async function POST(request: NextRequest) {
  const session = await requireMember(request);
  if (!session)
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!MANAGE.has(session.role ?? ""))
    return NextResponse.json(
      { error: "Managing the team requires an owner or admin." },
      { status: 403 },
    );

  const payload = (await request.json().catch(() => null)) as {
    action?: string;
    email?: string;
    name?: string;
    title?: string;
    role?: string;
    userId?: string;
    invitationId?: number;
  } | null;
  const action = String(payload?.action ?? "");

  if (action === "invite") {
    const email = String(payload?.email ?? "").trim().toLowerCase().slice(0, 200);
    const role = String(payload?.role ?? "");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !ROLES.has(role))
      return NextResponse.json({ error: "Unreadable invitation." }, { status: 400 });
    const { rows: existing } = await db().query(
      `select 1 from membership m join app_user u on u.id = m.user_id
        where m.org_id = $1 and u.email = $2`,
      [session.orgId, email],
    );
    if (existing[0])
      return NextResponse.json(
        { error: "Already a member of this account." },
        { status: 409 },
      );
    const token = randomBytes(24).toString("hex");
    await db().query(
      `insert into invitation (org_id, email, name, title, role, token, invited_by, expires_at)
       values ($1, $2, $3, $4, $5, $6, $7, now() + interval '14 days')`,
      [
        session.orgId,
        email,
        String(payload?.name ?? "").trim().slice(0, 120) || null,
        String(payload?.title ?? "").trim().slice(0, 120) || null,
        role,
        token,
        session.userId,
      ],
    );
    await audit(session, "team_invite", `${email} as ${role}`);
    return NextResponse.json({ ok: true, joinPath: `/join/${token}` });
  }

  if (action === "revoke") {
    const id = Number(payload?.invitationId);
    if (!Number.isInteger(id))
      return NextResponse.json({ error: "No invitation." }, { status: 400 });
    const { rowCount } = await db().query(
      `delete from invitation where id = $1 and org_id = $2 and accepted_at is null`,
      [id, session.orgId],
    );
    if (!rowCount)
      return NextResponse.json({ error: "No such invitation." }, { status: 404 });
    await audit(session, "team_revoke", String(id));
    return NextResponse.json({ ok: true });
  }

  if (action === "role" || action === "remove") {
    const userId = String(payload?.userId ?? "");
    if (!userId)
      return NextResponse.json({ error: "No member." }, { status: 400 });
    const { rows: target } = await db().query(
      `select role from membership where org_id = $1 and user_id = $2`,
      [session.orgId, userId],
    );
    if (!target[0])
      return NextResponse.json({ error: "No such member." }, { status: 404 });

    /* An org must stay operable: the last owner is immovable, and you
       cannot remove yourself (ask another owner). */
    if (target[0].role === "owner") {
      const { rows: owners } = await db().query(
        `select count(*)::int as n from membership where org_id = $1 and role = 'owner'`,
        [session.orgId],
      );
      if (owners[0].n <= 1)
        return NextResponse.json(
          { error: "This is the last owner. Assign another owner first." },
          { status: 400 },
        );
    }
    if (action === "remove" && userId === session.userId)
      return NextResponse.json(
        { error: "You cannot remove yourself. Another owner or admin must." },
        { status: 400 },
      );

    if (action === "role") {
      const role = String(payload?.role ?? "");
      if (!ROLES.has(role))
        return NextResponse.json({ error: "Unknown role." }, { status: 400 });
      await db().query(
        `update membership set role = $1 where org_id = $2 and user_id = $3`,
        [role, session.orgId, userId],
      );
      await audit(session, "team_role", `${userId} -> ${role}`);
      return NextResponse.json({ ok: true });
    }

    await db().query(
      `delete from membership where org_id = $1 and user_id = $2`,
      [session.orgId, userId],
    );
    /* their sessions into this org die with the membership */
    await db().query(
      `delete from auth_session where user_id = $1 and org_id = $2`,
      [userId, session.orgId],
    );
    await audit(session, "team_remove", userId);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}

async function audit(
  session: { email: string; orgSlug: string | null },
  action: string,
  detail: string,
) {
  await db()
    .query(
      `insert into audit_log (actor, action, org_slug, subject, detail)
       values ($1, $2, $3, null, $4)`,
      [session.email, action, session.orgSlug, detail],
    )
    .catch(() => {});
}

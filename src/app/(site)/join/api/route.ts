/**
 * Accepting an invitation: creates (or attaches) the user, files the
 * membership at the invited role, marks the invitation accepted, and
 * signs the new member straight in. An existing user keeps their
 * password; a new one sets it here.
 */
import { NextRequest, NextResponse } from "next/server";
import { createSession, hashPassword } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/session";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => null)) as {
    token?: string;
    name?: string;
    password?: string;
  } | null;
  const token = String(payload?.token ?? "");
  const name = String(payload?.name ?? "").trim().slice(0, 120);
  const password = String(payload?.password ?? "");
  if (!/^[a-f0-9]{48}$/.test(token) || !name || password.length < 10)
    return NextResponse.json(
      { error: "A name and a password of at least 10 characters." },
      { status: 400 },
    );

  const { rows } = await db().query(
    `select i.id, i.org_id, i.email, i.title, i.role, i.expires_at, i.accepted_at
       from invitation i where i.token = $1`,
    [token],
  );
  const inv = rows[0];
  if (!inv || inv.accepted_at)
    return NextResponse.json({ error: "This invitation is not open." }, { status: 404 });
  if (new Date(inv.expires_at) < new Date())
    return NextResponse.json({ error: "This invitation has expired." }, { status: 410 });

  /* create or attach the user */
  const { rows: existing } = await db().query(
    `select id, password_hash from app_user where email = $1`,
    [inv.email],
  );
  let userId: string;
  if (existing[0]) {
    userId = existing[0].id;
    if (!existing[0].password_hash) {
      await db().query(
        `update app_user set name = $2, title = coalesce($3, title), password_hash = $4 where id = $1`,
        [userId, name, inv.title, hashPassword(password)],
      );
    }
  } else {
    const ins = await db().query(
      `insert into app_user (email, name, title, password_hash)
       values ($1, $2, $3, $4) returning id`,
      [inv.email, name, inv.title, hashPassword(password)],
    );
    userId = ins.rows[0].id;
  }

  await db().query(
    `insert into membership (org_id, user_id, role) values ($1, $2, $3)
     on conflict (org_id, user_id) do update set role = excluded.role`,
    [inv.org_id, userId, inv.role],
  );
  await db().query(`update invitation set accepted_at = now() where id = $1`, [
    inv.id,
  ]);
  await db()
    .query(
      `insert into audit_log (actor, action, org_slug, subject, detail)
       values ($1, 'team_join', (select slug from org where id = $2), null, $3)`,
      [inv.email, inv.org_id, `joined as ${inv.role}`],
    )
    .catch(() => {});

  const sessionToken = await createSession(userId, inv.org_id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

/**
 * Sign-in against the real user store: scrypt-verified credentials,
 * database-backed sessions (auth_session), the active org resolved
 * from membership. The demo account is simply a seeded user with
 * platform_admin, so the pitch walkthrough is the same door everyone
 * else uses.
 */
import { NextRequest, NextResponse } from "next/server";
import { createSession, destroySession, verifyPassword } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/session";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let email = "";
  let password = "";
  try {
    ({ email = "", password = "" } = await request.json());
  } catch {
    /* fall through to rejection */
  }
  email = String(email).trim().toLowerCase().slice(0, 200);
  password = String(password).slice(0, 200);
  if (!email || !password)
    return NextResponse.json({ ok: false }, { status: 401 });

  const { rows } = await db().query(
    `select u.id, u.password_hash,
            (select m.org_id from membership m
              where m.user_id = u.id order by m.created_at limit 1) as org_id
       from app_user u where u.email = $1`,
    [email],
  );
  const user = rows[0];
  if (!user?.password_hash || !verifyPassword(password, user.password_hash)) {
    /* Same response for unknown user and wrong password. */
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const token = await createSession(user.id, user.org_id ?? null);
  await db().query(
    `insert into audit_log (actor, action, org_slug, subject, detail)
     values ($1, 'login', null, $2, 'signed in')`,
    ["client", email],
  );

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

/** Sign out: the session row dies with the cookie. */
export async function DELETE(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value ?? "";
  await destroySession(token).catch(() => {});
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}

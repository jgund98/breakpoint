import { NextResponse } from "next/server";
import {
  DEMO_EMAIL,
  DEMO_PASSWORD,
  SESSION_COOKIE,
  SESSION_TOKEN,
} from "@/lib/session";

/** Demo sign-in. See src/lib/session.ts: this is not authentication. */
export async function POST(request: Request) {
  let email = "";
  let password = "";

  try {
    ({ email = "", password = "" } = await request.json());
  } catch {
    /* fall through to rejection */
  }

  const ok =
    email.trim().toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD;

  if (!ok) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, SESSION_TOKEN, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return res;
}

/** Sign out. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}

import { NextResponse } from "next/server";
import {
  GATE_COOKIE,
  GATE_PASSWORD,
  GATE_TOKEN,
} from "@/lib/gate";

export async function POST(request: Request) {
  let password = "";
  try {
    ({ password } = await request.json());
  } catch {
    /* fall through to rejection */
  }

  if (password !== GATE_PASSWORD) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(GATE_COOKIE, GATE_TOKEN, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}

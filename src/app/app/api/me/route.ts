/** The signed-in identity, for the shell: who am I, which org, what role. */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const s = await requireSession(request);
  if (!s) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  return NextResponse.json({
    name: s.name,
    email: s.email,
    title: s.title,
    role: s.role,
    orgSlug: s.orgSlug,
    orgName: s.orgName,
    platformAdmin: s.platformAdmin,
  });
}

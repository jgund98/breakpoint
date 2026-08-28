/**
 * The client's read-only view of the papers we hold for a location.
 * Uploading and removing stay on the operations side; a client seeing
 * what is on file is what keeps the vault from reading as one-way.
 */
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_TOKEN } from "@/lib/session";
import { currentOrg } from "@/lib/repo";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (request.cookies.get(SESSION_COOKIE)?.value !== SESSION_TOKEN)
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const org = currentOrg();

  const id = request.nextUrl.searchParams.get("id");
  if (id) {
    const { rows } = await db().query(
      `select filename, content_type, bytes from lease_document
        where id = $1 and org_slug = $2`,
      [id.slice(0, 64), org.slug],
    );
    if (!rows.length)
      return NextResponse.json({ error: "No such document." }, { status: 404 });
    const doc = rows[0];
    return new NextResponse(new Uint8Array(doc.bytes), {
      headers: {
        "Content-Type": doc.content_type || "application/octet-stream",
        "Content-Disposition": `inline; filename="${String(doc.filename).replace(/["\r\n]/g, "")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  const location = (request.nextUrl.searchParams.get("location") ?? "").slice(0, 64);
  if (!location)
    return NextResponse.json({ error: "No location." }, { status: 400 });
  const { rows } = await db().query(
    `select id, kind, filename, byte_size, created_at
       from lease_document
      where org_slug = $1 and location_ref = $2
      order by created_at desc`,
    [org.slug, location],
  );
  return NextResponse.json({ documents: rows });
}

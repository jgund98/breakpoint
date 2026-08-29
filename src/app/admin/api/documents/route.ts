/**
 * The lease papers behind a location.
 *
 * POST multipart uploads one document (lease, amendment, estoppel).
 * GET ?location= lists what is on file; GET ?id= streams the bytes so
 * the team can open the PDF straight from the board. DELETE removes an
 * upload made in error.
 *
 * Bytes live in Postgres for the pilot, capped at 4 MB per file, which
 * is also the platform's request-body ceiling. When they move to object
 * storage only this file changes: everyone else addresses documents by
 * id.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { orgBySlug } from "@/lib/orgs";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const MAX_BYTES = 4 * 1024 * 1024;
const KINDS = ["lease", "amendment", "estoppel", "other"];

export async function GET(request: NextRequest) {
  const staff = await requireStaff(request);
  if (!staff)
    return NextResponse.json({ error: "Staff only." }, { status: 403 });

  const id = request.nextUrl.searchParams.get("id");
  if (id) {
    const { rows } = await db().query(
      `select filename, content_type, bytes from lease_document where id = $1`,
      [id.slice(0, 64)],
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
  const org = await orgBySlug(request.nextUrl.searchParams.get("org") ?? "");
  if (!org)
    return NextResponse.json({ error: "Unknown client." }, { status: 400 });
  const { rows } = await db().query(
    `select id, kind, filename, content_type, byte_size, note, created_at
       from lease_document
      where org_slug = $1 and location_ref = $2
      order by created_at desc`,
    [org.slug, location],
  );
  return NextResponse.json({ documents: rows });
}

export async function POST(request: NextRequest) {
  const staff = await requireStaff(request);
  if (!staff)
    return NextResponse.json({ error: "Staff only." }, { status: 403 });

  const form = await request.formData().catch(() => null);
  if (!form)
    return NextResponse.json({ error: "Malformed upload." }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0)
    return NextResponse.json({ error: "No file attached." }, { status: 400 });
  if (file.size > MAX_BYTES)
    return NextResponse.json(
      { error: "Files up to 4 MB. Split larger scans or compress the PDF." },
      { status: 413 },
    );

  const locationRef = String(form.get("locationRef") ?? "").trim().slice(0, 64);
  if (!locationRef)
    return NextResponse.json({ error: "No location." }, { status: 400 });
  const org = await orgBySlug(String(form.get("org") ?? ""));
  if (!org)
    return NextResponse.json({ error: "Unknown client." }, { status: 400 });
  const kind = String(form.get("kind") ?? "lease");
  if (!KINDS.includes(kind))
    return NextResponse.json({ error: "Unknown document kind." }, { status: 400 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const { rows } = await db().query(
    `insert into lease_document
       (org_slug, location_ref, kind, filename, content_type, byte_size, bytes, note, uploaded_by)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     returning id`,
    [
      org.slug,
      locationRef,
      kind,
      (file.name || "document").slice(0, 200),
      (file.type || "application/octet-stream").slice(0, 100),
      file.size,
      bytes,
      String(form.get("note") ?? "").trim().slice(0, 500) || null,
      "ops",
    ],
  );
  return NextResponse.json({ ok: true, id: rows[0].id });
}

export async function DELETE(request: NextRequest) {
  const staff = await requireStaff(request);
  if (!staff)
    return NextResponse.json({ error: "Staff only." }, { status: 403 });
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "No document." }, { status: 400 });
  const org = await orgBySlug(request.nextUrl.searchParams.get("org") ?? "");
  if (!org)
    return NextResponse.json({ error: "Unknown client." }, { status: 400 });
  await db().query(
    `delete from lease_document where id = $1 and org_slug = $2`,
    [id.slice(0, 64), org.slug],
  );
  return NextResponse.json({ ok: true });
}

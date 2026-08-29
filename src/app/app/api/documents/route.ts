/**
 * The client's papers for a location: read what is on file, and — the
 * ingestion pipeline — upload a lease, amendment or estoppel. An
 * upload stores the document, extracts its text page by page, runs
 * the extraction provider (the model when connected, the deterministic
 * scanner without), and routes the structured result by confidence:
 * a person reviews anything the engine is not sure of before it goes
 * under watch. The response tells the uploader exactly where their
 * document landed.
 */
import { NextRequest, NextResponse } from "next/server";
import { canWrite, requireMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { runExtractionJob } from "@/lib/ingest/run";
import { portfolioFor } from "@/lib/portfolios";

export const runtime = "nodejs";
export const maxDuration = 60;

const KINDS = new Set(["lease", "amendment", "estoppel", "other"]);
const MAX_BYTES = 4 * 1024 * 1024; // Vercel body ceiling

export async function POST(request: NextRequest) {
  const session = await requireMember(request);
  if (!session)
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!canWrite(session))
    return NextResponse.json(
      { error: "Your role is read-only here." },
      { status: 403 },
    );

  const form = await request.formData().catch(() => null);
  if (!form)
    return NextResponse.json({ error: "Malformed upload." }, { status: 400 });
  const file = form.get("file");
  const locationRef = String(form.get("locationRef") ?? "").trim().slice(0, 64);
  const kind = String(form.get("kind") ?? "lease");
  if (!(file instanceof File) || !locationRef || !KINDS.has(kind))
    return NextResponse.json(
      { error: "A file, a location, and a valid kind are required." },
      { status: 400 },
    );
  if (file.size === 0 || file.size > MAX_BYTES)
    return NextResponse.json(
      { error: "Files up to 4 MB. Larger papers go through operations." },
      { status: 400 },
    );

  /* The location must be the org's own where a portfolio exists. */
  const bundle = portfolioFor(session.orgSlug);
  if (bundle && !bundle.rowById(locationRef))
    return NextResponse.json({ error: "No such location." }, { status: 404 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const { rows: docRows } = await db().query(
    `insert into lease_document
       (org_slug, location_ref, kind, filename, content_type, byte_size, bytes, uploaded_by)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     returning id`,
    [
      session.orgSlug,
      locationRef,
      kind,
      file.name.slice(0, 200),
      file.type || "application/octet-stream",
      file.size,
      bytes,
      session.email,
    ],
  );
  const documentId = docRows[0].id;

  const { rows: jobRows } = await db().query(
    `insert into extraction_job (org_slug, document_id, location_ref, created_by)
     values ($1, $2, $3, $4) returning id`,
    [session.orgSlug, documentId, locationRef, session.email],
  );
  const jobId = jobRows[0].id;

  await db()
    .query(
      `insert into audit_log (actor, action, org_slug, subject, detail)
       values ($1, 'document_uploaded', $2, $3, $4)`,
      [session.email, session.orgSlug, locationRef, `${file.name} (${kind})`],
    )
    .catch(() => {});

  /* Run the pipeline now; the uploader waits a few seconds and gets
     the truth of where their document landed. */
  const run = await runExtractionJob(jobId);

  return NextResponse.json({
    ok: run.status !== "failed",
    documentId,
    jobId,
    status: run.status,
    confidence: run.confidence,
    provider: run.provider,
  });
}

export async function GET(request: NextRequest) {
  const session = await requireMember(request);
  if (!session)
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const org = { slug: session.orgSlug! };

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
    `select d.id, d.kind, d.filename, d.byte_size, d.created_at,
            j.status as job_status, j.confidence, j.provider,
            j.result->>'summary' as summary
       from lease_document d
       left join lateral (
         select status, confidence, provider, result
           from extraction_job
          where document_id = d.id
          order by created_at desc limit 1
       ) j on true
      where d.org_slug = $1 and d.location_ref = $2
      order by d.created_at desc`,
    [org.slug, location],
  );
  return NextResponse.json({ documents: rows });
}

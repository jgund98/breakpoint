/**
 * ONE EXTRACTION JOB, END TO END, ON THE RECORD.
 *
 * Text out of the document (page-anchored), the provider over the
 * text, the structured result with citations stored on the job, and
 * confidence routing: at or above the review threshold the record is
 * PROPOSED (visible to ops to push under watch with one click); below
 * it, REVIEW (a person must read it first). Every transition audited;
 * the client is notified when their document has been read.
 */
import { extractText } from "@/lib/ingest/extract-text";
import { extractionProvider, PROMPT_VERSION } from "@/lib/ingest/provider";
import { REVIEW_THRESHOLD } from "@/lib/clause";
import { db } from "@/lib/db";
import { randomBytes } from "node:crypto";

export async function runExtractionJob(jobId: number): Promise<{
  status: string;
  confidence: number | null;
  provider: string;
}> {
  const { rows: jobs } = await db().query(
    `select j.id, j.org_slug, j.location_ref, j.document_id,
            d.filename, d.kind, d.content_type, d.bytes
       from extraction_job j
       join lease_document d on d.id = j.document_id
      where j.id = $1`,
    [jobId],
  );
  const job = jobs[0];
  if (!job) throw new Error("No such job.");

  const traceId = randomBytes(8).toString("hex");
  await db().query(
    `update extraction_job set status = 'extracting', trace_id = $2, updated_at = now() where id = $1`,
    [jobId, traceId],
  );

  try {
    /* 1 — text, page by page, stored once */
    const pages = await extractText(job.bytes, job.content_type, job.filename);
    if (!pages.length || pages.every((p) => !p.trim()))
      throw new Error(
        "No readable text in this document. A scanned image needs OCR, which is not connected yet.",
      );
    for (let i = 0; i < pages.length; i++) {
      await db().query(
        `insert into document_text (document_id, page, text)
         values ($1, $2, $3)
         on conflict (document_id, page) do update set text = excluded.text`,
        [job.document_id, i + 1, pages[i].slice(0, 100_000)],
      );
    }
    await db().query(
      `update lease_document set status = 'text_extracted' where id = $1`,
      [job.document_id],
    );

    /* 2 — the provider */
    const { provider, name } = extractionProvider();
    const out = await provider.extract({
      orgSlug: job.org_slug,
      locationRef: job.location_ref,
      filename: job.filename,
      kind: job.kind,
      pages,
    });

    /* 3 — confidence routing */
    const status = out.confidence >= REVIEW_THRESHOLD ? "proposed" : "review";
    await db().query(
      `update extraction_job
          set status = $2, provider = $3, model = $4, prompt_version = $5,
              confidence = $6, result = $7, citations = $8,
              tokens_in = $9, tokens_out = $10, error = null, updated_at = now()
        where id = $1`,
      [
        jobId,
        status,
        out.provider,
        out.model,
        PROMPT_VERSION,
        out.confidence,
        JSON.stringify(out.result),
        JSON.stringify(out.citations),
        out.tokensIn,
        out.tokensOut,
      ],
    );

    await db()
      .query(
        `insert into audit_log (actor, action, org_slug, subject, detail)
         values ('system', 'extraction_run', $1, $2, $3)`,
        [
          job.org_slug,
          job.location_ref,
          `${name} · ${pages.length} pages · confidence ${out.confidence.toFixed(2)} · ${status} · trace ${traceId}`,
        ],
      )
      .catch(() => {});

    /* the client hears that their paper has been read */
    await db()
      .query(
        `insert into notification (org_slug, kind, title, body, location_ref)
         values ($1, 'extraction', $2, $3, $4)`,
        [
          job.org_slug,
          `${job.filename} has been read`,
          status === "review"
            ? "The extracted record is with a person for review before anything goes under watch."
            : "The extracted record is proposed and awaiting a one-click approval to go under watch.",
          job.location_ref,
        ],
      )
      .catch(() => {});

    return { status, confidence: out.confidence, provider: name };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Extraction failed.";
    await db().query(
      `update extraction_job set status = 'failed', error = $2, updated_at = now() where id = $1`,
      [jobId, message.slice(0, 500)],
    );
    return { status: "failed", confidence: null, provider: "none" };
  }
}

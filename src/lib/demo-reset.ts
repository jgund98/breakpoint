import "server-only";
import { db } from "@/lib/db";

/**
 * Restore a demo workspace to its pristine evaluated state.
 *
 * Nothing here fabricates data. The flags, coverage, and clause
 * positions all regenerate from the certified evaluation engine the
 * moment the workspace loads; what this clears is the WORKED state a
 * previous walkthrough left behind — flags moved through review, filed
 * requests, notice stages, bell notifications, and any documents
 * uploaded during a demo. The result is the same portfolio, freshly
 * evaluated, every time.
 *
 * The audit journal is deliberately left intact (plus one entry for
 * the reset itself): a system of record that erases its own history in
 * demo mode would teach the wrong lesson about the product.
 */
export async function resetDemoOrg(slug: string): Promise<void> {
  const q = db();
  /* extraction jobs first, then documents (document_text cascades). */
  await q.query(`delete from extraction_job where org_slug = $1`, [slug]);
  await q.query(`delete from lease_document where org_slug = $1`, [slug]);
  await q.query(`delete from finding_alert where org_slug = $1`, [slug]);
  await q.query(`delete from client_request where org_slug = $1`, [slug]);
  await q.query(`delete from notice_workflow where org_slug = $1`, [slug]);
  await q.query(`delete from notice_status where org_slug = $1`, [slug]);
  await q.query(`delete from notification where org_slug = $1`, [slug]);
  await q.query(
    `insert into audit_log (actor, action, org_slug, subject, detail)
     values ('system', 'demo_reset', $1, $1, 'demo workspace restored to pristine evaluated state')`,
    [slug],
  );
}

/** Whether the org is currently a demo workspace. */
export async function isDemoOrg(slug: string): Promise<boolean> {
  const { rows } = await db().query(
    `select demo_mode from org_settings where org_slug = $1`,
    [slug],
  );
  return rows[0]?.demo_mode === true;
}

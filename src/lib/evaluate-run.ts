/**
 * ONE EVALUATION PASS, AS A RECORD.
 *
 * Re-evaluates every org whose portfolio is imported, reconciles the
 * flag inbox (insert-if-new episodes — idempotent by the unique
 * episode key), files a bell notification for each NEWLY-arrived flag,
 * prunes expired sessions, and writes an audit row with the counts.
 * Called by the daily cron and by the console's "Run evaluation now".
 */
import { db } from "@/lib/db";
import { PORTFOLIO_SLUGS, portfolioFor } from "@/lib/portfolios";
import { expectedFlagsFor } from "@/lib/findings";

export type EvaluationRunResult = {
  orgs: number;
  flagsChecked: number;
  newFlags: number;
  notified: number;
  sessionsPruned: number;
};

export async function runEvaluation(
  trigger: "cron" | "manual",
): Promise<EvaluationRunResult> {
  let flagsChecked = 0;
  let newFlags = 0;
  let notified = 0;

  for (const slug of PORTFOLIO_SLUGS) {
    const flags = expectedFlagsFor(portfolioFor(slug)!);
    flagsChecked += flags.length;
    for (const f of flags) {
      const { rows } = await db().query(
        `insert into finding_alert
           (org_slug, location_ref, center_name, kind, episode, headline, detail, flagged_on)
         values ($1, $2, $3, $4, $5, $6, $7, $8)
         on conflict (org_slug, location_ref, kind, episode) do nothing
         returning id`,
        [slug, f.locationRef, f.centerName, f.kind, f.episode, f.headline, f.detail, f.flaggedOn],
      );
      if (rows[0]) {
        newFlags++;
        /* a new flag reaches the bell too, deep-linked to the file */
        await db()
          .query(
            `insert into notification (org_slug, kind, title, body, location_ref)
             values ($1, 'flag', $2, $3, $4)`,
            [
              slug,
              `${f.centerName}: ${f.headline}`,
              f.detail,
              f.locationRef,
            ],
          )
          .then(() => notified++)
          .catch(() => {});
      }
    }
  }

  const pruned = await db().query(
    `delete from auth_session where expires_at < now()`,
  );

  await db()
    .query(
      `insert into audit_log (actor, action, org_slug, subject, detail)
       values ('system', 'evaluation_run', null, $1, $2)`,
      [
        trigger,
        `${flagsChecked} flags checked, ${newFlags} new, ${notified} notified, ${pruned.rowCount} sessions pruned`,
      ],
    )
    .catch(() => {});

  return {
    orgs: PORTFOLIO_SLUGS.length,
    flagsChecked,
    newFlags,
    notified,
    sessionsPruned: pruned.rowCount ?? 0,
  };
}

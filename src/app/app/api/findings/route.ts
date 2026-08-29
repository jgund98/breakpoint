/**
 * The flag inbox. GET reconciles the flags the current evaluation
 * implies into finding_alert (insert-if-missing, so a live episode
 * keeps its status across evaluations) and returns the inbox, newest
 * first. POST moves one flag through its lifecycle: start (new →
 * in_review), handle (→ handled), reopen (→ new).
 */
import { NextRequest, NextResponse } from "next/server";
import { canWrite, requireMember } from "@/lib/auth";
import { portfolioFor } from "@/lib/portfolios";
import { db } from "@/lib/db";
import { expectedFlagsFor } from "@/lib/findings";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await requireMember(request);
  if (!session)
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const org = { slug: session.orgSlug! };

  /* Reconcile: a flag row is created the first time an episode is
     seen. An episode already on file keeps its status — that is the
     whole point. A recovered-then-retripped location has a NEW episode
     key and files a new row: the reset.
     TENANCY: the evaluation engine currently holds one imported
     portfolio; flags derive from it only for the org that owns it.
     Any other org sees exactly its own (empty) inbox — never another
     client's flags. */
  const bundle = portfolioFor(org.slug);
  for (const f of bundle ? expectedFlagsFor(bundle) : []) {
    await db().query(
      `insert into finding_alert
         (org_slug, location_ref, center_name, kind, episode, headline, detail, flagged_on)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       on conflict (org_slug, location_ref, kind, episode) do nothing`,
      [
        org.slug,
        f.locationRef,
        f.centerName,
        f.kind,
        f.episode,
        f.headline,
        f.detail,
        f.flaggedOn,
      ],
    );
  }

  const { rows } = await db().query(
    `select id, location_ref, center_name, kind, episode, headline, detail,
            flagged_on, status, actor, handled_at, created_at
       from finding_alert
      where org_slug = $1
      order by flagged_on desc, id desc
      limit 200`,
    [org.slug],
  );
  const counts = { new: 0, in_review: 0, handled: 0 } as Record<string, number>;
  for (const r of rows) counts[r.status] = (counts[r.status] ?? 0) + 1;
  return NextResponse.json({ flags: rows, counts });
}

const MOVES: Record<string, string> = {
  start: "in_review",
  handle: "handled",
  reopen: "new",
};

export async function POST(request: NextRequest) {
  const session = await requireMember(request);
  if (!session)
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!canWrite(session))
    return NextResponse.json(
      { error: "Your role is read-only here." },
      { status: 403 },
    );
  const org = { slug: session.orgSlug! };
  const payload = (await request.json().catch(() => null)) as {
    id?: number;
    action?: string;
  } | null;
  const id = Number(payload?.id);
  const action = String(payload?.action ?? "");
  if (!Number.isInteger(id) || !(action in MOVES))
    return NextResponse.json({ error: "Unreadable action." }, { status: 400 });

  const status = MOVES[action];
  const { rowCount } = await db().query(
    `update finding_alert
        set status = $1,
            actor = 'client',
            handled_at = case when $1 = 'handled' then now() else null end,
            updated_at = now()
      where id = $2 and org_slug = $3`,
    [status, id, org.slug],
  );
  if (!rowCount)
    return NextResponse.json({ error: "No such flag." }, { status: 404 });

  await db().query(
    `insert into audit_log (actor, action, org_slug, subject, detail)
     values ('client', 'finding_' || $1, $2, $3, $4)`,
    [action, org.slug, String(id), status],
  );
  return NextResponse.json({ ok: true, status });
}

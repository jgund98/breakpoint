/**
 * The operations API, multi-client.
 *
 * GET without ?org= is the HQ payload: the client registry with
 * per-client stats, the onboarding submissions, and the global agent
 * canon. GET ?org=slug is one client's board: schedule, location
 * config, sources, requests. Every org-scoped write names its org and
 * is validated against the registry — nothing here assumes which
 * client exists.
 *
 * One route, action-switched, because the boards load and save as a
 * unit and a dozen tiny endpoints would each re-implement the same
 * auth and error shape.
 *
 * Auth is the workspace session for now, behind the site lock and the
 * proxy gate on /admin. Real staff auth replaces this the moment a
 * client account exists that is not us; the route is structured so that
 * swap is the `authorized` function and nothing else.
 */
import { NextRequest, NextResponse } from "next/server";
import { hashPassword, requireStaff } from "@/lib/auth";
import { resetDemoOrg } from "@/lib/demo-reset";
import { db } from "@/lib/db";
import { orgBySlug, sanitizeSlug, PORTFOLIOS } from "@/lib/orgs";
import { rowById } from "@/lib/portfolio";

export const runtime = "nodejs";

/** Append-only record of what the console did. Never blocks the action. */
async function audit(
  action: string,
  orgSlug: string | null,
  subject: string | null,
  detail?: string,
) {
  try {
    await db().query(
      `insert into audit_log (actor, action, org_slug, subject, detail)
       values ('ops', $1, $2, $3, $4)`,
      [action, orgSlug, subject, detail ?? null],
    );
  } catch {
    /* the log must never take the action down with it */
  }
}

/** Files an alert for the client. Their bell and our delivery log read it. */
async function notify(
  orgSlug: string,
  kind: string,
  title: string,
  body: string | null,
  locationRef?: string | null,
) {
  try {
    await db().query(
      `insert into notification (org_slug, kind, title, body, location_ref)
       values ($1, $2, $3, $4, $5)`,
      [orgSlug, kind, title, body, locationRef ?? null],
    );
  } catch {
    /* same rule as the audit log */
  }
}

const clip = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

/** A schedule we are willing to store. Anything else is refused. */
function normalizeSchedule(raw: unknown): object | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as { cadence?: string; weekday?: number; days?: unknown[] };
  if (s.cadence === "weekly") {
    const weekday = Number(s.weekday);
    if (Number.isInteger(weekday) && weekday >= 0 && weekday <= 6)
      return { cadence: "weekly", weekday };
    return null;
  }
  if (s.cadence === "monthly_days" && Array.isArray(s.days)) {
    const days = s.days
      .map((d) => (d === "last" ? "last" : Number(d)))
      .filter((d) => d === "last" || (Number.isInteger(d) && d >= 1 && d <= 28));
    if (days.length && days.length <= 8) return { cadence: "monthly_days", days };
  }
  return null;
}

export async function GET(request: NextRequest) {
  const staff = await requireStaff(request);
  if (!staff)
    return NextResponse.json({ error: "Staff only." }, { status: 403 });

  const slug = (request.nextUrl.searchParams.get("org") ?? "").slice(0, 64);

  /* ---- one client's board ---- */
  if (slug) {
    const org = await orgBySlug(slug);
    if (!org)
      return NextResponse.json({ error: "Unknown client." }, { status: 404 });

    const [settings, configs, sources, requests, pipeline, alerts, notices, runs, flags] =
      await Promise.all([
        db().query(`select scan_schedule from org_settings where org_slug = $1`, [
          org.slug,
        ]),
        db().query(
          `select location_ref, status, scan_schedule, place_id, lease_updated_on, notes
             from location_config where org_slug = $1`,
          [org.slug],
        ),
        db().query(
          `select id, center_ref, kind, url, place_id, label from center_source
            order by created_at`,
        ),
        db().query(
          `select id, location_ref, center_name, kind, store_name, observed_on, body,
                  created_at, handled_at, handled_by
             from client_request where org_slug = $1
            order by (handled_at is null) desc, created_at desc
            limit 100`,
          [org.slug],
        ),
        db().query(
          `select location_ref, stage, extracted, source_excerpt, confidence, note,
                  created_at, updated_at
             from location_pipeline where org_slug = $1
            order by created_at`,
          [org.slug],
        ),
        db().query(
          `select id, kind, title, body, location_ref, created_at, read_at
             from notification where org_slug = $1
            order by created_at desc limit 30`,
          [org.slug],
        ),
        db().query(
          `select location_ref, stage, served_on, response, updated_at
             from notice_status where org_slug = $1
            order by updated_at desc`,
          [org.slug],
        ),
        db().query(
          `select id, ran_by, note, locations, stores, changes, created_at
             from scan_run where org_slug = $1
            order by created_at desc limit 8`,
          [org.slug],
        ),
        db().query(
          `select id, location_ref, center_name, kind, headline, flagged_on,
                  status, actor, handled_at, created_at
             from finding_alert where org_slug = $1
            order by flagged_on desc, id desc limit 100`,
          [org.slug],
        ),
      ]);

    return NextResponse.json({
      org: {
        slug: org.slug,
        name: org.name,
        status: org.status,
        descriptor: org.descriptor,
        accountManager: org.account_manager,
        contractStart: org.contract_start,
        contractRenewal: org.contract_renewal,
        hasPortfolio: Boolean(PORTFOLIOS[org.slug]),
      },
      orgSchedule: settings.rows[0]?.scan_schedule ?? null,
      locations: configs.rows,
      sources: sources.rows,
      requests: requests.rows,
      pipeline: pipeline.rows,
      alerts: alerts.rows,
      noticeStatus: notices.rows,
      scanRuns: runs.rows,
      flags: flags.rows,
    });
  }

  /* ---- the cross-client extraction queue ---- */
  if (request.nextUrl.searchParams.get("pipeline")) {
    const [queue, audits, jobs] = await Promise.all([
      db().query(
        `select p.org_slug, o.name as org_name, p.location_ref, p.stage,
                p.extracted, p.source_excerpt, p.confidence, p.note,
                p.created_at, p.updated_at
           from location_pipeline p
           left join org o on o.slug = p.org_slug
          order by p.created_at`,
      ),
      db().query(
        `select actor, action, org_slug, subject, detail, created_at
           from audit_log order by created_at desc limit 80`,
      ),
      db().query(
        `select j.id, j.org_slug, o.name as org_name, j.location_ref,
                j.status, j.provider, j.model, j.prompt_version,
                j.confidence, j.result, j.citations, j.error,
                j.created_by, j.created_at, d.filename
           from extraction_job j
           left join org o on o.slug = j.org_slug
           left join lease_document d on d.id = j.document_id
          where j.status in ('queued','extracting','review','proposed','failed')
          order by j.created_at desc
          limit 60`,
      ),
    ]);
    return NextResponse.json({
      queue: queue.rows,
      audit: audits.rows,
      jobs: jobs.rows,
    });
  }

  /* ---- HQ: the whole company ---- */
  const [orgs, submissions, directives, requestsAll, placeCover, dirCover, pipelineAll, handleAvg] =
    await Promise.all([
    db().query(
      `select o.slug, o.name, o.status, o.descriptor, o.created_at,
              o.account_manager, o.contract_renewal,
              coalesce(r.open_requests, 0)::int as open_requests
         from org o
         left join (
           select org_slug, count(*) as open_requests
             from client_request
            where handled_at is null
            group by org_slug
         ) r on r.org_slug = o.slug
        order by o.name`,
    ),
    db().query(
      `select s.id, s.org_slug, s.client_name, s.store_estimate, s.row_count,
              s.submitted_at, s.processed_at,
              (o.slug is not null) as org_exists
         from onboarding_submission s
         left join org o on o.slug = s.org_slug
        order by s.submitted_at desc limit 25`,
    ),
    db().query(
      `select id, scope, topic, body, active, sort from agent_directive
        where scope = 'global'
        order by sort, created_at`,
    ),
    db().query(
      `select r.id, r.org_slug, o.name as org_name, r.location_ref, r.center_name,
              r.kind, r.store_name, r.observed_on, r.body, r.created_at, r.handled_at
         from client_request r
         left join org o on o.slug = r.org_slug
        order by (r.handled_at is null) desc, r.created_at desc
        limit 100`,
    ),
    db().query(
      `select org_slug,
              count(*) filter (where place_id is not null and place_id <> '') as with_place
         from location_config group by org_slug`,
    ),
    db().query(
      `select count(distinct center_ref)::int as n from center_source
        where kind = 'directory'`,
    ),
    db().query(
      `select count(*)::int as n from location_pipeline`,
    ),
    db().query(
      `select avg(extract(epoch from handled_at - created_at))::int as secs
         from client_request where handled_at is not null`,
    ),
  ]);

  /* Internal staff roster: everyone holding the platform_admin key. */
  const staffRows = await db().query(
    `select id, email, name, title, disabled_at, created_at
       from app_user where platform_admin = true
      order by (disabled_at is not null), name`,
  );

  /* Demo workspaces, so the registry can badge them. */
  const demoRows = await db().query(
    `select org_slug from org_settings where demo_mode = true`,
  );
  const demoSlugs = new Set(demoRows.rows.map((r) => r.org_slug));

  return NextResponse.json({
    orgs: orgs.rows.map((o) => ({
      ...o,
      locations: PORTFOLIOS[o.slug]?.locations ?? null,
      centers: PORTFOLIOS[o.slug]?.centers ?? null,
      demo_mode: demoSlugs.has(o.slug),
    })),
    staff: staffRows.rows,
    submissions: submissions.rows,
    directives: directives.rows,
    requestsAll: requestsAll.rows,
    coverage: {
      withPlaceByOrg: placeCover.rows,
      centersWithDirectory: dirCover.rows[0]?.n ?? 0,
    },
    pipelinePending: pipelineAll.rows[0]?.n ?? 0,
    avgHandleSeconds: handleAvg.rows[0]?.secs ?? null,
  });
}

export async function POST(request: NextRequest) {
  const staff = await requireStaff(request);
  if (!staff)
    return NextResponse.json({ error: "Staff only." }, { status: 403 });

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const action = clip(payload.action, 32);

  /* ---- org-scoped actions name their org, always ---- */
  const ORG_SCOPED = ["org_schedule", "location", "request_handled", "finding_move", "demo_mode"];
  let org: Awaited<ReturnType<typeof orgBySlug>> = null;
  if (ORG_SCOPED.includes(action)) {
    org = await orgBySlug(clip(payload.org, 64));
    if (!org)
      return NextResponse.json({ error: "Unknown client." }, { status: 400 });
  }

  /* ops moving a client flag through its lifecycle, on the record */
  if (action === "finding_move" && org) {
    const id = Number(payload.id);
    const status = clip(payload.status, 16);
    if (!Number.isInteger(id) || !["new", "in_review", "handled"].includes(status))
      return NextResponse.json({ error: "Unreadable move." }, { status: 400 });
    const { rowCount } = await db().query(
      `update finding_alert
          set status = $1, actor = 'ops',
              handled_at = case when $1 = 'handled' then now() else null end,
              updated_at = now()
        where id = $2 and org_slug = $3`,
      [status, id, org.slug],
    );
    if (!rowCount)
      return NextResponse.json({ error: "No such flag." }, { status: 404 });
    await audit("finding_move", org.slug, String(id), status);
    return NextResponse.json({ ok: true });
  }

  if (action === "org_schedule" && org) {
    const schedule = normalizeSchedule(payload.schedule);
    if (!schedule)
      return NextResponse.json({ error: "Unreadable schedule." }, { status: 400 });
    await db().query(
      `insert into org_settings (org_slug, scan_schedule, updated_at)
       values ($1, $2, now())
       on conflict (org_slug) do update
         set scan_schedule = excluded.scan_schedule, updated_at = now()`,
      [org.slug, JSON.stringify(schedule)],
    );
    await audit("org_schedule", org.slug, null, JSON.stringify(schedule));
    return NextResponse.json({ ok: true });
  }

  if (action === "location" && org) {
    const ref = clip(payload.locationRef, 64);
    if (!ref)
      return NextResponse.json({ error: "No location." }, { status: 400 });
    const status = clip(payload.status, 16) || "active";
    if (!["active", "paused", "removed"].includes(status))
      return NextResponse.json({ error: "Unknown status." }, { status: 400 });

    /* An explicit null schedule clears the override back to inherit. */
    const schedule =
      payload.schedule == null ? null : normalizeSchedule(payload.schedule);
    if (payload.schedule != null && !schedule)
      return NextResponse.json({ error: "Unreadable schedule." }, { status: 400 });

    const rawDate = clip(payload.leaseUpdatedOn, 10);
    const leaseUpdatedOn = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : null;

    await db().query(
      `insert into location_config
         (org_slug, location_ref, status, scan_schedule, place_id, lease_updated_on, notes, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, now())
       on conflict (org_slug, location_ref) do update set
         status = excluded.status,
         scan_schedule = excluded.scan_schedule,
         place_id = excluded.place_id,
         lease_updated_on = excluded.lease_updated_on,
         notes = excluded.notes,
         updated_at = now()`,
      [
        org.slug,
        ref,
        status,
        schedule ? JSON.stringify(schedule) : null,
        clip(payload.placeId, 200) || null,
        leaseUpdatedOn,
        clip(payload.notes, 2000) || null,
      ],
    );

    /* An amendment landing is what queues re-extraction: the current
       record is snapshotted as the draft a person will re-approve
       against the new papers. Only meaningful once a portfolio is
       wired into the engine. */
    if (leaseUpdatedOn && PORTFOLIOS[org.slug]) {
      const row = rowById(ref);
      if (row) {
        const extracted = {
          cite: row.clause.id,
          tests: row.evaluation.triggers.map((t) => ({
            label: t.label,
            cite: t.cite,
          })),
          remedy: row.clause.remedy?.kind ?? null,
          preconditions: row.clause.preconditions?.length ?? 0,
        };
        await db().query(
          `insert into location_pipeline
             (org_slug, location_ref, stage, extracted, source_excerpt, confidence, note, updated_at)
           values ($1, $2, 'extracted', $3, $4, $5, $6, now())
           on conflict (org_slug, location_ref) do update set
             stage = 'extracted',
             extracted = excluded.extracted,
             source_excerpt = excluded.source_excerpt,
             confidence = excluded.confidence,
             note = excluded.note,
             updated_at = now()`,
          [
            org.slug,
            ref,
            JSON.stringify(extracted),
            row.clause.sourceText ?? null,
            Math.round((row.clause.confidence ?? 0) * 100) || null,
            `Lease updated ${leaseUpdatedOn}; record queued for re-approval.`,
          ],
        );
        await audit("pipeline_queued", org.slug, ref, `lease updated ${leaseUpdatedOn}`);
      }
    }
    await audit("location_saved", org.slug, ref);
    return NextResponse.json({ ok: true });
  }

  /* ---- ingestion: a person signs off on an extracted document ---- */
  if (action === "job_approve" || action === "job_reject") {
    const id = Number(payload.id);
    if (!Number.isInteger(id))
      return NextResponse.json({ error: "No job." }, { status: 400 });
    const { rows: jobs } = await db().query(
      `select id, org_slug, location_ref, status,
              (select filename from lease_document d where d.id = document_id) as filename
         from extraction_job where id = $1`,
      [id],
    );
    const job = jobs[0];
    if (!job || !["review", "proposed"].includes(job.status))
      return NextResponse.json(
        { error: "Nothing awaiting a decision on that job." },
        { status: 404 },
      );
    const to = action === "job_approve" ? "approved" : "rejected";
    await db().query(
      `update extraction_job
          set status = $2, reviewed_by = 'ops',
              error = case when $2 = 'rejected' then $3 else error end,
              updated_at = now()
        where id = $1`,
      [id, to, clip(payload.reason, 500) || "Rejected by review."],
    );
    await audit(`extraction_${to}`, job.org_slug, job.location_ref, job.filename);
    await notify(
      job.org_slug,
      "extraction",
      to === "approved"
        ? `${job.filename ?? "Your document"}: record approved`
        : `${job.filename ?? "Your document"} needs another look`,
      to === "approved"
        ? `A person reviewed the extracted record for ${job.location_ref} and signed off. It is on file under watch.`
        : `The extraction could not be approved as read. ${clip(payload.reason, 300) || "Operations will follow up."}`,
      job.location_ref,
    );
    return NextResponse.json({ ok: true, status: to });
  }

  /* ---- the abstraction lifecycle ---- */
  if (action === "pipeline_approve") {
    const org = await orgBySlug(clip(payload.org, 64));
    const ref = clip(payload.locationRef, 64);
    if (!org || !ref)
      return NextResponse.json({ error: "No location." }, { status: 400 });
    const { rowCount } = await db().query(
      `delete from location_pipeline where org_slug = $1 and location_ref = $2`,
      [org.slug, ref],
    );
    if (!rowCount)
      return NextResponse.json({ error: "Nothing in review." }, { status: 404 });
    await audit("pipeline_approved", org.slug, ref);
    await notify(
      org.slug,
      "record",
      "Clause record re-approved",
      `The updated record for ${ref} was reviewed by a person and is live under watch again.`,
      ref,
    );
    return NextResponse.json({ ok: true });
  }

  /* ---- a filed scan pass: monitoring as a record ---- */
  if (action === "scan_run_file") {
    const org = await orgBySlug(clip(payload.org, 64));
    if (!org)
      return NextResponse.json({ error: "Unknown client." }, { status: 400 });
    const raw = Array.isArray(payload.observations) ? payload.observations : [];
    const obs = raw
      .slice(0, 4000)
      .map((o: Record<string, unknown>) => ({
        locationRef: clip(o.locationRef, 64),
        centerRef: clip(o.centerRef, 120),
        store: clip(o.store, 160),
        status: clip(o.status, 12),
        changed: Boolean(o.changed),
        note: clip(o.note, 500) || null,
      }))
      .filter(
        (o) =>
          o.locationRef &&
          o.centerRef &&
          o.store &&
          ["open", "closed", "unclear"].includes(o.status),
      );
    if (!obs.length)
      return NextResponse.json({ error: "A pass needs observations." }, { status: 400 });

    const changes = obs.filter((o) => o.changed).length;
    const { rows: runRows } = await db().query(
      `insert into scan_run (org_slug, ran_by, note, locations, stores, changes)
       values ($1, 'ops', $2, $3, $4, $5) returning id`,
      [
        org.slug,
        clip(payload.note, 500) || null,
        new Set(obs.map((o) => o.locationRef)).size,
        obs.length,
        changes,
      ],
    );
    const runId = runRows[0].id;
    for (const o of obs) {
      await db().query(
        `insert into scan_observation
           (run_id, org_slug, location_ref, center_ref, store_name, status, changed, note)
         values ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [runId, org.slug, o.locationRef, o.centerRef, o.store, o.status, o.changed, o.note],
      );
      if (o.changed && o.status === "closed") {
        await notify(
          org.slug,
          "scan",
          "Change detected on a scan",
          `${o.store} was observed closed at this center. The clause evaluation is being re-checked.`,
          o.locationRef,
        );
      }
    }
    await audit(
      "scan_filed",
      org.slug,
      null,
      `${obs.length} stores across ${new Set(obs.map((o) => o.locationRef)).size} locations, ${changes} changes`,
    );
    return NextResponse.json({ ok: true, id: runId, changes });
  }

  /* ---- the account facts ---- */
  if (action === "org_update") {
    const org = await orgBySlug(clip(payload.org, 64));
    if (!org)
      return NextResponse.json({ error: "Unknown client." }, { status: 400 });
    const dateOrNull = (v: unknown) => {
      const s = clip(v, 10);
      return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
    };
    await db().query(
      `update org set account_manager = $2, contract_start = $3, contract_renewal = $4
        where slug = $1`,
      [
        org.slug,
        clip(payload.accountManager, 120) || null,
        dateOrNull(payload.contractStart),
        dateOrNull(payload.contractRenewal),
      ],
    );
    await audit("org_updated", org.slug, null, "account facts");
    return NextResponse.json({ ok: true });
  }

  if (action === "request_handled" && org) {
    const id = clip(payload.id, 64);
    if (!id) return NextResponse.json({ error: "No request." }, { status: 400 });
    const { rows: handled } = await db().query(
      `update client_request
          set handled_at = now(), handled_by = $2
        where id = $1 and org_slug = $3 and handled_at is null
        returning kind, center_name, location_ref`,
      [id, clip(payload.by, 80) || "ops", org.slug],
    );
    if (handled.length) {
      const r = handled[0];
      const what =
        r.kind === "manual_scan"
          ? "Your scan request was handled"
          : r.kind === "closure_report"
            ? "Your closure report was reviewed"
            : "Your estoppel review was handled";
      await notify(
        org.slug,
        "request",
        what,
        r.center_name
          ? `${r.center_name}. The result is on the location's record.`
          : "The result is on the location's record.",
        r.location_ref,
      );
      await audit("request_handled", org.slug, r.location_ref, r.kind);
    }
    return NextResponse.json({ ok: true });
  }

  /* ---- center sources are shared plumbing, keyed to centers ---- */
  if (action === "source_add") {
    const centerRef = clip(payload.centerRef, 120);
    const kind = clip(payload.kind, 16) || "directory";
    if (!centerRef || !["directory", "places", "press", "other"].includes(kind))
      return NextResponse.json({ error: "Unreadable source." }, { status: 400 });
    const url = clip(payload.url, 500);
    const placeId = clip(payload.placeId, 200);
    if (!url && !placeId)
      return NextResponse.json(
        { error: "A source needs a url or a Places id." },
        { status: 400 },
      );
    const { rows } = await db().query(
      `insert into center_source (center_ref, kind, url, place_id, label)
       values ($1, $2, $3, $4, $5) returning id`,
      [centerRef, kind, url || null, placeId || null, clip(payload.label, 120) || null],
    );
    await audit("source_added", null, centerRef, url || placeId);
    return NextResponse.json({ ok: true, id: rows[0].id });
  }

  if (action === "source_remove") {
    const id = clip(payload.id, 64);
    if (!id) return NextResponse.json({ error: "No source." }, { status: 400 });
    await db().query(`delete from center_source where id = $1`, [id]);
    await audit("source_removed", null, id);
    return NextResponse.json({ ok: true });
  }

  /* ---- HQ actions ---- */
  if (action === "org_create") {
    const id = clip(payload.submissionId, 64);
    if (!id)
      return NextResponse.json({ error: "No submission." }, { status: 400 });
    const { rows } = await db().query(
      `select org_slug, client_name from onboarding_submission where id = $1`,
      [id],
    );
    if (!rows.length)
      return NextResponse.json({ error: "No such submission." }, { status: 404 });
    const slug = sanitizeSlug(rows[0].org_slug);
    if (!slug)
      return NextResponse.json(
        { error: "The submission carries no usable client slug." },
        { status: 400 },
      );
    const name = clip(rows[0].client_name, 120) || slug;
    await db().query(
      `insert into org (name, slug, status) values ($1, $2, 'onboarding')
       on conflict (slug) do nothing`,
      [name, slug],
    );
    await db().query(
      `update onboarding_submission
          set processed_at = now(), processed_by = 'account-created'
        where id = $1 and processed_at is null`,
      [id],
    );
    await audit("org_created", slug, id, name);
    return NextResponse.json({ ok: true, slug });
  }

  /* Create a client by hand, ahead of any submission: the invite-first
     flow. The onboarding console link is minted from the same fields. */
  if (action === "org_create_manual") {
    const name = clip(payload.name, 120);
    if (!name)
      return NextResponse.json({ error: "A client needs a name." }, { status: 400 });
    const slug = sanitizeSlug(clip(payload.slug, 64) || name);
    if (!slug)
      return NextResponse.json({ error: "Unusable slug." }, { status: 400 });
    const existing = await orgBySlug(slug);
    if (existing)
      return NextResponse.json(
        { error: `"${slug}" is already a client.` },
        { status: 409 },
      );
    await db().query(
      `insert into org (name, slug, status, descriptor)
       values ($1, $2, 'onboarding', $3)`,
      [name, slug, clip(payload.descriptor, 120) || null],
    );
    await audit("org_created", slug, null, name);
    return NextResponse.json({ ok: true, slug });
  }

  if (action === "org_status") {
    const target = await orgBySlug(clip(payload.org, 64));
    const status = clip(payload.status, 16);
    if (!target || !["onboarding", "live", "paused"].includes(status))
      return NextResponse.json({ error: "Unreadable status." }, { status: 400 });
    await db().query(`update org set status = $2 where slug = $1`, [
      target.slug,
      status,
    ]);
    await audit("org_status", target.slug, null, status);
    return NextResponse.json({ ok: true });
  }

  if (action === "submission_processed") {
    const id = clip(payload.id, 64);
    if (!id) return NextResponse.json({ error: "No submission." }, { status: 400 });
    await db().query(
      `update onboarding_submission
          set processed_at = now(), processed_by = $2
        where id = $1`,
      [id, clip(payload.by, 80) || "ops"],
    );
    await audit("submission_processed", null, id);
    return NextResponse.json({ ok: true });
  }

  /* Directive editing is HQ-only for now: the global canon. Per-client
     programming was deliberately pulled from the boards until the
     agent-tuning workflow is designed. */
  if (action === "directive_add") {
    const body = clip(payload.body, 4000);
    if (!body) return NextResponse.json({ error: "Empty directive." }, { status: 400 });
    const topic = clip(payload.topic, 16) || "general";
    if (!["general", "extraction", "scanning", "matching", "notices"].includes(topic))
      return NextResponse.json({ error: "Unknown topic." }, { status: 400 });
    const { rows } = await db().query(
      `insert into agent_directive (scope, topic, body) values ('global', $1, $2)
       returning id`,
      [topic, body],
    );
    await audit("directive_added", null, topic, body.slice(0, 120));
    return NextResponse.json({ ok: true, id: rows[0].id });
  }

  if (action === "directive_toggle") {
    const id = clip(payload.id, 64);
    if (!id) return NextResponse.json({ error: "No directive." }, { status: 400 });
    await db().query(
      `update agent_directive set active = not active, updated_at = now()
        where id = $1`,
      [id],
    );
    return NextResponse.json({ ok: true });
  }

  if (action === "directive_remove") {
    const id = clip(payload.id, 64);
    if (!id) return NextResponse.json({ error: "No directive." }, { status: 400 });
    await db().query(`delete from agent_directive where id = $1`, [id]);
    return NextResponse.json({ ok: true });
  }

  /* ---- internal staff management ----
     Everyone holding platform_admin can manage the roster; the guards
     below keep the console from locking itself out. No emails are
     sent: the person adding an account hands the temporary password
     over directly and the teammate changes it on first use. */
  if (action === "staff_add") {
    const name = clip(payload.name, 120);
    const email = clip(payload.email, 200).toLowerCase();
    const title = clip(payload.title, 120);
    const password = String(payload.password ?? "").slice(0, 200);
    if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      return NextResponse.json(
        { error: "A name and a real email are required." },
        { status: 400 },
      );
    const existing = await db().query(
      `select id, platform_admin from app_user where email = $1`,
      [email],
    );
    if (existing.rows[0]?.platform_admin)
      return NextResponse.json(
        { error: "Already on the internal team." },
        { status: 409 },
      );
    if (existing.rows[0]) {
      /* A client-side user joining the company keeps their account and
         password; they simply gain the staff key. */
      await db().query(
        `update app_user set platform_admin = true, title = coalesce(nullif($2, ''), title)
          where id = $1`,
        [existing.rows[0].id, title],
      );
      await audit("staff_add", null, email, `promoted existing account (${staff.email})`);
      return NextResponse.json({ ok: true, promoted: true });
    }
    if (password.length < 10)
      return NextResponse.json(
        { error: "A new account needs a temporary password of 10+ characters." },
        { status: 400 },
      );
    await db().query(
      `insert into app_user (email, name, title, password_hash, platform_admin)
       values ($1, $2, nullif($3, ''), $4, true)`,
      [email, name, title, hashPassword(password)],
    );
    await audit("staff_add", null, email, `internal account created (${staff.email})`);
    return NextResponse.json({ ok: true });
  }

  if (action === "staff_disable" || action === "staff_enable") {
    const id = clip(payload.id, 64);
    if (!id) return NextResponse.json({ error: "No account." }, { status: 400 });
    const target = await db().query(
      `select id, email, platform_admin, disabled_at from app_user where id = $1`,
      [id],
    );
    if (!target.rows[0]?.platform_admin)
      return NextResponse.json({ error: "Not an internal account." }, { status: 404 });
    if (action === "staff_disable") {
      if (target.rows[0].email === staff.email)
        return NextResponse.json(
          { error: "You cannot disable your own account." },
          { status: 400 },
        );
      const others = await db().query(
        `select count(*)::int as n from app_user
          where platform_admin = true and disabled_at is null and id <> $1`,
        [id],
      );
      if ((others.rows[0]?.n ?? 0) < 1)
        return NextResponse.json(
          { error: "At least one active internal account must remain." },
          { status: 400 },
        );
      await db().query(`update app_user set disabled_at = now() where id = $1`, [id]);
      /* The door closes now, not at next sign-in. */
      await db().query(`delete from auth_session where user_id = $1`, [id]);
      await audit("staff_disable", null, target.rows[0].email, `by ${staff.email}`);
    } else {
      await db().query(`update app_user set disabled_at = null where id = $1`, [id]);
      await audit("staff_enable", null, target.rows[0].email, `by ${staff.email}`);
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "staff_password") {
    const id = clip(payload.id, 64);
    const password = String(payload.password ?? "").slice(0, 200);
    if (!id || password.length < 10)
      return NextResponse.json(
        { error: "A temporary password of 10+ characters is required." },
        { status: 400 },
      );
    const target = await db().query(
      `select email, platform_admin from app_user where id = $1`,
      [id],
    );
    if (!target.rows[0]?.platform_admin)
      return NextResponse.json({ error: "Not an internal account." }, { status: 404 });
    await db().query(`update app_user set password_hash = $2 where id = $1`, [
      id,
      hashPassword(password),
    ]);
    /* Old sessions die with the old password. */
    await db().query(`delete from auth_session where user_id = $1`, [id]);
    await audit("staff_password", null, target.rows[0].email, `reset by ${staff.email}`);
    return NextResponse.json({ ok: true });
  }

  /* ---- demo mode ----
     While on, every sign-in to the org restores the pristine evaluated
     state (see lib/demo-reset). Turning it on resets immediately so
     the very next walkthrough is clean. */
  if (action === "demo_mode" && org) {
    const on = payload.on === true;
    await db().query(
      `insert into org_settings (org_slug, demo_mode, updated_at)
       values ($1, $2, now())
       on conflict (org_slug) do update set demo_mode = $2, updated_at = now()`,
      [org.slug, on],
    );
    if (on) await resetDemoOrg(org.slug);
    await audit("demo_mode", org.slug, org.slug, on ? "on (reset ran)" : "off");
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}

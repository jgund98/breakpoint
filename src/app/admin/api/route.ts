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
import { SESSION_COOKIE, SESSION_TOKEN } from "@/lib/session";
import { db } from "@/lib/db";
import { orgBySlug, sanitizeSlug, PORTFOLIOS } from "@/lib/orgs";

export const runtime = "nodejs";

function authorized(request: NextRequest) {
  return request.cookies.get(SESSION_COOKIE)?.value === SESSION_TOKEN;
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
  if (!authorized(request))
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const slug = (request.nextUrl.searchParams.get("org") ?? "").slice(0, 64);

  /* ---- one client's board ---- */
  if (slug) {
    const org = await orgBySlug(slug);
    if (!org)
      return NextResponse.json({ error: "Unknown client." }, { status: 404 });

    const [settings, configs, sources, requests] = await Promise.all([
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
    ]);

    return NextResponse.json({
      org: {
        slug: org.slug,
        name: org.name,
        status: org.status,
        hasPortfolio: Boolean(PORTFOLIOS[org.slug]),
      },
      orgSchedule: settings.rows[0]?.scan_schedule ?? null,
      locations: configs.rows,
      sources: sources.rows,
      requests: requests.rows,
    });
  }

  /* ---- HQ: the whole company ---- */
  const [orgs, submissions, directives] = await Promise.all([
    db().query(
      `select o.slug, o.name, o.status, o.descriptor, o.created_at,
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
  ]);

  return NextResponse.json({
    orgs: orgs.rows.map((o) => ({
      ...o,
      locations: PORTFOLIOS[o.slug]?.locations ?? null,
      centers: PORTFOLIOS[o.slug]?.centers ?? null,
    })),
    submissions: submissions.rows,
    directives: directives.rows,
  });
}

export async function POST(request: NextRequest) {
  if (!authorized(request))
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const action = clip(payload.action, 32);

  /* ---- org-scoped actions name their org, always ---- */
  const ORG_SCOPED = ["org_schedule", "location", "request_handled"];
  let org: Awaited<ReturnType<typeof orgBySlug>> = null;
  if (ORG_SCOPED.includes(action)) {
    org = await orgBySlug(clip(payload.org, 64));
    if (!org)
      return NextResponse.json({ error: "Unknown client." }, { status: 400 });
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
    return NextResponse.json({ ok: true });
  }

  if (action === "request_handled" && org) {
    const id = clip(payload.id, 64);
    if (!id) return NextResponse.json({ error: "No request." }, { status: 400 });
    await db().query(
      `update client_request
          set handled_at = now(), handled_by = $2
        where id = $1 and org_slug = $3`,
      [id, clip(payload.by, 80) || "ops", org.slug],
    );
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
    return NextResponse.json({ ok: true, id: rows[0].id });
  }

  if (action === "source_remove") {
    const id = clip(payload.id, 64);
    if (!id) return NextResponse.json({ error: "No source." }, { status: 400 });
    await db().query(`delete from center_source where id = $1`, [id]);
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

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}

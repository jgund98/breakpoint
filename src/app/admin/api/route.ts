/**
 * The operations API: everything the team programs about how a
 * portfolio is watched, plus the client-request queue.
 *
 * One route, action-switched, because the admin board loads and saves
 * as a unit and a dozen tiny endpoints would each re-implement the same
 * auth and error shape.
 *
 * Auth is the workspace session for now, behind the site lock and the
 * proxy gate on /admin. Real staff auth replaces this the moment a
 * client account exists that is not us; the route is structured so that
 * swap is the `authorized` function and nothing else.
 */
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_TOKEN } from "@/lib/session";
import { currentOrg } from "@/lib/repo";
import { db } from "@/lib/db";

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

  const org = currentOrg();
  const [settings, configs, sources, requests, submissions, directives] = await Promise.all([
    db().query(`select scan_schedule from org_settings where org_slug = $1`, [org.slug]),
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
      `select id, org_slug, client_name, store_estimate, row_count,
              submitted_at, processed_at
         from onboarding_submission
        order by submitted_at desc limit 25`,
    ),
    db().query(
      `select id, scope, topic, body, active, sort from agent_directive
        where scope in ('global', $1)
        order by scope, sort, created_at`,
      [org.slug],
    ),
  ]);

  return NextResponse.json({
    orgSchedule: settings.rows[0]?.scan_schedule ?? null,
    locations: configs.rows,
    sources: sources.rows,
    requests: requests.rows,
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

  const org = currentOrg();
  const action = clip(payload.action, 32);

  if (action === "org_schedule") {
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

  if (action === "location") {
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

  if (action === "request_handled") {
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

  if (action === "directive_add") {
    const body = clip(payload.body, 4000);
    if (!body) return NextResponse.json({ error: "Empty directive." }, { status: 400 });
    const scope = payload.scope === "org" ? org.slug : "global";
    const topic = clip(payload.topic, 16) || "general";
    if (!["general", "extraction", "scanning", "matching", "notices"].includes(topic))
      return NextResponse.json({ error: "Unknown topic." }, { status: 400 });
    const { rows } = await db().query(
      `insert into agent_directive (scope, topic, body) values ($1, $2, $3)
       returning id`,
      [scope, topic, body],
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

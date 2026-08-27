/**
 * Client requests: manual scans, closure reports, estoppel reviews.
 *
 * The first write path in the product. Everything before this rendered
 * from a file; a row inserted here is really there tomorrow, which is
 * the difference between a demo and a service. The table doubles as the
 * queue the team works while service is manual, so a request that lands
 * here is a request somebody actually picks up.
 *
 * Lives under /app so the proxy's two gates (site lock, then workspace
 * session) run before this code does; the session is checked again here
 * because a route handler should not trust that routing saved it.
 */
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_TOKEN } from "@/lib/session";
import { currentOrg } from "@/lib/repo";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const KINDS = new Set(["manual_scan", "closure_report", "estoppel_review"]);

function authorized(request: NextRequest) {
  return request.cookies.get(SESSION_COOKIE)?.value === SESSION_TOKEN;
}

/** Trim to a sane length; a request field is not a document upload. */
const clip = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const kind = clip(payload.kind, 32);
  if (!KINDS.has(kind)) {
    return NextResponse.json({ error: "Unknown request kind." }, { status: 400 });
  }

  const locationRef = clip(payload.locationId, 64);
  const centerName = clip(payload.centerName, 200);
  const storeName = clip(payload.storeName, 200);
  const body = clip(payload.body, 4000);

  /* A closure report without a store is not a report. */
  if (kind === "closure_report" && !storeName) {
    return NextResponse.json(
      { error: "A closure report needs the store." },
      { status: 400 },
    );
  }

  /* Dates arrive as YYYY-MM-DD from a date input; anything else is
     dropped rather than guessed at. */
  const rawDate = clip(payload.observedOn, 10);
  const observedOn = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : null;

  const org = currentOrg();
  const { rows } = await db().query(
    `insert into client_request
       (org_slug, location_ref, center_name, kind, store_name, observed_on, body)
     values ($1, $2, $3, $4, $5, $6, $7)
     returning id, created_at`,
    [org.slug, locationRef || null, centerName || null, kind, storeName || null, observedOn, body || null],
  );

  return NextResponse.json({
    id: rows[0].id,
    createdAt: rows[0].created_at,
  });
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const location = clip(request.nextUrl.searchParams.get("location"), 64);
  if (!location) {
    return NextResponse.json({ error: "location is required." }, { status: 400 });
  }

  const org = currentOrg();
  const { rows } = await db().query(
    `select id, kind, store_name, observed_on, body, created_at, handled_at
       from client_request
      where org_slug = $1 and location_ref = $2
      order by created_at desc
      limit 12`,
    [org.slug, location],
  );

  return NextResponse.json({ requests: rows });
}

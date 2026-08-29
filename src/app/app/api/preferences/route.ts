/**
 * Org alert-routing preferences: which alerts reach which roles on
 * which channels. Stored policy, not browser state. Owner/admin edit;
 * everyone reads. The in-app channel is enforced by the notifications
 * API today; email and SMS are stored and activate when a delivery
 * channel is connected (docs/EXTERNAL_SETUP_REQUIRED.md).
 */
import { NextRequest, NextResponse } from "next/server";
import { requireMember } from "@/lib/auth";
import { ALERT_META, defaultRouting, ROLES } from "@/lib/team";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const CAN_EDIT = new Set(["owner", "admin"]);

export async function GET(request: NextRequest) {
  const session = await requireMember(request);
  if (!session)
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { rows } = await db().query(
    `select alert_routing from org_settings where org_slug = $1`,
    [session.orgSlug!],
  );
  return NextResponse.json({
    routing: rows[0]?.alert_routing ?? defaultRouting,
    canEdit: CAN_EDIT.has(session.role ?? ""),
  });
}

export async function POST(request: NextRequest) {
  const session = await requireMember(request);
  if (!session)
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!CAN_EDIT.has(session.role ?? ""))
    return NextResponse.json(
      { error: "Alert routing is set by an owner or admin." },
      { status: 403 },
    );

  const payload = (await request.json().catch(() => null)) as {
    routing?: unknown;
  } | null;
  const raw = payload?.routing;
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 32)
    return NextResponse.json({ error: "Unreadable routing." }, { status: 400 });

  /* Validate every row against the taxonomy; refuse anything else. */
  const validKinds = new Set(Object.keys(ALERT_META));
  const validRoles = new Set(Object.keys(ROLES));
  const routing = [];
  for (const row of raw) {
    const r = row as {
      kind?: string;
      email?: unknown;
      sms?: unknown;
      inApp?: unknown;
      roles?: unknown;
    };
    if (!r.kind || !validKinds.has(r.kind))
      return NextResponse.json({ error: "Unknown alert kind." }, { status: 400 });
    const roles = Array.isArray(r.roles)
      ? r.roles.filter((x) => typeof x === "string" && validRoles.has(x))
      : [];
    routing.push({
      kind: r.kind,
      email: r.email === true,
      sms: r.sms === true,
      inApp: r.inApp === true,
      roles,
    });
  }

  await db().query(
    `insert into org_settings (org_slug, alert_routing, updated_at)
     values ($1, $2, now())
     on conflict (org_slug) do update set
       alert_routing = excluded.alert_routing, updated_at = now()`,
    [session.orgSlug!, JSON.stringify(routing)],
  );
  await db().query(
    `insert into audit_log (actor, action, org_slug, subject, detail)
     values ($1, 'alert_routing', $2, null, $3)`,
    [session.email, session.orgSlug!, `${routing.length} rules updated`],
  );
  return NextResponse.json({ ok: true });
}

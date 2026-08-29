/**
 * The notice package lifecycle, as a system of record.
 *
 * Stages: not_started -> assembled -> counsel_review -> approved ->
 * served, with declined as a decision and reopen back to the start.
 * Every transition is checked against the permission that actually
 * governs it (lib/team.ts) using the caller's MEMBERSHIP role — legal
 * can approve and cannot serve; a signatory can serve and cannot
 * approve — and every transition is audited. The browser never gets to
 * assert a stage; it asks for a transition.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireMember, type OrgRole } from "@/lib/auth";
import { can, type Permission, type RoleId } from "@/lib/team";
import { db } from "@/lib/db";

export const runtime = "nodejs";

type Stage =
  | "not_started"
  | "assembled"
  | "counsel_review"
  | "approved"
  | "served"
  | "declined";

/** Membership roles map onto the workflow's role model. */
const TEAM_ROLE: Record<string, RoleId> = {
  owner: "owner",
  admin: "real_estate",
  analyst: "lease_admin",
  counsel: "counsel",
  viewer: "viewer",
  real_estate: "real_estate",
  lease_admin: "lease_admin",
  signatory: "signatory",
};

/** Legal transitions and the permission each one requires. */
const TRANSITIONS: Record<string, { from: Stage[]; needs: Permission }> = {
  assembled: { from: ["not_started"], needs: "assemble_notice" },
  counsel_review: { from: ["assembled"], needs: "assemble_notice" },
  approved: { from: ["counsel_review"], needs: "approve_notice" },
  served: { from: ["approved"], needs: "serve_notice" },
  declined: {
    from: ["not_started", "assembled", "counsel_review", "approved"],
    needs: "assemble_notice",
  },
  not_started: { from: ["served", "declined"], needs: "assemble_notice" },
};

function teamRole(role: OrgRole | null): RoleId {
  return TEAM_ROLE[role ?? "viewer"] ?? "viewer";
}

export async function GET(request: NextRequest) {
  const session = await requireMember(request);
  if (!session)
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { rows } = await db().query(
    `select location_ref, stage, reason, served_on, updated_by, updated_at
       from notice_workflow where org_slug = $1`,
    [session.orgSlug!],
  );
  return NextResponse.json({
    workflows: rows,
    role: teamRole(session.role),
  });
}

export async function POST(request: NextRequest) {
  const session = await requireMember(request);
  if (!session)
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const payload = (await request.json().catch(() => null)) as {
    locationRef?: string;
    to?: string;
    reason?: string;
    servedOn?: string;
  } | null;
  const ref = String(payload?.locationRef ?? "").trim().slice(0, 64);
  const to = String(payload?.to ?? "") as Stage;
  if (!ref || !(to in TRANSITIONS))
    return NextResponse.json({ error: "Unreadable transition." }, { status: 400 });

  const rule = TRANSITIONS[to];
  const role = teamRole(session.role);
  if (!can(role, rule.needs))
    return NextResponse.json(
      {
        error: `Requires the "${rule.needs.replace(/_/g, " ")}" permission. Your role cannot take this step; that separation is deliberate.`,
      },
      { status: 403 },
    );

  const { rows } = await db().query(
    `select stage from notice_workflow where org_slug = $1 and location_ref = $2`,
    [session.orgSlug!, ref],
  );
  const current: Stage = (rows[0]?.stage as Stage) ?? "not_started";
  if (!rule.from.includes(current))
    return NextResponse.json(
      { error: `Cannot move from ${current} to ${to}.` },
      { status: 409 },
    );

  const servedOn =
    to === "served"
      ? /^\d{4}-\d{2}-\d{2}$/.test(String(payload?.servedOn ?? ""))
        ? String(payload?.servedOn)
        : new Date().toISOString().slice(0, 10)
      : null;
  const reason =
    to === "declined"
      ? String(payload?.reason ?? "").trim().slice(0, 1000) || null
      : null;

  await db().query(
    `insert into notice_workflow (org_slug, location_ref, stage, reason, served_on, updated_by, updated_at)
     values ($1, $2, $3, $4, $5, $6, now())
     on conflict (org_slug, location_ref) do update set
       stage = excluded.stage,
       reason = excluded.reason,
       served_on = case when excluded.stage = 'served' then excluded.served_on
                        when excluded.stage = 'not_started' then null
                        else notice_workflow.served_on end,
       updated_by = excluded.updated_by,
       updated_at = now()`,
    [session.orgSlug!, ref, to, reason, servedOn, session.email],
  );

  await db().query(
    `insert into audit_log (actor, action, org_slug, subject, detail)
     values ($1, 'notice_stage', $2, $3, $4)`,
    [session.email, session.orgSlug!, ref, `${current} -> ${to}`],
  );

  return NextResponse.json({ ok: true, stage: to, servedOn });
}

/**
 * ============================================================
 * AUTHENTICATION & TENANCY
 * ============================================================
 *
 * Real users, database-backed sessions, org membership, roles.
 *
 * Design decisions:
 * - Sessions are opaque random tokens in Postgres (auth_session). The
 *   edge proxy checks only that a session cookie EXISTS (no DB at the
 *   edge); every server operation resolves the token here. A bad
 *   token is a 401 at the operation, exactly where it matters.
 * - Passwords are scrypt (node:crypto), stored as salt:hash hex. No
 *   new dependencies.
 * - THE LEGACY DEMO TOKEN IS AN ALIAS, not a bypass: the constant
 *   demo cookie value resolves to the seeded demo user through the
 *   same session shape, so every existing probe, cookie, and pitch
 *   walkthrough keeps working while real auth takes over. Remove the
 *   alias when the demo era ends.
 * - Org scoping ALWAYS comes from the session (active org = the
 *   session's org_id, else the user's first membership). Client input
 *   never selects the org.
 * - Cross-org reads return 404, never 403: no existence leaks.
 */
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { SESSION_COOKIE, SESSION_TOKEN, DEMO_EMAIL } from "@/lib/session";

export type OrgRole = "owner" | "admin" | "analyst" | "counsel" | "viewer";

export type StaffRole = "admin" | "operator" | "observer";

export type AuthSession = {
  userId: string;
  email: string;
  name: string;
  title: string | null;
  platformAdmin: boolean;
  /** Permission level inside the console; null for client-side users.
      Accounts predating the ladder read as admin. */
  staffRole: StaffRole | null;
  /** Active organization, resolved from the session. */
  orgId: string | null;
  orgSlug: string | null;
  orgName: string | null;
  role: OrgRole | null;
  /** True when this request rode the legacy demo cookie. */
  legacy: boolean;
};

/* ------------------------------------------------------------------
   passwords
   ------------------------------------------------------------------ */

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return (
    candidate.length === expected.length &&
    timingSafeEqual(candidate, expected)
  );
}

/* ------------------------------------------------------------------
   sessions
   ------------------------------------------------------------------ */

const SESSION_DAYS = 30;

export async function createSession(
  userId: string,
  orgId: string | null,
): Promise<string> {
  const token = randomBytes(24).toString("hex");
  await db().query(
    `insert into auth_session (token, user_id, org_id, expires_at)
     values ($1, $2, $3, now() + interval '${SESSION_DAYS} days')`,
    [token, userId, orgId],
  );
  return token;
}

export async function destroySession(token: string): Promise<void> {
  if (!token || token === SESSION_TOKEN) return;
  await db().query(`delete from auth_session where token = $1`, [token]);
}

/** The membership-resolved identity behind one session row or alias. */
async function identityFor(
  userRow: {
    id: string;
    email: string;
    name: string;
    title: string | null;
    platform_admin: boolean;
    staff_role?: string | null;
  },
  preferredOrgId: string | null,
  legacy: boolean,
): Promise<AuthSession> {
  const { rows: mem } = await db().query(
    `select m.org_id, m.role, o.slug, o.name
       from membership m join org o on o.id = m.org_id
      where m.user_id = $1
      order by (m.org_id = $2) desc, m.created_at
      limit 1`,
    [userRow.id, preferredOrgId],
  );
  const m = mem[0] ?? null;
  /* Staff view any client's workspace: when the session's acting org
     is not one of their memberships, resolve it directly and act with
     a write-capable role. Client users never reach this branch — their
     org comes only from membership. */
  if (
    userRow.platform_admin &&
    preferredOrgId &&
    m?.org_id !== preferredOrgId
  ) {
    const { rows: acting } = await db().query(
      `select id, slug, name from org where id = $1`,
      [preferredOrgId],
    );
    if (acting[0]) {
      const staffRole = (userRow.staff_role as StaffRole) ?? "admin";
      return {
        userId: userRow.id,
        email: userRow.email,
        name: userRow.name,
        title: userRow.title,
        platformAdmin: userRow.platform_admin,
        staffRole,
        orgId: acting[0].id,
        orgSlug: acting[0].slug,
        orgName: acting[0].name,
        /* observers stay read-only even inside a client workspace */
        role: staffRole === "observer" ? "viewer" : "admin",
        legacy,
      };
    }
  }
  return {
    userId: userRow.id,
    email: userRow.email,
    name: userRow.name,
    title: userRow.title,
    platformAdmin: userRow.platform_admin,
    staffRole: userRow.platform_admin
      ? ((userRow.staff_role as StaffRole) ?? "admin")
      : null,
    orgId: m?.org_id ?? null,
    orgSlug: m?.slug ?? null,
    orgName: m?.name ?? null,
    role: (m?.role as OrgRole) ?? null,
    legacy,
  };
}

/**
 * Resolve the request's session, or null. Accepts:
 *  - a real auth_session token
 *  - the legacy demo constant, resolved to the seeded demo user
 */
export async function requireSession(
  request: NextRequest,
): Promise<AuthSession | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value ?? "";
  if (!token) return null;

  if (token === SESSION_TOKEN) {
    const { rows } = await db().query(
      `select id, email, name, title, platform_admin, staff_role
         from app_user where email = $1 and disabled_at is null`,
      [DEMO_EMAIL],
    );
    if (!rows[0]) return null; // seed not run: the alias resolves to nothing
    return identityFor(rows[0], null, true);
  }

  if (!/^[a-f0-9]{48}$/.test(token)) return null;
  const { rows } = await db().query(
    `select s.org_id as session_org, u.id, u.email, u.name, u.title,
            u.platform_admin, u.staff_role
       from auth_session s join app_user u on u.id = s.user_id
      where s.token = $1 and s.expires_at > now()
        and u.disabled_at is null`,
    [token],
  );
  if (!rows[0]) return null;
  /* touch, fire-and-forget */
  void db()
    .query(`update auth_session set last_seen = now() where token = $1`, [token])
    .catch(() => {});
  return identityFor(rows[0], rows[0].session_org, false);
}

/** Members only, with an org resolved. Viewer counts as a member. */
export async function requireMember(
  request: NextRequest,
): Promise<AuthSession | null> {
  const s = await requireSession(request);
  return s && s.orgSlug ? s : null;
}

/** Mutating client operations: any org role except read-only viewer. */
export function canWrite(s: AuthSession): boolean {
  return s.role !== null && s.role !== "viewer";
}

/** The staff gate for every /admin operation. */
export async function requireStaff(
  request: NextRequest,
): Promise<AuthSession | null> {
  const s = await requireSession(request);
  return s?.platformAdmin ? s : null;
}

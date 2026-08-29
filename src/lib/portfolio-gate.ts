/**
 * The tenancy gate for portfolio pages.
 *
 * The workspace's evaluation pages render the imported portfolio,
 * which belongs to ONE org. Until the per-org data seam lands
 * (repo.ts, gap #2), every page that shows portfolio data calls
 * requirePortfolio(): a session from any other org is sent to
 * /app/setup, which renders that org's own honest state instead of
 * another client's data.
 *
 * Server-only (reads cookies, queries the session store).
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hasPortfolio } from "@/lib/orgs";
import { SESSION_COOKIE, SESSION_TOKEN, DEMO_EMAIL } from "@/lib/session";

/** The signed-in org's slug, from the session cookie. Null if none. */
export async function sessionOrgSlug(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value ?? "";
  if (!token) return null;
  try {
    if (token === SESSION_TOKEN) {
      const { rows } = await db().query(
        `select o.slug from app_user u
           join membership m on m.user_id = u.id
           join org o on o.id = m.org_id
          where u.email = $1
          order by m.created_at limit 1`,
        [DEMO_EMAIL],
      );
      return rows[0]?.slug ?? null;
    }
    if (!/^[a-f0-9]{48}$/.test(token)) return null;
    const { rows } = await db().query(
      `select o.slug from auth_session s
         join membership m on m.user_id = s.user_id
          and (s.org_id is null or m.org_id = s.org_id)
         join org o on o.id = m.org_id
        where s.token = $1 and s.expires_at > now()
        order by m.created_at limit 1`,
      [token],
    );
    return rows[0]?.slug ?? null;
  } catch {
    /* if the session store is unreachable, fail CLOSED for portfolio
       pages: no slug means the gate redirects */
    return null;
  }
}

/** Call at the top of any page that renders the imported portfolio. */
export async function requirePortfolio(): Promise<string> {
  const slug = await sessionOrgSlug();
  if (!slug || !hasPortfolio(slug)) redirect("/app/setup");
  return slug;
}

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
import { portfolioFor } from "@/lib/portfolios";
import type { PortfolioBundle } from "@/lib/portfolio";
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
    /* The acting org wins when the user is a member of it — or is
       platform staff, who may view any client's workspace (the
       view-as switcher). Otherwise, first membership. */
    const { rows } = await db().query(
      `select coalesce(
                (select o.slug from org o
                  where o.id = s.org_id
                    and (u.platform_admin
                         or exists (select 1 from membership m
                                     where m.user_id = u.id and m.org_id = s.org_id))),
                (select o.slug from membership m join org o on o.id = m.org_id
                  where m.user_id = u.id order by m.created_at limit 1)
              ) as slug
         from auth_session s join app_user u on u.id = s.user_id
        where s.token = $1 and s.expires_at > now() and u.disabled_at is null`,
      [token],
    );
    return rows[0]?.slug ?? null;
  } catch {
    /* if the session store is unreachable, fail CLOSED for portfolio
       pages: no slug means the gate redirects */
    return null;
  }
}

/**
 * Call at the top of any page that renders portfolio data. Returns the
 * SESSION org's own evaluated bundle; an org with nothing imported is
 * sent to /app/setup. No page ever falls back to another client's
 * portfolio.
 */
export async function requirePortfolio(): Promise<PortfolioBundle> {
  const slug = await sessionOrgSlug();
  const bundle = portfolioFor(slug);
  if (!bundle) redirect("/app/setup");
  return bundle;
}

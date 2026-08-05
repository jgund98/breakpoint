import { NextRequest, NextResponse } from "next/server";
import { GATE_COOKIE, GATE_TOKEN } from "@/lib/gate";
import { SESSION_COOKIE, SESSION_TOKEN } from "@/lib/session";

/** Routes that additionally require a workspace sign-in. */
const WORKSPACE = ["/app", "/onboarding"];

/**
 * Two gates, in order.
 *
 * 1. Pre-launch lock: every route requires the access cookie set by
 *    /unlock. Remove this file (plus src/app/unlock and src/lib/gate.ts)
 *    to open the site.
 * 2. Workspace sign-in: /app and /onboarding additionally require the
 *    demo session cookie set by /login. See src/lib/session.ts.
 */
export default function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (request.cookies.get(GATE_COOKIE)?.value !== GATE_TOKEN) {
    const url = request.nextUrl.clone();
    url.pathname = "/unlock";
    url.search = "";
    const dest = pathname + search;
    if (dest && dest !== "/") url.searchParams.set("next", dest);
    return NextResponse.redirect(url);
  }

  const needsSession = WORKSPACE.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (
    needsSession &&
    request.cookies.get(SESSION_COOKIE)?.value !== SESSION_TOKEN
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  /*
   * Gate everything except:
   * - the unlock page itself and its submit endpoint
   * - Next's static assets and image optimizer (the unlock page needs
   *   its CSS, JS and fonts)
   * - favicons so the tab icon still renders on the unlock screen
   */
  matcher: [
    "/((?!unlock|_next/static|_next/image|favicon\\.ico|icon|apple-icon).*)",
  ],
};

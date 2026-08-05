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
    /*
     * Gate everything except:
     * - the unlock page and its submit endpoint
     * - Next's static assets and the image optimizer
     * - favicons, so the tab icon renders on the lock screen
     * - any path that ends in a media or font extension
     *
     * That last exclusion is not cosmetic. Next's image optimizer
     * fetches the source file back over HTTP from this same origin. If
     * the gate intercepts that request it answers with the lock screen
     * HTML, the optimizer sees markup instead of a JPEG, and every
     * optimized image on the site returns 400. Static files carry no
     * private information, so excluding them costs nothing.
     */
    "/((?!unlock|_next/static|_next/image|favicon\\.ico|icon|apple-icon|.*\\.(?:jpg|jpeg|png|webp|avif|gif|svg|ico|mp4|webm|woff|woff2|ttf|txt|xml)$).*)",
  ],
};

import { NextRequest, NextResponse } from "next/server";
import { GATE_COOKIE, GATE_TOKEN } from "@/lib/gate";

/**
 * Pre-launch lock: every route requires the access cookie set by
 * /unlock. Remove this file (plus src/app/unlock and src/lib/gate.ts)
 * to open the site.
 */
export default function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (request.cookies.get(GATE_COOKIE)?.value === GATE_TOKEN) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/unlock";
  url.search = "";
  const dest = pathname + search;
  if (dest && dest !== "/") url.searchParams.set("next", dest);
  return NextResponse.redirect(url);
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

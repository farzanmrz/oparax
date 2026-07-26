// Next.js proxy (formerly middleware.ts in older versions). Runs on every request to refresh auth session.
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  const response = await updateSession(request);

  // Remember the last-visited desk so the feed-first landing (app/agents/page.tsx)
  // can redirect straight back into it instead of always landing on the newest
  // desk. Runs after updateSession returns — outside the no-code-between-
  // client-creation-and-getUser() constraint inside updateSession itself.
  const deskMatch = request.nextUrl.pathname.match(/^\/agents\/([0-9a-f-]{36})(\/|$)/);
  if (deskMatch) {
    response.cookies.set("last_desk_id", deskMatch[1], {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public image files (svg, png, jpg, etc.)
     * - monitoring (Sentry's tunnelRoute — see below)
     *
     * `monitoring` is next.config.ts's `tunnelRoute`: the same-origin path browser error
     * reports are POSTed through so ad-blockers can't drop them. It MUST be excluded here.
     * Sentry's own config comment states the rule ("Check that the configured route will not
     * match with your Next.js middleware, otherwise reporting of client-side errors will
     * fail") and the wizard's default matcher violated it — every client-side error report
     * would have been run through updateSession's Supabase auth refresh, which is both wrong
     * (a Sentry envelope is not a user navigation) and the documented way to lose exactly the
     * client errors this whole integration exists to catch.
     *
     * The exclusion below matches `monitoring` as an exact path segment (`monitoring` itself or
     * `monitoring/...`), not a prefix — a bare `monitoring` literal would also skip a real page
     * route like `/monitoring-anything`, silently exempting it from the auth-session refresh
     * every other route gets.
     */
    "/((?!_next/static|_next/image|favicon.ico|monitoring(?:/|$)|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

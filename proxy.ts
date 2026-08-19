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
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

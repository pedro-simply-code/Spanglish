import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic check only: sends visitors without a session cookie to /login
 * before rendering a private page. The real checks (valid session, 2FA,
 * onboarding, roles) run on the server in `src/server/auth/session.ts`.
 */
export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request, { cookiePrefix: "spanglish" });
  if (sessionCookie) return NextResponse.next();

  // Guests open a classroom with a signed `?join=` link and no account.
  const { pathname, searchParams } = request.nextUrl;
  if (/^\/classes\/[^/]+\/room$/.test(pathname) && searchParams.has("join")) {
    return NextResponse.next();
  }

  const login = new URL("/login", request.url);
  const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  if (next !== "/") login.searchParams.set("next", next);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/home/:path*",
    "/teacher/:path*",
    "/manager/:path*",
    "/admin/:path*",
    "/settings/:path*",
    "/onboarding/:path*",
    "/classes/:path*",
    "/schedule/:path*",
    "/materials/:path*",
    "/lessons/:path*",
    "/practice/:path*",
    "/vocabulary/:path*",
    "/progress/:path*",
    "/achievements/:path*",
    "/checkout/:path*",
    "/apps/:path*",
  ],
};

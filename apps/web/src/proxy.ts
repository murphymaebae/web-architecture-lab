// PROXY (called "middleware" before Next.js 16) runs before every matching
// request, at the edge of the site.
//
// Here it gives every visitor an ANONYMOUS ID cookie the first time they
// arrive. Analytics and journey tools need a stable id for people who haven't
// signed in yet; this is the same idea as the cookies set by Google Analytics,
// Adobe Analytics or Segment.

import { NextResponse, type NextRequest } from "next/server";

export const ANON_COOKIE = "lab-anon";

export function proxy(request: NextRequest) {
  if (request.cookies.has(ANON_COOKIE)) return NextResponse.next();

  const id = crypto.randomUUID();
  // Add it to the incoming request, so this very first page render can use it...
  request.cookies.set(ANON_COOKIE, id);
  const response = NextResponse.next({ request: { headers: request.headers } });
  // ...and tell the browser to keep it for next time.
  response.cookies.set(ANON_COOKIE, id, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}

export const config = {
  // Skip static files and Next.js internals: they don't need an id.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

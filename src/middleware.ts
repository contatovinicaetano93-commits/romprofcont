import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

const publicPaths = ["/login", "/api/auth/login", "/api/cron/sync-email"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    publicPaths.some((path) => pathname === path) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    if (pathname === "/login") {
      const session = await getSessionFromRequest(request);
      if (session) {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }
    return NextResponse.next();
  }

  const session = await getSessionFromRequest(request);
  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\..$).*)"],
};

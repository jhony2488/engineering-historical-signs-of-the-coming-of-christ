import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  isPrivateApi,
  isPrivatePage,
  safeRedirectPath,
  SESSION_COOKIE,
} from "@/lib/auth/constants";
import { applySecurityHeaders } from "@/lib/auth/security-headers";
import { verifySessionToken } from "@/lib/auth/session";

const PUBLIC_FILE = /\.(.*)$/;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(sessionToken);

  if (pathname.startsWith("/api")) {
    if (isPrivateApi(pathname) && !session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (pathname === "/login") {
    if (session) {
      const dest = safeRedirectPath(request.nextUrl.searchParams.get("from"));
      return applySecurityHeaders(NextResponse.redirect(new URL(dest, request.url)));
    }
    return applySecurityHeaders(NextResponse.next());
  }

  if (isPrivatePage(pathname) && !session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return applySecurityHeaders(NextResponse.redirect(loginUrl));
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};

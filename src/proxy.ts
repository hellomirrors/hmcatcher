import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { AUTH_MODE, isAdmin } from "@/lib/auth-mode";

const PUBLIC_PATHS = [
  "/",
  "/competition",
  "/comparison",
  "/login",
  "/slotmachine",
];
const STATIC_FILE_RE = /\.[\w]+$/;

function isPublicPath(pathname: string): boolean {
  return (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    STATIC_FILE_RE.test(pathname)
  );
}

function redirectToLogin(request: NextRequest, reason?: string) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("from", request.nextUrl.pathname);
  if (reason) {
    loginUrl.searchParams.set("error", reason);
  }
  return NextResponse.redirect(loginUrl);
}

function cookieProxy(request: NextRequest) {
  if (isPublicPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }
  const cookie = request.cookies.get("admin-auth")?.value;
  if (cookie === "authenticated") {
    return NextResponse.next();
  }
  return redirectToLogin(request);
}

const authentikProxy = auth((request) => {
  if (isPublicPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }
  const session = request.auth;
  if (!session?.user) {
    return redirectToLogin(request);
  }
  if (!isAdmin(session.user.groups)) {
    return redirectToLogin(request, "forbidden");
  }
  return NextResponse.next();
});

export const proxy =
  AUTH_MODE === "authentik"
    ? (authentikProxy as unknown as (req: NextRequest) => Response)
    : cookieProxy;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.svg).*)"],
};

import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { rolePermissions } from "@/lib/permissions";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    if (pathname.startsWith("/api/auth") || pathname === "/login") {
      return NextResponse.next();
    }

    if (!token) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const role = token.role as string;
    const roleConfig = rolePermissions[role];

    if (role === "SUPER_ADMIN") {
      return NextResponse.next();
    }

    if (!roleConfig) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    const allowed = roleConfig.routes.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`)
    );

    if (!allowed) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/students/:path*",
    "/faculty/:path*",
    "/sections/:path*",
    "/enrollment/:path*",
    "/grading/:path*",
    "/attendance/:path*",
    "/documents/:path*",
    "/reports/:path*",
    "/audit-logs/:path*",
    "/inventory/:path*",
  ],
};
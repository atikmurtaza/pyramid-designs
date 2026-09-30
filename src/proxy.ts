import { type NextRequest, NextResponse } from "next/server";

import { refreshStaffAuthSession } from "@/lib/supabase/proxy";
import { productionCapabilityEnabled } from "@/lib/server/production-gates";

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (process.env.NODE_ENV === "production" && (
    path.startsWith("/api/internal/compatibility/") || path === "/api/internal/cron-probe"
    || path.startsWith("/api/internal/staff-auth/") || path === "/internal/staff-auth"
    || (!productionCapabilityEnabled("STAFF") && (path === "/staff" || path.startsWith("/staff/") || path.startsWith("/api/staff/")))
  )) return new NextResponse(null, { status: 404, headers: { "Cache-Control": "private, no-store, max-age=0" } });
  if (request.nextUrl.pathname === "/join") {
    const nonce = btoa(crypto.randomUUID());
    const csp = ["default-src 'self'", `script-src 'self' 'nonce-${nonce}' https://challenges.cloudflare.com`,
      "frame-src https://challenges.cloudflare.com", "connect-src 'self'", "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:", "font-src 'self'", "object-src 'none'", "base-uri 'none'",
      "form-action 'self'", "frame-ancestors 'none'"].join("; ");
    const headers = new Headers(request.headers);
    headers.set("x-intake-nonce", nonce);
    headers.set("Content-Security-Policy", csp);
    const response = NextResponse.next({ request: { headers } });
    response.headers.set("Content-Security-Policy", csp);
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    return response;
  }
  return refreshStaffAuthSession(request);
}

export const config = {
  matcher: ["/join", "/staff/:path*", "/api/staff/:path*", "/api/internal/compatibility/:path*", "/api/internal/cron-probe", "/api/internal/staff-auth/:path*", "/internal/staff-auth/:path*"],
};

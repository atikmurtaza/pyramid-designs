import { type NextRequest, NextResponse } from "next/server";

import { refreshStaffAuthSession } from "@/lib/supabase/proxy";
import { maintenanceBlocksRequest } from "@/lib/server/database-maintenance";

export function proxy(request: NextRequest) {
  if (maintenanceBlocksRequest(request.method, request.nextUrl.pathname)) {
    return NextResponse.json({ ok: false, code: "DATABASE_MAINTENANCE" }, {
      status: 503,
      headers: { "Cache-Control": "private, no-store, max-age=0", "Retry-After": "60" },
    });
  }
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
  if (/^\/(?:staff|api\/internal\/staff-auth|internal\/staff-auth)(?:\/|$)/.test(request.nextUrl.pathname)) {
    return refreshStaffAuthSession(request);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};

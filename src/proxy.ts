import type { NextRequest } from "next/server";

import { refreshStaffAuthSession } from "@/lib/supabase/proxy";

export function proxy(request: NextRequest) {
  return refreshStaffAuthSession(request);
}

export const config = {
  matcher: ["/staff/:path*", "/api/internal/staff-auth/:path*", "/internal/staff-auth/:path*"],
};

import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { publicEnvironment } from "@/lib/env/public";

export async function refreshStaffAuthSession(request: NextRequest) {
  const url = publicEnvironment.supabaseUrl;
  const publishableKey = publicEnvironment.supabasePublishableKey;
  if (!url || !publishableKey) return protectStaffResponse(request, NextResponse.next({ request }));

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  try {
    await supabase.auth.getClaims();
  } catch {
    // The protected server boundary performs the authoritative deny.
  }
  return protectStaffResponse(request, response);
}

function protectStaffResponse(request: NextRequest, response: NextResponse) {
  if (request.nextUrl.pathname === "/staff" || request.nextUrl.pathname.startsWith("/staff/")) {
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Vary", "Cookie");
  }
  return response;
}

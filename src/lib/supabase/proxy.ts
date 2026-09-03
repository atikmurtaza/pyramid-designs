import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { publicEnvironment } from "@/lib/env/public";

export async function refreshStaffAuthSession(request: NextRequest) {
  const url = publicEnvironment.supabaseUrl;
  const publishableKey = publicEnvironment.supabasePublishableKey;
  if (!url || !publishableKey) return NextResponse.next({ request });

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
  return response;
}

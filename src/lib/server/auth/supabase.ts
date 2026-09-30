import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { publicEnvironment } from "../../env/public.ts";
import { productionCapabilityEnabled } from "../production-gates.ts";

function authConfiguration() {
  if (!productionCapabilityEnabled("STAFF")) throw new Error("Staff authentication is unavailable.");
  const url = publicEnvironment.supabaseUrl;
  const publishableKey = publicEnvironment.supabasePublishableKey;
  if (!url || !publishableKey) throw new Error("Staff authentication is unavailable.");
  if (process.env.NODE_ENV === "production" && new URL(url).protocol !== "https:") throw new Error("Staff authentication is unavailable.");
  return { url, publishableKey };
}

export async function createServerSupabaseClient() {
  const { url, publishableKey } = authConfiguration();
  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
    cookieOptions: { secure: process.env.NODE_ENV === "production", sameSite: "lax" },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot write cookies; src/proxy.ts refreshes them.
        }
      },
    },
  });
}

export async function readVerifiedSupabaseClaims() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.getClaims();
    if (error || !data?.claims) return null;

    return {
      subjectId: data.claims.sub,
      assuranceLevel: data.claims.aal === "aal2" ? "aal2" : "aal1",
    } as const;
  } catch {
    return null;
  }
}

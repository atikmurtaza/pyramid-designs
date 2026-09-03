type PublicEnvironment = Readonly<{
  supabaseUrl?: string;
  supabasePublishableKey?: string;
}>;

function optionalHttpUrl(name: string, value: string | undefined) {
  if (!value) return undefined;

  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`${name} must be an HTTP(S) URL.`);
  }

  return url.toString();
}

export const publicEnvironment: PublicEnvironment = Object.freeze({
  supabaseUrl: optionalHttpUrl(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  ),
  supabasePublishableKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || undefined,
});

import "server-only";

export function hasSameOriginMutation(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function hasSameOriginMutationHeaders(headers: Headers) {
  const origin = headers.get("origin");
  const forwardedHost = headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || headers.get("host")?.trim();
  if (!origin || !host) return false;

  try {
    const originUrl = new URL(origin);
    if (originUrl.host !== host) return false;

    const forwardedProtocol = headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    return !forwardedProtocol || originUrl.protocol === `${forwardedProtocol}:`;
  } catch {
    return false;
  }
}

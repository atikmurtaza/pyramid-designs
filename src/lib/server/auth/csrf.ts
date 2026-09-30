import "server-only";

import { PRODUCTION_ORIGIN } from "../production-gates.ts";

export function hasSameOriginMutation(request: Request) {
  if (process.env.NODE_ENV === "production") return hasSameOriginMutationHeaders(request.headers);
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
  const host = headers.get("host");
  if (!origin || !host) return false;

  try {
    const originUrl = new URL(origin);
    if (originUrl.origin !== origin || originUrl.username || originUrl.password) return false;
    if (process.env.NODE_ENV === "production") {
      // Forwarding headers confer no authority. The edge must preserve canonical
      // Host and strip/replace attacker-supplied forwarding before activation.
      return origin === PRODUCTION_ORIGIN && host === new URL(PRODUCTION_ORIGIN).host;
    }
    if (originUrl.host !== host) return false;
    const forwardedHost = headers.get("x-forwarded-host");
    const forwardedProtocol = headers.get("x-forwarded-proto");
    return (!forwardedHost || forwardedHost === host)
      && (!forwardedProtocol || originUrl.protocol === `${forwardedProtocol}:`);
  } catch {
    return false;
  }
}

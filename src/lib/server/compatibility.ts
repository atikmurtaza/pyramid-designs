import "server-only";

import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

export function hasBearerSecret(request: Request, expected: string) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return false;

  const provided = Buffer.from(authorization.slice(7), "utf8");
  const target = Buffer.from(expected, "utf8");
  return provided.length === target.length && timingSafeEqual(provided, target);
}

export function compatibilityJson(body: object, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function unauthorizedCompatibilityResponse() {
  return compatibilityJson({ ok: false, code: "UNAUTHORIZED" }, 401);
}

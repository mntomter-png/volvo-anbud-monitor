import { NextResponse, type NextRequest } from "next/server";

import { verifyCsrfOrigin } from "@/lib/security/csrf";
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
  type RateLimitConfig,
} from "@/lib/security/rate-limit";

export const RATE_LIMITS = {
  api: { maxRequests: 120, windowMs: 60_000 },
  admin: { maxRequests: 30, windowMs: 60_000 },
  sync: { maxRequests: 3, windowMs: 3_600_000 },
} as const;

export function getRateLimitForPath(pathname: string): RateLimitConfig | null {
  if (pathname === "/api/notifications") return null;
  if (pathname === "/api/sync") return RATE_LIMITS.sync;
  if (pathname.startsWith("/api/admin/")) return RATE_LIMITS.admin;
  if (pathname.startsWith("/api/")) return RATE_LIMITS.api;
  return null;
}

/** CSRF- og rate limit-sjekk for API-ruter. Returnerer respons ved avvisning. */
export function enforceApiGuards(request: NextRequest): NextResponse | null {
  if (!request.nextUrl.pathname.startsWith("/api/")) return null;

  if (!verifyCsrfOrigin(request)) {
    return NextResponse.json({ error: "Ugyldig forespørsel" }, { status: 403 });
  }

  const rateLimit = getRateLimitForPath(request.nextUrl.pathname);
  if (rateLimit) {
    const ip = getClientIp(request);
    const key = `${request.nextUrl.pathname}:${ip}`;
    const result = checkRateLimit(key, rateLimit);
    if (!result.allowed) {
      return rateLimitResponse(result.retryAfterSec ?? 60);
    }
  }

  return null;
}

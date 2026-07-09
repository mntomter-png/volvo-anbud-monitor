import { NextResponse } from "next/server";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitConfig = {
  maxRequests: number;
  windowMs: number;
};

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function checkRateLimit(
  key: string,
  config: RateLimitConfig,
): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true };
  }

  if (bucket.count >= config.maxRequests) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count += 1;
  return { allowed: true };
}

export function rateLimitResponse(retryAfterSec: number): NextResponse {
  return NextResponse.json(
    { error: "For mange forespørsler. Prøv igjen senere." },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    },
  );
}

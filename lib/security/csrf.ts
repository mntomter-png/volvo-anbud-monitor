import type { NextRequest } from "next/server";

const MUTATION_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

function getAllowedOrigins(): Set<string> {
  const origins = new Set<string>();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (siteUrl) origins.add(siteUrl);

  const deployUrl = (
    process.env.DEPLOY_PRIME_URL ??
    process.env.URL ??
    process.env.DEPLOY_URL
  )?.replace(/\/$/, "");
  if (deployUrl) origins.add(deployUrl);

  if (process.env.VERCEL_URL) {
    origins.add(`https://${process.env.VERCEL_URL}`);
  }

  origins.add("http://localhost:3000");
  origins.add("http://127.0.0.1:3000");

  return origins;
}

/** Verifiserer at muterende forespørsler kommer fra tillatt origin. */
export function verifyCsrfOrigin(request: NextRequest): boolean {
  const method = request.method.toUpperCase();
  if (!MUTATION_METHODS.has(method)) return true;

  if (request.nextUrl.pathname === "/api/notifications") return true;

  const allowedOrigins = getAllowedOrigins();
  const origin = request.headers.get("origin");

  if (origin) {
    return allowedOrigins.has(origin);
  }

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return allowedOrigins.has(new URL(referer).origin);
    } catch {
      return false;
    }
  }

  return process.env.NODE_ENV !== "production";
}

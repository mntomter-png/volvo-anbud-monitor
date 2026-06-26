import { NextResponse, type NextRequest } from "next/server";

/**
 * Valgfri Basic Auth for å begrense tilgang når appen deles internt.
 * Sett BASIC_AUTH_USER og BASIC_AUTH_PASSWORD i miljøvariabler.
 *
 * Cron-endepunktet /api/notifications er unntatt (bruker CRON_SECRET).
 */
export function middleware(request: NextRequest) {
  const user = process.env.BASIC_AUTH_USER;
  const password = process.env.BASIC_AUTH_PASSWORD;

  if (!user || !password) {
    return NextResponse.next();
  }

  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    try {
      const decoded = atob(auth.slice(6));
      const colon = decoded.indexOf(":");
      const u = decoded.slice(0, colon);
      const p = decoded.slice(colon + 1);
      if (u === user && p === password) {
        return NextResponse.next();
      }
    } catch {
      // ugyldig base64
    }
  }

  return new NextResponse("Innlogging kreves for å se anbud-monitoren.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Volvo Anbud-monitor", charset="UTF-8"',
    },
  });
}

export const config = {
  matcher: [
    /*
     * Beskytt alt unntatt statiske filer og cron-endepunktet.
     * Nettleseren sender Basic Auth videre til /api/tenders og /api/sync.
     */
    "/((?!_next/static|_next/image|favicon.ico|api/notifications).*)",
  ],
};

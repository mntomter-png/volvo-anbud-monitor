import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

/**
 * Supabase Auth – beskytter dashboard, admin og API (unntatt cron).
 * Erstatter valgfri Basic Auth.
 */
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/notifications).*)",
  ],
};

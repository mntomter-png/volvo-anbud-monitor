"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/utils";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Håndterer retur fra Supabase (invitasjon, passordtilbakestilling, magic link).
 * Støtter både PKCE (?code=) og eldre hash-tokens (#access_token=).
 */
export function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const supabase = createClient();
    const next = safeNextPath(searchParams.get("next"));
    const authError = searchParams.get("error_description") ?? searchParams.get("error");

    if (authError) {
      setError(decodeURIComponent(authError.replace(/\+/g, " ")));
      return;
    }

    async function finish() {
      const code = searchParams.get("code");
      if (code) {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setError(exchangeError.message);
          return;
        }
        router.replace(next);
        return;
      }

      const hash = new URLSearchParams(
        window.location.hash.replace(/^#/, ""),
      );
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) {
          setError(sessionError.message);
          return;
        }
        router.replace(next);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        router.replace(next);
        return;
      }

      setError(
        "Lenken er ugyldig eller utløpt. Be om en ny invitasjon eller bruk «Glemt passord».",
      );
    }

    void finish();
  }, [router, searchParams]);

  if (error) {
    return (
      <AuthShell subtitle="Innlogging feilet">
        <Card className="w-full max-w-md border shadow-md">
          <CardHeader>
            <CardTitle>Kunne ikke logge inn</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button asChild>
              <Link href="/auth/forgot-password">Tilbakestill passord</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/login">Tilbake til innlogging</Link>
            </Button>
          </CardContent>
        </Card>
      </AuthShell>
    );
  }

  return (
    <AuthShell subtitle="Verifiserer lenke …">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        Logger inn …
      </div>
    </AuthShell>
  );
}

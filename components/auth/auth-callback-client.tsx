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

const OTP_TYPES = new Set([
  "recovery",
  "invite",
  "signup",
  "magiclink",
  "email",
]);

/**
 * Håndterer retur fra Supabase (invitasjon, passordtilbakestilling, magic link).
 * Støtter:
 *  - token_hash + type (custom e-post via generateLink) → verifyOtp
 *  - PKCE (?code=)
 *  - access/refresh i query eller hash
 *
 * token_hash krever eksplisitt klikk først, så e-postskannere ikke forbruker engangslenken.
 */
export function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = React.useState<string | null>(null);
  const [pendingOtp, setPendingOtp] = React.useState<{
    tokenHash: string;
    type: string;
    next: string;
  } | null>(null);
  const [verifying, setVerifying] = React.useState(false);

  React.useEffect(() => {
    const supabase = createClient();
    const next = safeNextPath(searchParams.get("next"));
    const authError =
      searchParams.get("error_description") ?? searchParams.get("error");

    if (authError) {
      setError(decodeURIComponent(authError.replace(/\+/g, " ")));
      return;
    }

    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type");
    if (tokenHash && type && OTP_TYPES.has(type)) {
      setPendingOtp({ tokenHash, type, next });
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

      const accessTokenQ = searchParams.get("access_token");
      const refreshTokenQ = searchParams.get("refresh_token");
      if (accessTokenQ && refreshTokenQ) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessTokenQ,
          refresh_token: refreshTokenQ,
        });
        if (sessionError) {
          setError(sessionError.message);
          return;
        }
        router.replace(next);
        return;
      }

      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
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

  async function handleConfirmOtp() {
    if (!pendingOtp) return;
    setVerifying(true);
    setError(null);

    const supabase = createClient();
    const { error: otpError } = await supabase.auth.verifyOtp({
      token_hash: pendingOtp.tokenHash,
      type: pendingOtp.type as
        | "recovery"
        | "invite"
        | "signup"
        | "magiclink"
        | "email",
    });

    setVerifying(false);

    if (otpError) {
      setError(
        otpError.message.includes("expired") ||
          otpError.message.includes("invalid")
          ? "Lenken er ugyldig eller utløpt. Be om en ny tilbakestillingslenke."
          : otpError.message,
      );
      setPendingOtp(null);
      return;
    }

    router.replace(pendingOtp.next);
  }

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

  if (pendingOtp) {
    const isRecovery = pendingOtp.type === "recovery";
    return (
      <AuthShell
        subtitle={isRecovery ? "Tilbakestill passord" : "Aktiver konto"}
      >
        <Card className="w-full max-w-md border shadow-md">
          <CardHeader>
            <CardTitle>
              {isRecovery ? "Bekreft tilbakestilling" : "Bekreft innlogging"}
            </CardTitle>
            <CardDescription>
              Klikk knappen under for å fortsette. Dette hindrer at e-postfiltre
              forbruker engangslenken automatisk.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button
              onClick={handleConfirmOtp}
              disabled={verifying}
              className="w-full"
            >
              {verifying ? (
                <Loader2 className="size-4 animate-spin" />
              ) : isRecovery ? (
                "Fortsett til nytt passord"
              ) : (
                "Fortsett"
              )}
            </Button>
            <Button asChild variant="outline">
              <Link href="/login">Avbryt</Link>
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

import { Suspense } from "react";
import { Loader2 } from "lucide-react";

import { AuthCallbackClient } from "@/components/auth/auth-callback-client";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata = {
  title: "Logger inn – Anbud-monitor",
};

function CallbackFallback() {
  return (
    <AuthShell subtitle="Verifiserer lenke …">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        Logger inn …
      </div>
    </AuthShell>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackFallback />}>
      <AuthCallbackClient />
    </Suspense>
  );
}

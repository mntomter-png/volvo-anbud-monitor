import { LoginForm } from "@/components/auth/login-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata = {
  title: "Logg inn – Anbud-monitor Volvo Norge",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthShell subtitle="Logg inn for å se anbud og pipeline">
      <div className="flex w-full flex-col items-center gap-4">
        {params.error === "auth_callback_failed" && (
          <p className="w-full max-w-md rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Innloggingslenken er ugyldig eller utløpt. Prøv igjen.
          </p>
        )}
        <LoginForm nextPath={params.next} />
      </div>
    </AuthShell>
  );
}

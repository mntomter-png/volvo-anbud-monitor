import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata = {
  title: "Glemt passord – Anbud-monitor",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell subtitle="Tilbakestill passord">
      <ForgotPasswordForm />
    </AuthShell>
  );
}

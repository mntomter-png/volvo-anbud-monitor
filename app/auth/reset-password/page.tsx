import { UpdatePasswordForm } from "@/components/auth/update-password-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata = {
  title: "Nytt passord – Anbud-monitor",
};

export default function ResetPasswordPage() {
  return (
    <AuthShell subtitle="Velg nytt passord">
      <UpdatePasswordForm
        title="Velg nytt passord"
        description="Skriv inn et nytt passord for kontoen din."
      />
    </AuthShell>
  );
}

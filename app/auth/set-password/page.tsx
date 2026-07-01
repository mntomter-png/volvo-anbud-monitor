import { UpdatePasswordForm } from "@/components/auth/update-password-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata = {
  title: "Aktiver konto – Anbud-monitor",
};

export default function SetPasswordPage() {
  return (
    <AuthShell subtitle="Aktiver kontoen din">
      <UpdatePasswordForm
        title="Velg passord"
        description="Velg et passord for å fullføre aktiveringen av kontoen din."
      />
    </AuthShell>
  );
}

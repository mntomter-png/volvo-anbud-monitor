import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { UsersAdminPanel } from "@/components/admin/users-admin-panel";
import { getSessionProfile } from "@/lib/auth/session";

export const metadata = {
  title: "Brukere – Anbud-monitor Volvo Norge",
};

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const { user, profile } = await getSessionProfile();
  if (!user) redirect("/login?next=/admin/users");
  if (profile?.role !== "admin") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-muted/30">
      <AppHeader email={profile.email} isAdmin active="users" />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <UsersAdminPanel />
      </main>
    </div>
  );
}

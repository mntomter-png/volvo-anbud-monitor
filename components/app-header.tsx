"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Truck, Users } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AppHeader({
  email,
  isAdmin,
  active,
}: {
  email?: string | null;
  isAdmin?: boolean;
  active?: "dashboard" | "users";
}) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Truck className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              Anbud-monitor · Volvo Norge
            </h1>
            <p className="text-sm text-muted-foreground">
              Offentlige anbud for lastebiler og tungtransport
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            asChild
            variant={active === "dashboard" ? "secondary" : "ghost"}
            size="sm"
          >
            <Link href="/dashboard">Anbud</Link>
          </Button>
          {isAdmin && (
            <Button
              asChild
              variant={active === "users" ? "secondary" : "ghost"}
              size="sm"
            >
              <Link href="/admin/users" className="gap-1.5">
                <Users className="size-4" />
                Brukere
              </Link>
            </Button>
          )}
          {email && (
            <span className={cn("hidden text-sm text-muted-foreground sm:inline")}>
              {email}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-1.5">
            <LogOut className="size-4" />
            Logg ut
          </Button>
        </div>
      </div>
    </header>
  );
}

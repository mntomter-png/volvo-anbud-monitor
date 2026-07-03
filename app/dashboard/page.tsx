import { redirect } from "next/navigation";
import { MapPin, Tag, Bell, Trophy, Truck } from "lucide-react";

import { AppHeader } from "@/components/app-header";
import { REGION_NAMES, TRUCK_KEYWORDS, TRUCK_EXCLUDE_KEYWORDS } from "@/lib/keywords";
import { getSessionProfile } from "@/lib/auth/session";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TendersDataTable } from "@/components/tenders-data-table";

export const metadata = {
  title: "Dashboard – Volvo Trucks Anbud-monitor",
  description:
    "Overvåk offentlige anbud for tunglastebil (Volvo og Renault) i Oslo, Akershus, Buskerud og Innlandet.",
};

// Dashbordet viser ferske data og skal ikke caches statisk.
export const dynamic = "force-dynamic";

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-2">
          <Icon className="size-4" />
          {label}
        </CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      {hint && (
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">{hint}</p>
        </CardContent>
      )}
    </Card>
  );
}

export default async function DashboardPage() {
  const { user, profile } = await getSessionProfile();
  if (!user) redirect("/login?next=/dashboard");

  return (
    <div className="min-h-screen bg-muted/30">
      <AppHeader
        email={profile?.email ?? user.email}
        isAdmin={profile?.role === "admin"}
        active="dashboard"
      />

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Statistikk-kort */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={MapPin}
            label="Regioner overvåket"
            value={String(REGION_NAMES.length)}
            hint={REGION_NAMES.join(", ")}
          />
          <StatCard
            icon={Tag}
            label="Truck-nøkkelord"
            value={String(TRUCK_KEYWORDS.length)}
            hint={`Tunglastebil, Volvo/Renault, service · ${TRUCK_EXCLUDE_KEYWORDS.length} ekskluderinger`}
          />
          <StatCard
            icon={Bell}
            label="Varsling"
            value="Daglig"
            hint="E-post ved nye konkurranser og tildelinger"
          />
          <StatCard
            icon={Trophy}
            label="Kontraktsinnsikt"
            value="Tildelinger"
            hint="Vinner og estimert utløp – filtrer «utløper snart»"
          />
        </div>

        {/* Anbudstabell */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle>Relevante anbud</CardTitle>
                <CardDescription>
                  Tunglastebil der Volvo eller Renault kan levere. Standardfilter: direkte salg.
                </CardDescription>
              </div>
              <Badge variant="secondary" className="gap-1">
                <Truck className="size-3" /> Volvo Trucks · Renault Trucks
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <TendersDataTable regions={REGION_NAMES} />
          </CardContent>
        </Card>
      </main>

      <footer className="border-t bg-background">
        <div className="mx-auto max-w-7xl px-4 py-4 text-center text-xs text-muted-foreground sm:px-6 lg:px-8">
          Volvo Trucks anbud-monitor · Data fra Doffin Public API v2
        </div>
      </footer>
    </div>
  );
}

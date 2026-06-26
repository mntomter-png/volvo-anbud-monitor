import { Truck, MapPin, Tag, Bell } from "lucide-react";

import { REGION_NAMES, VOLVO_KEYWORDS } from "@/lib/keywords";
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
  title: "Dashboard – Anbud-monitor Volvo Norge",
  description:
    "Overvåk offentlige anbud relevante for Volvo lastebiler i Oslo, Akershus, Buskerud og Innlandet.",
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

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-muted/30">
      {/* Topptekst */}
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Truck className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                Anbud-monitor · Volvo Norge
              </h1>
              <p className="text-sm text-muted-foreground">
                Offentlige anbud for lastebiler, tungtransport, service og
                anleggsmaskiner
              </p>
            </div>
          </div>
        </div>
      </header>

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
            label="Volvo-nøkkelord"
            value={String(VOLVO_KEYWORDS.length)}
            hint="Lastebil, tungtransport, service, anleggsmaskin m.fl."
          />
          <StatCard
            icon={Bell}
            label="Varsling"
            value="Daglig"
            hint="E-post via Resend ved nye relevante anbud"
          />
          <StatCard
            icon={Truck}
            label="Datakilde"
            value="Doffin v2"
            hint="Norsk database for offentlige anskaffelser"
          />
        </div>

        {/* Anbudstabell */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle>Relevante anbud</CardTitle>
                <CardDescription>
                  Filtrer på region, søk i fritekst og sorter kolonnene.
                </CardDescription>
              </div>
              <Badge variant="secondary" className="gap-1">
                <Truck className="size-3" /> Kun Volvo-relevante
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
          Anbud-monitor for Volvo Norge · Data fra Doffin Public API v2
        </div>
      </footer>
    </div>
  );
}

import Link from "next/link";
import { Truck } from "lucide-react";

export function AuthShell({
  children,
  subtitle,
}: {
  children: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Truck className="size-5" />
          </div>
          <div>
            <Link href="/" className="text-xl font-bold tracking-tight hover:opacity-90">
              Anbud-monitor · Volvo Trucks
            </Link>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto flex min-h-[calc(100vh-88px)] max-w-7xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}

"use client";

import * as React from "react";
import {
  Check,
  Copy,
  KeyRound,
  Loader2,
  MailPlus,
  Trash2,
  UserPlus,
} from "lucide-react";

import { USER_ROLE_LABELS, type UserRole } from "@/lib/auth/roles";
import type { ProfileRow } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface UsersResponse {
  data: ProfileRow[];
}

export function UsersAdminPanel() {
  const [users, setUsers] = React.useState<ProfileRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [banner, setBanner] = React.useState<string | null>(null);

  const [email, setEmail] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [role, setRole] = React.useState<UserRole>("user");
  const [inviting, setInviting] = React.useState(false);
  const [resettingUserId, setResettingUserId] = React.useState<string | null>(null);
  const [resetLink, setResetLink] = React.useState<{
    email: string;
    url: string;
  } | null>(null);
  const [copied, setCopied] = React.useState(false);

  const fetchUsers = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users");
      const json = (await res.json()) as UsersResponse & { error?: string };
      if (!res.ok) throw new Error(json.error ?? `Feil ${res.status}`);
      setUsers(json.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke hente brukere");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setBanner(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          full_name: fullName.trim() || undefined,
          role,
        }),
      });
      const json = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) throw new Error(json.error ?? `Feil ${res.status}`);
      setBanner(json.message ?? "Invitasjon sendt.");
      setEmail("");
      setFullName("");
      setRole("user");
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke invitere bruker");
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(userId: string, nextRole: UserRole) {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: nextRole }),
    });
    if (!res.ok) {
      const json = (await res.json()) as { error?: string };
      setError(json.error ?? "Kunne ikke oppdatere rolle");
      return;
    }
    await fetchUsers();
  }

  async function handleDelete(userId: string, userEmail: string) {
    if (!window.confirm(`Slette brukeren ${userEmail}?`)) return;
    const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    if (!res.ok) {
      const json = (await res.json()) as { error?: string };
      setError(json.error ?? "Kunne ikke slette bruker");
      return;
    }
    setBanner(`Brukeren ${userEmail} er slettet.`);
    await fetchUsers();
  }

  async function handleResetPassword(userId: string, userEmail: string) {
    if (
      !window.confirm(
        `Send tilbakestillingslenke til ${userEmail}? Brukeren får e-post for å velge nytt passord.`,
      )
    ) {
      return;
    }

    setResettingUserId(userId);
    setError(null);
    setBanner(null);
    setResetLink(null);
    setCopied(false);

    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: "POST",
      });
      const json = (await res.json()) as {
        error?: string;
        message?: string;
        actionLink?: string;
      };
      if (!res.ok) throw new Error(json.error ?? `Feil ${res.status}`);
      setBanner(json.message ?? "Tilbakestillingslenke sendt.");
      if (json.actionLink) {
        setResetLink({ email: userEmail, url: json.actionLink });
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Kunne ikke sende tilbakestillingslenke",
      );
    } finally {
      setResettingUserId(null);
    }
  }

  async function handleCopyLink() {
    if (!resetLink) return;
    try {
      await navigator.clipboard.writeText(resetLink.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Kunne ikke kopiere lenken. Marker og kopier manuelt.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="size-5" />
            Inviter kollega
          </CardTitle>
          <CardDescription>
            Kollegaen får e-post med lenke for å bekrefte kontoen og velge passord.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleInvite}
            className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 lg:items-end"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-email">E-post</Label>
              <Input
                id="invite-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kollega@volvo.no"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-name">Navn (valgfritt)</Label>
              <Input
                id="invite-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ola Nordmann"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Rolle</Label>
              <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Bruker</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={inviting} className="gap-1.5">
              {inviting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <MailPlus className="size-4" />
              )}
              Send invitasjon
            </Button>
          </form>
        </CardContent>
      </Card>

      {banner && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {banner}
        </p>
      )}
      {resetLink && (
        <div className="flex flex-col gap-2 rounded-md border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-sm font-medium text-blue-900">
            Tilbakestillingslenke for {resetLink.email}
          </p>
          <p className="text-xs text-blue-800">
            Send denne lenken til brukeren via Teams eller SMS hvis e-posten ikke
            kommer frem. Lenken er personlig og utløper etter en stund.
          </p>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={resetLink.url}
              onFocus={(e) => e.currentTarget.select()}
              className="bg-white font-mono text-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="shrink-0 gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="size-4" /> Kopiert
                </>
              ) : (
                <>
                  <Copy className="size-4" /> Kopier
                </>
              )}
            </Button>
          </div>
        </div>
      )}
      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Brukere</CardTitle>
          <CardDescription>
            Alle som har tilgang til anbud-monitoren.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Navn</TableHead>
                  <TableHead>E-post</TableHead>
                  <TableHead>Rolle</TableHead>
                  <TableHead>Opprettet</TableHead>
                  <TableHead className="text-right">Handlinger</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <span className="inline-flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" /> Laster brukere …
                      </span>
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      Ingen brukere ennå.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.full_name ?? "—"}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                          {USER_ROLE_LABELS[user.role]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString("nb-NO")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Select
                            value={user.role}
                            onValueChange={(v) =>
                              handleRoleChange(user.id, v as UserRole)
                            }
                          >
                            <SelectTrigger size="sm" className="w-[130px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">Bruker</SelectItem>
                              <SelectItem value="admin">Administrator</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleResetPassword(user.id, user.email)}
                            disabled={resettingUserId === user.id}
                            aria-label={`Tilbakestill passord for ${user.email}`}
                            title="Send tilbakestillingslenke"
                          >
                            {resettingUserId === user.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <KeyRound className="size-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(user.id, user.email)}
                            aria-label={`Slett ${user.email}`}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

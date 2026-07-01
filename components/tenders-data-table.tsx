"use client";

import * as React from "react";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ExternalLink,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  Truck,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { formatCurrency, formatDate, daysUntil, monthsUntil } from "@/lib/format";
import {
  NOTICE_KINDS,
  NOTICE_KIND_LABELS,
} from "@/lib/notice-kind";
import {
  PIPELINE_STATUSES,
  PIPELINE_STATUS_LABELS,
  TENDER_TYPES,
  TENDER_TYPE_LABELS,
} from "@/lib/pipeline";
import type { TenderRow } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RegionMultiSelect } from "@/components/region-multi-select";
import { FilterMultiSelect } from "@/components/filter-multi-select";
import {
  AssigneeSelect,
  ElectricBadge,
  NoticeKindBadge,
  PipelineStatusSelect,
  TenderTypeBadge,
} from "@/components/tender-pipeline-cells";

interface TendersResponse {
  data: TenderRow[];
  count: number;
}

interface NotificationResult {
  ok: boolean;
  fetched?: number;
  relevant?: number;
  new?: number;
  awardsNew?: number;
  awardsFetched?: number;
  emailSent?: boolean;
  error?: string;
  details?: string;
}

/** Klikkbar kolonneoverskrift for sortering. */
function SortHeader({
  label,
  sorted,
  onClick,
  className,
}: {
  label: string;
  sorted: false | "asc" | "desc";
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 font-medium hover:text-foreground",
        className,
      )}
    >
      {label}
      {sorted === "asc" ? (
        <ArrowUp className="size-3.5" />
      ) : sorted === "desc" ? (
        <ArrowDown className="size-3.5" />
      ) : (
        <ArrowUpDown className="size-3.5 opacity-50" />
      )}
    </button>
  );
}

function DeadlineCell({ value }: { value: string | null }) {
  const days = daysUntil(value);
  return (
    <div className="flex flex-col gap-1">
      <span className="font-medium">{formatDate(value)}</span>
      {days !== null && (
        <Badge
          variant={
            days < 0 ? "destructive" : days <= 3 ? "destructive" : days <= 7 ? "default" : "secondary"
          }
          className="w-fit text-[10px]"
        >
          {days < 0 ? "Utløpt" : days === 0 ? "I dag" : days === 1 ? "1 dag" : `${days} dager`}
        </Badge>
      )}
    </div>
  );
}

function ContractEndCell({ value }: { value: string | null }) {
  const months = monthsUntil(value);
  return (
    <div className="flex flex-col gap-1">
      <span className="font-medium">{formatDate(value)}</span>
      {months !== null && months >= 0 && (
        <Badge
          variant={months <= 3 ? "destructive" : months <= 6 ? "default" : "secondary"}
          className="w-fit text-[10px]"
        >
          {months === 0 ? "Denne måneden" : months === 1 ? "1 mnd" : `${months} mnd`}
        </Badge>
      )}
    </div>
  );
}

export function TendersDataTable({ regions }: { regions: string[] }) {
  const [rows, setRows] = React.useState<TenderRow[]>([]);
  const [count, setCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [selectedRegions, setSelectedRegions] = React.useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = React.useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = React.useState<string[]>([]);
  const [selectedKinds, setSelectedKinds] = React.useState<string[]>([]);
  const [electricOnly, setElectricOnly] = React.useState(false);
  const [expiringSoon, setExpiringSoon] = React.useState(false);
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");

  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "deadline", desc: false },
  ]);

  const [refreshing, setRefreshing] = React.useState(false);
  const [banner, setBanner] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Debounce fritekstsøk.
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const updateRow = React.useCallback((updated: TenderRow) => {
    setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  }, []);

  const fetchTenders = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedRegions.length > 0)
        params.set("region", selectedRegions.join(","));
      if (selectedTypes.length > 0)
        params.set("tender_type", selectedTypes.join(","));
      if (selectedStatuses.length > 0)
        params.set("pipeline_status", selectedStatuses.join(","));
      if (selectedKinds.length > 0)
        params.set("notice_kind", selectedKinds.join(","));
      if (electricOnly) params.set("is_electric", "true");
      if (expiringSoon) params.set("expiring_soon", "true");
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      params.set("limit", "500");

      const res = await fetch(`/api/tenders?${params.toString()}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Feil ${res.status}`);
      }
      const json = (await res.json()) as TendersResponse;
      setRows(json.data);
      setCount(json.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukjent feil");
      setRows([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [selectedRegions, selectedTypes, selectedStatuses, selectedKinds, electricOnly, expiringSoon, debouncedSearch, from, to]);

  React.useEffect(() => {
    void fetchTenders();
  }, [fetchTenders]);

  // Trigger den daglige jobben manuelt.
  async function handleFetchNew() {
    setRefreshing(true);
    setBanner(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const json = (await res.json()) as NotificationResult;
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? json.details ?? `Feil ${res.status}`);
      }
      setBanner({
        type: "success",
        message: `Hentet ${json.fetched ?? 0} kunngjøringer · ${
          json.new ?? 0
        } nye lagret${
          json.awardsNew ? ` (${json.awardsNew} tildelinger)` : ""
        }${json.emailSent ? " · e-post sendt" : ""}.`,
      });
      await fetchTenders();
    } catch (err) {
      setBanner({
        type: "error",
        message: err instanceof Error ? err.message : "Kunne ikke hente anbud",
      });
    } finally {
      setRefreshing(false);
    }
  }

  function resetFilters() {
    setSearch("");
    setSelectedRegions([]);
    setSelectedTypes([]);
    setSelectedStatuses([]);
    setSelectedKinds([]);
    setElectricOnly(false);
    setExpiringSoon(false);
    setFrom("");
    setTo("");
  }

  const typeOptions = React.useMemo(
    () =>
      TENDER_TYPES.map((t) => ({
        value: t,
        label: TENDER_TYPE_LABELS[t],
      })),
    [],
  );

  const kindOptions = React.useMemo(
    () =>
      NOTICE_KINDS.map((k) => ({
        value: k,
        label: NOTICE_KIND_LABELS[k],
      })),
    [],
  );

  const statusOptions = React.useMemo(
    () =>
      PIPELINE_STATUSES.map((s) => ({
        value: s,
        label: PIPELINE_STATUS_LABELS[s],
      })),
    [],
  );

  const columns = React.useMemo<ColumnDef<TenderRow>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Tittel",
        cell: ({ row }) => (
          <a
            href={row.original.url ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex max-w-[420px] items-start gap-1.5 font-medium text-primary"
          >
            <span className="line-clamp-2 group-hover:underline">
              {row.original.title ?? "Uten tittel"}
            </span>
            <ExternalLink className="mt-0.5 size-3.5 shrink-0 opacity-60" />
          </a>
        ),
      },
      {
        accessorKey: "notice_kind",
        header: "Kategori",
        cell: ({ row }) => (
          <NoticeKindBadge kind={row.original.notice_kind ?? "competition"} />
        ),
      },
      {
        accessorKey: "tender_type",
        header: "Type",
        cell: ({ row }) => (
          <TenderTypeBadge type={row.original.tender_type ?? "unknown"} />
        ),
      },
      {
        accessorKey: "is_electric",
        header: "El",
        cell: ({ row }) => (
          <ElectricBadge isElectric={row.original.is_electric ?? false} />
        ),
      },
      {
        accessorKey: "winner_name",
        header: "Vinner",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.winner_name ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "pipeline_status",
        header: "Status",
        cell: ({ row }) => (
          <PipelineStatusSelect tender={row.original} onUpdated={updateRow} />
        ),
        enableSorting: false,
      },
      {
        accessorKey: "assignee",
        header: "Ansvarlig",
        cell: ({ row }) => (
          <AssigneeSelect tender={row.original} onUpdated={updateRow} />
        ),
        enableSorting: false,
      },
      {
        accessorKey: "deadline",
        header: "Frist",
        cell: ({ row }) =>
          row.original.notice_kind === "award" ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <DeadlineCell value={row.original.deadline} />
          ),
      },
      {
        accessorKey: "contract_end_date",
        header: "Kontrakt utløper",
        cell: ({ row }) =>
          row.original.notice_kind === "award" ? (
            <ContractEndCell value={row.original.contract_end_date} />
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "buyer",
        header: "Oppdragsgiver",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.buyer ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "region",
        header: "Region",
        cell: ({ row }) =>
          row.original.region ? (
            <Badge variant="outline">{row.original.region}</Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "published_at",
        header: "Publisert",
        cell: ({ row }) => formatDate(row.original.published_at),
      },
      {
        accessorKey: "estimated_value",
        header: () => <div className="text-right">Estimert verdi</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums">
            {formatCurrency(row.original.estimated_value)}
          </div>
        ),
      },
    ],
    [updateRow],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Filterrad */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="search" className="text-xs text-muted-foreground">
              Søk
            </Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Tittel eller oppdragsgiver…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 sm:w-[260px]"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Type</Label>
            <FilterMultiSelect
              label="Alle typer"
              options={typeOptions}
              selected={selectedTypes}
              onChange={setSelectedTypes}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Kategori</Label>
            <FilterMultiSelect
              label="Alle kategorier"
              options={kindOptions}
              selected={selectedKinds}
              onChange={setSelectedKinds}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <FilterMultiSelect
              label="Alle statuser"
              options={statusOptions}
              selected={selectedStatuses}
              onChange={setSelectedStatuses}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Region</Label>
            <RegionMultiSelect
              options={regions}
              selected={selectedRegions}
              onChange={setSelectedRegions}
            />
          </div>

          <div className="flex items-end gap-4 pb-0.5">
            <div className="flex items-center gap-2">
              <Checkbox
                id="electric-only"
                checked={electricOnly}
                onCheckedChange={(checked) => setElectricOnly(checked === true)}
              />
              <Label
                htmlFor="electric-only"
                className="cursor-pointer text-sm text-muted-foreground"
              >
                Kun el/nullutslipp
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="expiring-soon"
                checked={expiringSoon}
                onCheckedChange={(checked) => setExpiringSoon(checked === true)}
              />
              <Label
                htmlFor="expiring-soon"
                className="cursor-pointer text-sm text-muted-foreground"
              >
                Kontrakter utløper snart
              </Label>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="from" className="text-xs text-muted-foreground">
              Publisert fra
            </Label>
            <Input
              id="from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full sm:w-[150px]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="to" className="text-xs text-muted-foreground">
              Publisert til
            </Label>
            <Input
              id="to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full sm:w-[150px]"
            />
          </div>

          <Button
            variant="ghost"
            onClick={resetFilters}
            className="text-muted-foreground"
          >
            <RotateCcw className="size-4" />
            Nullstill
          </Button>
        </div>

        <Button onClick={handleFetchNew} disabled={refreshing}>
          {refreshing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          Hent nye anbud nå
        </Button>
      </div>

      {/* Statusbanner */}
      {banner && (
        <div
          className={cn(
            "rounded-md border px-4 py-2.5 text-sm",
            banner.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
              : "border-destructive/30 bg-destructive/10 text-destructive",
          )}
        >
          {banner.message}
        </div>
      )}

      {/* Tabell */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="bg-muted/40 hover:bg-muted/40">
                {hg.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : canSort ? (
                        <SortHeader
                          label={
                            typeof header.column.columnDef.header === "string"
                              ? header.column.columnDef.header
                              : header.column.id
                          }
                          sorted={header.column.getIsSorted()}
                          onClick={() =>
                            header.column.toggleSorting(
                              header.column.getIsSorted() === "asc",
                            )
                          }
                          className={
                            header.column.id === "estimated_value"
                              ? "w-full justify-end"
                              : undefined
                          }
                        />
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center">
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" /> Laster anbud…
                  </span>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-destructive"
                >
                  {error}
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Truck className="size-8 opacity-40" />
                    <p className="font-medium">Ingen anbud funnet</p>
                    <p className="text-sm">
                      Juster filtrene eller trykk «Hent nye anbud nå».
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="whitespace-normal">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-sm text-muted-foreground">
        Viser {table.getRowModel().rows.length} av {count} anbud
      </p>
    </div>
  );
}

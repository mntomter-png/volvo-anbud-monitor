"use client";

import * as React from "react";
import { Bolt, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ASSIGNEE_OPTIONS,
  PIPELINE_STATUSES,
  PIPELINE_STATUS_LABELS,
  TENDER_TYPE_LABELS,
  type PipelineStatus,
  type TenderType,
} from "@/lib/pipeline";
import type { TenderRow } from "@/lib/types";

const TENDER_TYPE_VARIANTS: Record<
  TenderType,
  "default" | "secondary" | "outline" | "destructive"
> = {
  direct_purchase: "default",
  transport_service: "secondary",
  service_parts: "outline",
  unknown: "outline",
};

export function TenderTypeBadge({ type }: { type: TenderType }) {
  return (
    <Badge variant={TENDER_TYPE_VARIANTS[type]} className="whitespace-nowrap">
      {TENDER_TYPE_LABELS[type]}
    </Badge>
  );
}

export function ElectricBadge({ isElectric }: { isElectric: boolean }) {
  if (!isElectric) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <Badge
      variant="outline"
      className="gap-1 border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
    >
      <Bolt className="size-3" />
      El
    </Badge>
  );
}

const STATUS_COLORS: Record<PipelineStatus, string> = {
  new: "",
  reviewing: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200",
  pursuing: "border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200",
  bid_submitted: "border-violet-300 bg-violet-50 text-violet-900 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-200",
  won: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  lost: "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-200",
  not_relevant: "text-muted-foreground",
};

async function patchTender(
  id: string,
  body: Record<string, string | null>,
): Promise<TenderRow> {
  const res = await fetch(`/api/tenders/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { data?: TenderRow; error?: string };
  if (!res.ok || !json.data) {
    throw new Error(json.error ?? `Feil ${res.status}`);
  }
  return json.data;
}

export function PipelineStatusSelect({
  tender,
  onUpdated,
}: {
  tender: TenderRow;
  onUpdated: (row: TenderRow) => void;
}) {
  const [saving, setSaving] = React.useState(false);

  async function handleChange(value: string) {
    setSaving(true);
    try {
      const updated = await patchTender(tender.id, {
        pipeline_status: value,
      });
      onUpdated(updated);
    } catch {
      // behold eksisterende verdi ved feil
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-1">
      <Select
        value={tender.pipeline_status}
        onValueChange={handleChange}
        disabled={saving}
      >
        <SelectTrigger
          size="sm"
          className={cn("w-[140px]", STATUS_COLORS[tender.pipeline_status])}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PIPELINE_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {PIPELINE_STATUS_LABELS[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {saving && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
    </div>
  );
}

export function AssigneeSelect({
  tender,
  onUpdated,
}: {
  tender: TenderRow;
  onUpdated: (row: TenderRow) => void;
}) {
  const [saving, setSaving] = React.useState(false);
  const value = tender.assignee ?? "Ikke tildelt";

  async function handleChange(next: string) {
    setSaving(true);
    try {
      const updated = await patchTender(tender.id, { assignee: next });
      onUpdated(updated);
    } catch {
      // behold eksisterende verdi ved feil
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-1">
      <Select value={value} onValueChange={handleChange} disabled={saving}>
        <SelectTrigger size="sm" className="w-[150px]">
          <SelectValue placeholder="Ansvarlig" />
        </SelectTrigger>
        <SelectContent>
          {ASSIGNEE_OPTIONS.map((name) => (
            <SelectItem key={name} value={name}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {saving && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
    </div>
  );
}

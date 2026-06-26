"use client";

import { Check, ChevronsUpDown, MapPin } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface RegionMultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

/** Multi-select for regioner med popover og avkrysning. */
export function RegionMultiSelect({
  options,
  selected,
  onChange,
}: RegionMultiSelectProps) {
  function toggle(region: string) {
    if (selected.includes(region)) {
      onChange(selected.filter((r) => r !== region));
    } else {
      onChange([...selected, region]);
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between sm:w-[220px]"
        >
          <span className="flex items-center gap-2 truncate">
            <MapPin className="size-4 text-muted-foreground" />
            {selected.length === 0
              ? "Alle regioner"
              : `${selected.length} valgt`}
          </span>
          <ChevronsUpDown className="size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-2" align="start">
        <div className="flex flex-col gap-1">
          {options.map((region) => {
            const isSelected = selected.includes(region);
            return (
              <button
                key={region}
                type="button"
                onClick={() => toggle(region)}
                className={cn(
                  "flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent",
                  isSelected && "bg-accent/60",
                )}
              >
                <span>{region}</span>
                {isSelected && <Check className="size-4 text-primary" />}
              </button>
            );
          })}
        </div>
        {selected.length > 0 && (
          <>
            <div className="my-2 h-px bg-border" />
            <div className="flex flex-wrap gap-1">
              {selected.map((r) => (
                <Badge key={r} variant="secondary" className="text-xs">
                  {r}
                </Badge>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 w-full"
              onClick={() => onChange([])}
            >
              Nullstill
            </Button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

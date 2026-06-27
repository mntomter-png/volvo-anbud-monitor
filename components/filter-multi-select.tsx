"use client";

import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface FilterMultiSelectProps {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  className?: string;
}

/** Generisk multi-select for dashboardfiltre. */
export function FilterMultiSelect({
  label,
  options,
  selected,
  onChange,
  className,
}: FilterMultiSelectProps) {
  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("w-full justify-between sm:w-[200px]", className)}
        >
          <span className="truncate">
            {selected.length === 0
              ? label
              : `${selected.length} valgt`}
          </span>
          <ChevronsUpDown className="size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-2" align="start">
        <div className="flex flex-col gap-1">
          {options.map((opt) => {
            const isSelected = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggle(opt.value)}
                className={cn(
                  "flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent",
                  isSelected && "bg-accent/60",
                )}
              >
                <span>{opt.label}</span>
                {isSelected && <Check className="size-4 text-primary" />}
              </button>
            );
          })}
        </div>
        {selected.length > 0 && (
          <>
            <div className="my-2 h-px bg-border" />
            <div className="flex flex-wrap gap-1">
              {selected.map((value) => {
                const opt = options.find((o) => o.value === value);
                return (
                  <Badge key={value} variant="secondary" className="text-xs">
                    {opt?.label ?? value}
                  </Badge>
                );
              })}
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

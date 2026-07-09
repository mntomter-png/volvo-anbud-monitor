import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Slår sammen Tailwind-klasser og fjerner konflikter. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Aksepterer kun relative stier på samme origin (hindrer open redirect). */
export function safeNextPath(next: string | null | undefined): string {
  if (!next) return "/dashboard";

  try {
    const trimmed = decodeURIComponent(next.trim());
    if (
      !trimmed.startsWith("/") ||
      trimmed.startsWith("//") ||
      trimmed.includes("://") ||
      trimmed.includes("\\")
    ) {
      return "/dashboard";
    }
    return trimmed;
  } catch {
    return "/dashboard";
  }
}

/** Tillater kun https-URLer i lenker (hindrer javascript: osv.). */
export function isSafeExternalUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

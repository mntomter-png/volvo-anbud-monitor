import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Slår sammen Tailwind-klasser og fjerner konflikter. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

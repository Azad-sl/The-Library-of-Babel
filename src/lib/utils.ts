import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate a URL-safe anchor ID from heading text.
 * Handles Chinese characters (kept as-is) and ASCII (lowercased, non-word → -).
 */
export function headingId(text: string): string {
  return text
    .trim()
    .replace(/[`*_~]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^\w\u4e00-\u9fa5-]/g, "")
    .toLowerCase()
    .slice(0, 60) || "heading"
}


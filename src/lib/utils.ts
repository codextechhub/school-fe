import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import { formatMonthYear, type DisplayPrefs } from "./dates"
import { activeDisplayPrefs } from "./school-display"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(name: string): string {
  if (!name) return "";

  const words = name.trim().split(/\s+/);
  const initials = words
    .slice(0, 2) // Limit to first 2 words
    .map((word) => word[0].toUpperCase())
    .join("");

  return initials;
}

/**
 * "Sep 2026", from a calendar date or a timestamp.
 *
 * A calendar date is read as written rather than through `new Date()`, which
 * takes "2026-09-01" as UTC midnight and names August for any reader west of
 * Greenwich. A timestamp is placed in the school's zone first.
 */
export function formatMonthYearShort(
  dateString: string,
  prefs: DisplayPrefs = activeDisplayPrefs(),
): string {
  return formatMonthYear(dateString, prefs);
}

export const getVariantColor = (val?:string) => {
  switch (val) {
    case 'amber':
      return "#854F0B";
      case 'green':
      return "#0F6E56";
      case 'blue':
      return "#185FA5";
      case 'teal':
      return "#0F6E56";
      case 'red':
      return "#A32D2D";
    default:
      return "#4A659D";
  }
}
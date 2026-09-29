import type {
  DayOfWeek,
  Period,
  PeriodType,
} from "@/redux/services/calendar/calendar-types";

// The period form's shape. Split from the drawer for the same reason as the
// other two: a screen builds a draft without importing a form.

export interface PeriodDraft {
  label: string;
  start_time: string;
  end_time: string;
  period_type: PeriodType;
  /** Null means every teaching day, which is the common case. */
  day_of_week: DayOfWeek | null;
  /** Null is school-wide. -1 means "one branch" with none named yet. */
  branch: number | null;
  is_active: boolean;
}

export function blankPeriod(branch: number | "all"): PeriodDraft {
  return {
    label: "",
    start_time: "",
    end_time: "",
    period_type: "LESSON",
    day_of_week: null,
    branch: typeof branch === "number" ? branch : null,
    is_active: true,
  };
}

export function periodDraftFrom(period: Period): PeriodDraft {
  return {
    label: period.label,
    // The API sends HH:MM:SS; the form keeps HH:MM.
    start_time: (period.start_time ?? "").slice(0, 5),
    end_time: (period.end_time ?? "").slice(0, 5),
    period_type: period.period_type,
    day_of_week: period.day_of_week,
    branch: period.branch ?? null,
    is_active: period.is_active,
  };
}

/**
 * The end time a new period starts with: `start` plus the school's default
 * period length, as "HH:MM".
 *
 * Empty when there is nothing to add (no default length, or a half-typed
 * start), and when the sum would run past midnight: a period that ends before
 * it starts is a refusal, not a suggestion.
 */
export function endFromStart(start: string, minutes: number | null): string {
  if (!minutes || !/^\d{2}:\d{2}/.test(start)) return "";
  const [h, m] = start.split(":").map(Number);
  const total = h * 60 + m + minutes;
  if (total >= 24 * 60) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

/**
 * The draft after its start time changes.
 *
 * On a new period, while the person has not typed an end of their own, the end
 * follows the start by the default length. Otherwise only the start moves.
 */
export function withStartTime(
  draft: PeriodDraft,
  start: string,
  { minutes, endChosen, editing }: {
    minutes: number | null;
    endChosen: boolean;
    editing: boolean;
  },
): PeriodDraft {
  if (editing || endChosen) return { ...draft, start_time: start };
  const end = endFromStart(start, minutes);
  return { ...draft, start_time: start, end_time: end || draft.end_time };
}

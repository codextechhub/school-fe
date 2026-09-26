import type { ReactNode } from "react";
import { CalendarClock, History } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { todayIso, useAsAt } from "@/lib/as-at";

function longDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

/**
 * The "As at" date control on a profile.
 *
 * Offers every day from the record's first recorded day (`historyStarts`) to
 * today and greys out the rest, because the API has no answer for a day before
 * the history starts. Choosing today returns the page to the live record. A
 * record with no history yet (`historyStarts` null) offers nothing.
 */
export function AsAtControl({
  historyStarts,
  value,
  onChange,
}: {
  historyStarts: string | null | undefined;
  value: string | undefined;
  onChange: (day?: string) => void;
}) {
  const today = todayIso();
  return (
    <div className="grid justify-items-start gap-1" data-guide="as-at-control">
      <label className="flex min-w-0 items-center gap-2 text-[13px] text-gray-05">
        <History className="size-4 shrink-0 text-gray-05" aria-hidden="true" />
        <span className="shrink-0 font-medium text-gray-01">As at</span>
        <DatePickerInput
          className="h-9 w-44"
          aria-label="Show this record as at a date"
          value={value ?? today}
          min={historyStarts ?? today}
          max={today}
          disabled={!historyStarts}
          onChange={(event) => onChange(event.target.value === today ? undefined : event.target.value)}
        />
      </label>
      <span className="text-[11px] text-gray-05">
        {historyStarts
          ? `History from ${longDate(historyStarts)}`
          : "No history recorded yet"}
      </span>
    </div>
  );
}

/**
 * The strip across a profile read as at an earlier day.
 *
 * Says which day the page answers for and that nothing on it can be changed,
 * and offers the way back to the live record.
 */
export function AsAtBanner({
  asAt,
  onReturn,
}: {
  asAt: string;
  onReturn: () => void;
}) {
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900"
    >
      <CalendarClock className="size-4 shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1">
        <span className="font-semibold">Showing this record as at {longDate(asAt)}.</span>{" "}
        Everything below is as it stood at the end of that day, and nothing can be changed
        while you are looking at the past.
      </p>
      <Button size="sm" variant="outline" onClick={onReturn}>
        Back to today
      </Button>
    </div>
  );
}

/** Renders its children only on the live record, never on a past view. */
export function LiveOnly({ children }: { children: ReactNode }) {
  return useAsAt() ? null : <>{children}</>;
}

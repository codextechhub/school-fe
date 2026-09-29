import type { ReactNode } from "react";
import { CalendarClock, History } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { useSchoolDisplay } from "@/hooks/use-school-display";
import { useAsAt } from "@/lib/as-at";

/**
 * The "As at" date control on a profile.
 *
 * Offers every day from the record's first recorded day (`historyStarts`) to
 * today and greys out the rest, because the API has no answer for a day before
 * the history starts. Choosing today returns the page to the live record. A
 * record with no history yet (`historyStarts` null) offers nothing.
 *
 * A compact card, sized for the narrow column a profile header keeps for its
 * completeness card, and placed directly above it so the two read as one
 * panel beside the person rather than a control floating in the action row.
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
  const { formatDay, today: todayIn } = useSchoolDisplay();
  const today = todayIn();
  return (
    <div
      className="grid w-fit max-w-full gap-1 justify-self-start rounded-xl border border-border bg-white-05 px-3 py-2.5"
      data-guide="as-at-control"
    >
      <label className="flex min-w-0 items-center gap-2 text-xs text-gray-05">
        <History className="size-3.5 shrink-0 text-gray-05" aria-hidden="true" />
        <span className="shrink-0 font-medium text-gray-01">As at</span>
        <DatePickerInput
          className="h-8 w-auto gap-2 px-2.5 text-xs"
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
          ? `History from ${formatDay(historyStarts, { month: "long" })}`
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
  const { formatDay } = useSchoolDisplay();
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900"
    >
      <CalendarClock className="size-4 shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1">
        <span className="font-semibold">Showing this record as at {formatDay(asAt, { month: "long" })}.</span>{" "}
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

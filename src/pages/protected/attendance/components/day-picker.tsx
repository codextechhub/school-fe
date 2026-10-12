import { Button } from "@/components/ui/button";
import { DatePickerInput } from "@/components/ui/date-picker-input";

/**
 * The day an attendance screen is showing, and a way to open another.
 *
 * Offers today and any day before it. A past day is how a teacher reaches a
 * register to ask for a correction, and how an administrator reads what
 * happened last week; a future day has no register to show. "Today" appears
 * only while another day is open, as the way back.
 */
export function DayPicker({
  date,
  today,
  onChange,
}: {
  date: string;
  today: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2" data-guide="attendance-day">
      <label className="min-w-0 text-sm text-gray-06">
        <span className="sr-only">Show the registers for</span>
        <DatePickerInput
          className="h-9 w-auto min-w-40"
          aria-label="Show the registers for a day"
          value={date}
          max={today}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
      {date !== today && (
        <Button variant="outline" size="sm" className="h-9" onClick={() => onChange(today)}>
          Today
        </Button>
      )}
    </div>
  );
}

import * as React from "react";
import { CalendarDays, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { parseDate, toIsoDate } from "./date-picker-input.utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
/**
 * The nearest selectable day to `date`, or null when nothing is allowed.
 *
 * Ported inline rather than imported: in console-fe this lives in
 * `utils/posting-window` beside the fiscal-calendar rules that need it, and
 * school-fe has no fiscal calendar. The picker keeps the SAME API - a school
 * screen simply never passes `allowedRanges`, and this stays dormant.
 */
function nearestOpenDate(
  date: string,
  ranges: { from: string; to: string }[],
): string | null {
  if (ranges.length === 0) return null;
  if (ranges.some((r) => date >= r.from && date <= r.to)) return date;

  const days = (a: string, b: string) =>
    Math.abs(
      (new Date(b).getTime() - new Date(a).getTime()) / 86_400_000,
    );
  const before = ranges.filter((r) => r.to < date).map((r) => r.to);
  const after = ranges.filter((r) => r.from > date).map((r) => r.from);
  const previous = before.length ? before[before.length - 1] : null;
  const upcoming = after.length ? after[0] : null;

  if (previous && upcoming) {
    return days(previous, date) <= days(date, upcoming) ? previous : upcoming;
  }
  return previous ?? upcoming;
}

type DatePickerInputProps = Omit<React.ComponentProps<"input">, "type"> & {
  /**
   * Spans of selectable days; everything outside them is disabled.
   *
   * Needed because `min`/`max` describe one continuous span and the fiscal
   * calendar is not one: with January and March open but February closed, bounds
   * of Jan 1 – Mar 31 would happily offer a February date the backend rejects.
   * A list of ranges is the only shape that can express the gap.
   *
   * Empty or omitted leaves the calendar unconstrained.
   */
  allowedRanges?: { from: string; to: string }[];
  /** Short name for the allowed window, e.g. "Jan 2026" - shown in the popover. */
  windowLabel?: string | null;
};

function displayDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function DatePickerInput({
  className,
  value,
  defaultValue,
  onChange,
  onBlur,
  disabled,
  readOnly,
  required,
  min,
  max,
  name,
  id,
  placeholder,
  allowedRanges,
  windowLabel,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
  ...props
}: DatePickerInputProps) {
  const controlled = value !== undefined;
  const [internalValue, setInternalValue] = React.useState(
    typeof defaultValue === "string" ? defaultValue : "",
  );
  const [open, setOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const currentValue = typeof value === "string" ? value : internalValue;
  const selected = parseDate(currentValue);
  const fromDate = parseDate(min);
  const toDate = parseDate(max);

  const ranges = allowedRanges ?? [];
  const constrained = ranges.length > 0;
  // Outer bounds of the allowed window, used to stop the month dropdowns
  // wandering into years where nothing is selectable anyway.
  const rangeStart = constrained
    ? parseDate(ranges.reduce((a, r) => (r.from < a ? r.from : a), ranges[0].from))
    : undefined;
  const rangeEnd = constrained
    ? parseDate(ranges.reduce((a, r) => (r.to > a ? r.to : a), ranges[0].to))
    : undefined;

  const disabledDates = [
    ...(fromDate ? [{ before: fromDate }] : []),
    ...(toDate ? [{ after: toDate }] : []),
    // A function matcher, not more bounds: it is what lets a closed month sit
    // between two open ones and still be individually unselectable.
    ...(constrained
      ? [(date: Date) => {
        const iso = toIsoDate(date);
        return !ranges.some((r) => iso >= r.from && iso <= r.to);
      }]
      : []),
  ];

  // The month the popover opens on: the selected date, else the first allowed
  // day, else today. Opening on a month where every day is greyed out reads as
  // a broken calendar.
  const openingMonth = selected ?? rangeStart ?? fromDate ?? new Date();

  // "Today" is only useful when today is selectable. When it is not, offer the
  // nearest allowed day instead - that is the date the user actually wants, and
  // otherwise they must page through months hunting for one that is not grey.
  const todayIso = toIsoDate(new Date());
  const todayAllowed =
    !(fromDate && new Date(new Date().setHours(0, 0, 0, 0)) < fromDate)
    && !(toDate && new Date(new Date().setHours(0, 0, 0, 0)) > toDate)
    && (!constrained || ranges.some((r) => todayIso >= r.from && todayIso <= r.to));
  const jumpTarget = todayAllowed ? todayIso : (nearestOpenDate(todayIso, ranges) ?? todayIso);

  const commit = (nextValue: string) => {
    if (!controlled) setInternalValue(nextValue);
    if (inputRef.current) {
      inputRef.current.value = nextValue;
      onChange?.({
        target: inputRef.current,
        currentTarget: inputRef.current,
      } as React.ChangeEvent<HTMLInputElement>);
    }
  };

  return (
    <Popover open={open} onOpenChange={(nextOpen) => {
      setOpen(nextOpen);
      if (!nextOpen && inputRef.current) {
        onBlur?.({
          target: inputRef.current,
          currentTarget: inputRef.current,
        } as React.FocusEvent<HTMLInputElement>);
      }
    }}>
      <input
        {...props}
        ref={inputRef}
        type="hidden"
        name={name}
        value={currentValue}
        required={required}
        disabled={disabled}
        readOnly={readOnly}
      />
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled || readOnly}
          aria-label={ariaLabel}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
          aria-required={required}
          className={cn(
            "h-10.5 w-full min-w-0 justify-between rounded-md border-input bg-white px-3 py-1 text-left text-sm font-normal text-gray-01 shadow-none hover:bg-white hover:text-gray-01 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50",
            !selected && "text-gray-02",
            className,
          )}
        >
          <span className="truncate">{selected ? displayDate(selected) : (placeholder ?? "Select date")}</span>
          <CalendarDays className="size-4 shrink-0 text-gray-05" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto overflow-hidden rounded-xl p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={openingMonth}
          startMonth={rangeStart ?? fromDate ?? new Date(1900, 0)}
          endMonth={rangeEnd ?? toDate ?? new Date(new Date().getFullYear() + 20, 11)}
          captionLayout="dropdown"
          disabled={disabledDates}
          onSelect={(date) => {
            if (!date) return;
            commit(toIsoDate(date));
            setOpen(false);
          }}
          footer={
            <div className="mt-3 space-y-2 border-t px-1 pt-3">
              {constrained && windowLabel && (
                <p className="font-mont text-[11px] text-gray-05">
                  Open period: <span className="font-medium text-black-01">{windowLabel}</span>
                </p>
              )}
              <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  commit(jumpTarget);
                  setOpen(false);
                }}
                disabled={!todayAllowed && !constrained}
              >
                {todayAllowed ? "Today" : "Nearest open day"}
              </Button>
              {!required && currentValue && (
                <Button type="button" variant="ghost" size="sm" onClick={() => commit("")}>
                  <X className="size-3.5" aria-hidden="true" />
                  Clear
                </Button>
              )}
              </div>
            </div>
          }
        />
      </PopoverContent>
    </Popover>
  );
}

export { DatePickerInput };

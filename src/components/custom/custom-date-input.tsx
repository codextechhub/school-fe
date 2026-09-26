import { cn } from "@/lib/utils";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { toIsoDate } from "@/components/ui/date-picker-input.utils";

interface CustomDateInputProps {
  label: string;
  id: string;
  error?: string;
  isRequired?: boolean;
  containerClass?: string;
  value?: string;
  onValueChange?: (date: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  /**
   * Earliest date the calendar will accept, inclusive.
   *
   * Unset by default, so the full calendar is offered. It exists for the fields
   * where a past date is not a choice a user can mean - asking to go live last
   * Tuesday, for one - and the check belongs on the picker rather than in each
   * screen's validation, which only ever catches it after the fact.
   */
  minDate?: Date;
}

/**
 * A labelled date field with its error line.
 *
 * The calendar itself is `DatePickerInput`, the one date picker in the app, so
 * a date looks and behaves the same here as on every other form. This adds only
 * the label, the required asterisk and the error text, for callers that work
 * with the value as a plain `yyyy-mm-dd` string rather than a change event.
 * An optional field gets the picker's Clear button, which is how a date that
 * was set can be taken off again.
 */
export const CustomDateInput = ({
  label,
  id,
  error,
  isRequired,
  containerClass,
  value,
  onValueChange,
  className,
  placeholder,
  disabled,
  minDate,
}: CustomDateInputProps) => {
  const errorId = `${id}-error`;

  return (
    <div className={cn("grid w-full items-center gap-1", containerClass)}>
      <label
        htmlFor={id}
        className={cn(
          "text-sm text-black-01",
          isRequired && "after:text-error after:content-['*'] after:pl-1.5",
        )}
      >
        {label}
      </label>
      <DatePickerInput
        id={id}
        value={value ?? ""}
        onChange={(e) => onValueChange?.(e.target.value)}
        min={minDate ? toIsoDate(minDate) : undefined}
        required={isRequired}
        disabled={disabled}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn("aria-invalid:border-destructive", className)}
      />
      {error && (
        <p id={errorId} className="text-xs font-medium text-error-text">
          {error}
        </p>
      )}
    </div>
  );
};
CustomDateInput.displayName = "CustomDateInput";

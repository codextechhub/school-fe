import * as React from "react";

import { cn } from "@/lib/utils";
import { useSchoolDisplay } from "@/hooks/use-school-display";
import {
  fitsRules,
  meridiemOf,
  readTime,
  stepTime,
  timeText,
  type Meridiem,
  type TimeRules,
} from "./time-input.utils";

export interface TimeInputProps {
  /** `HH:MM` on a 24-hour clock, or "" for no time. */
  value: string;
  /** Called with `HH:MM` (24-hour) or "", never with anything else. */
  onChange: (value: string) => void;
  /** Called when focus leaves the whole box, toggle included. */
  onBlur?: (event: React.FocusEvent<HTMLElement>) => void;
  /**
   * Called when the text in the box starts or stops being unreadable (not a
   * time, or outside `min`/`max`/`step`). The value is "" meanwhile, so a form
   * with an optional time uses this to refuse rather than save it empty.
   */
  onInvalidChange?: (invalid: boolean) => void;
  /** `HH:MM`, inclusive. */
  min?: string;
  /** `HH:MM`, inclusive. */
  max?: string;
  /** Minutes. Times off the grid are refused, and the arrow keys move by it. */
  step?: number;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  /** Submits the stored value with a native form. */
  name?: string;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  /** Marks the box wrong for a reason of the form's own. */
  "aria-invalid"?: boolean | "true" | "false";
  /** The text field, so a form can move the cursor to it. */
  ref?: React.Ref<HTMLInputElement>;
}

/** Arrow keys move by this many minutes when the box names no step. */
const DEFAULT_ARROW_MINUTES = 5;
/** The time an arrow key starts from in an empty box with no `min`. */
const ARROW_START = "08:00";

/**
 * A time of day, written on the school's clock.
 *
 * The browser's own time box writes times the way the reader's device does, so
 * a 24-hour school on a 12-hour laptop is asked for "8:00 AM" and a 12-hour
 * school on a 24-hour phone for "20:00". This box follows the school's clock
 * setting instead, and the value in and out is always `HH:MM` on a 24-hour
 * clock, which is what the API keeps.
 *
 * - **24-hour school:** one field, "08:30".
 * - **12-hour school:** the field reads "8:30" with an am/pm toggle beside it.
 *   A phone's number pad has no letters, so the toggle is how a phone user
 *   picks the half of the day; on a keyboard "830p" works as well.
 *
 * Which half of the day a typed 12-hour time falls in, first match wins:
 * 1. an am/pm typed with it ("6:30a", "12am");
 * 2. once the toggle has been tapped, the half it shows: this box never
 *    guesses again;
 * 3. a guess by school hours: 7 to 11 am, 12 to 6 pm (see `guessMeridiem`).
 * The toggle always shows the half in use, so a wrong guess is one tap to
 * correct. A time the box did not read from typing (the stored value, an
 * arrow key, a tidied entry) keeps its own half until the person types again.
 *
 * Typing is read loosely and tidied on leaving the field: "8", "830", "0830",
 * "8:5" and "8:30 pm" are all understood (see `readTime`). The value follows
 * the typing as soon as the text reads as a time, so a form reacting to it
 * (an end time following a start) keeps up. Text that is not a time, or falls
 * outside `min`/`max`/`step`, emits "" and marks the box once it is left;
 * nothing unreadable is ever passed on.
 *
 * Up and down arrows move by `step` (or 5 minutes), Shift by an hour.
 */
function TimeInput({
  value,
  onChange,
  onBlur,
  onInvalidChange,
  min,
  max,
  step,
  disabled,
  required,
  id,
  name,
  placeholder = "hh:mm",
  className,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ref,
}: TimeInputProps) {
  const { clock } = useSchoolDisplay().prefs;
  const rules: TimeRules = { min, max, step };
  const stored = value ?? "";

  const [text, setText] = React.useState(() => timeText(stored, clock));
  // The half the toggle shows, and the one used to read the text while
  // `guessing` is off.
  const [meridiem, setMeridiem] = React.useState<Meridiem>(
    () => meridiemOf(stored) ?? "am",
  );
  // On while the text is the person's own typing, read by the guess.
  const [guessing, setGuessing] = React.useState(false);
  // Set once the toggle is tapped; typing then reads by it, not the guess.
  const [picked, setPicked] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const [shown, setShown] = React.useState({ value: stored, clock });

  /** The half to read the text by: null leaves it to the guess. */
  const readingHalf = guessing && !picked ? null : meridiem;

  /** The stored value some text stands for, or "" when it stands for none. */
  const accept = (candidate: string, half: Meridiem | null = readingHalf) => {
    const read = readTime(candidate, clock, half);
    return read && fitsRules(read.value, rules) ? read.value : "";
  };

  // A new value from outside, or a new clock, rewrites the text, unless the
  // text already stands for that value (the person is mid-typing it).
  if (stored !== shown.value || clock !== shown.clock) {
    setShown({ value: stored, clock });
    if (clock !== shown.clock || accept(text) !== (minutesText(stored) ?? "")) {
      setText(timeText(stored, clock));
      setMeridiem(meridiemOf(stored) ?? meridiem);
      setGuessing(false);
    }
  }

  const read = readTime(text, clock, readingHalf);
  const unreadable = text.trim() !== "" && accept(text) === "";
  const markInvalid =
    (unreadable && !focused) || ariaInvalid === true || ariaInvalid === "true";
  const half = read?.meridiem ?? meridiem;

  const reportInvalid = React.useEffectEvent((invalid: boolean) => {
    onInvalidChange?.(invalid);
  });
  React.useEffect(() => {
    reportInvalid(unreadable);
  }, [unreadable]);

  const emit = (next: string) => {
    if (next !== (minutesText(stored) ?? "")) onChange(next);
  };

  const type = (next: string) => {
    setText(next);
    setGuessing(true);
    emit(accept(next, picked ? meridiem : null));
  };

  /** Rewrites readable text in the school's own form: "830p" becomes 8:30 pm. */
  const tidy = () => {
    const next = accept(text);
    if (!next) return;
    setText(timeText(next, clock));
    setMeridiem(meridiemOf(next) ?? meridiem);
    setGuessing(false);
  };

  const pickHalf = (next: Meridiem) => {
    setMeridiem(next);
    setPicked(true);
    setGuessing(false);
    emit(accept(text, next));
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    const current = accept(text);
    const next = current
      ? stepTime(current, event.key === "ArrowUp" ? 1 : -1,
        event.shiftKey ? 60 : (step ?? DEFAULT_ARROW_MINUTES), rules)
      : (min && fitsRules(min, rules) ? min : ARROW_START);
    setText(timeText(next, clock));
    setMeridiem(meridiemOf(next) ?? meridiem);
    setGuessing(false);
    emit(next);
  };

  return (
    <div
      data-slot="time-input"
      data-invalid={markInvalid || undefined}
      data-disabled={disabled || undefined}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          onBlur?.(event);
        }
      }}
      className={cn(
        "flex h-10.5 w-full min-w-0 items-center rounded-md border border-border bg-white text-sm text-gray-01 transition-[color,box-shadow] focus-within:border-primary/60 dark:bg-input/30",
        "data-[invalid]:border-destructive data-[invalid]:ring-destructive/20 dark:data-[invalid]:ring-destructive/40",
        "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
        className,
      )}
    >
      {name && <input type="hidden" name={name} value={stored} />}
      <input
        ref={ref}
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        spellCheck={false}
        value={text}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        aria-invalid={markInvalid || undefined}
        aria-required={required || undefined}
        onChange={(event) => type(event.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          tidy();
        }}
        className="h-full w-full min-w-0 flex-1 bg-transparent px-3 py-1 tabular-nums outline-none placeholder:text-gray-02 selection:bg-primary selection:text-primary-foreground disabled:cursor-not-allowed"
      />
      {clock === "H12" && (
        <div
          role="group"
          aria-label={ariaLabel ? `${ariaLabel}, am or pm` : "am or pm"}
          className="mr-1 flex shrink-0 rounded-[5px] bg-gray-04 p-0.5"
        >
          {(["am", "pm"] as const).map((option) => (
            <button
              key={option}
              type="button"
              disabled={disabled}
              aria-pressed={half === option}
              onClick={() => pickHalf(option)}
              className={cn(
                "h-7 min-w-9 rounded px-2 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed",
                half === option
                  ? "bg-white text-primary shadow-xs"
                  : "text-gray-05 hover:text-gray-01",
              )}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * `TimeInput` behind the native input's props, for `<Input type="time">`.
 *
 * `Input` routes a time field here so a screen written against the native
 * control (the shared finance screens among them) still gets the school's
 * clock. `onChange` receives an event whose target is a hidden input holding
 * the `HH:MM` value, and `step` is in seconds, as on the native control.
 */
function NativeTimeInput({
  value,
  defaultValue,
  onChange,
  onBlur,
  min,
  max,
  step,
  disabled,
  required,
  id,
  name,
  placeholder,
  className,
  ref,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: Omit<React.ComponentProps<"input">, "type">) {
  const target = React.useRef<HTMLInputElement>(null);
  const controlled = value !== undefined;
  const [own, setOwn] = React.useState(typeof defaultValue === "string" ? defaultValue : "");
  const current = controlled ? String(value ?? "") : own;
  const seconds = Number(step);

  const change = (next: string) => {
    if (!controlled) setOwn(next);
    if (!target.current) return;
    target.current.value = next;
    onChange?.({
      target: target.current,
      currentTarget: target.current,
    } as React.ChangeEvent<HTMLInputElement>);
  };

  return (
    <>
      <input ref={target} type="hidden" name={name} value={current} />
      <TimeInput
        ref={ref}
        id={id}
        value={current}
        onChange={change}
        onBlur={onBlur as TimeInputProps["onBlur"]}
        min={typeof min === "string" ? min : undefined}
        max={typeof max === "string" ? max : undefined}
        step={seconds >= 60 ? Math.round(seconds / 60) : undefined}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        className={className}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid === true || ariaInvalid === "true"}
      />
    </>
  );
}

/** A stored value reduced to `HH:MM`, so "08:30:00" and "08:30" compare equal. */
function minutesText(value: string): string | null {
  const text = timeText(value, "H24");
  return text || (value === "" ? "" : null);
}

export { NativeTimeInput, TimeInput };

import * as React from "react";

import { cn } from "@/lib/utils";
import { DatePickerInput } from "@/components/ui/date-picker-input";

/**
 * The app's text input.
 *
 * `type="date"` renders the house calendar (`DatePickerInput`) rather than the
 * browser's own date box, which looks and behaves differently in every browser
 * and shows dates in the reader's operating-system format. The shared finance
 * screens rely on this: they write `<Input type="date">` and expect the house
 * calendar, as console-fe's `Input` gives them.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  if (type === "date") {
    return <DatePickerInput className={className} {...props} />;
  }

  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-gray-01 placeholder:text-gray-02 bg-white border border-border focus-visible:border-primary/60 selection:bg-primary selection:text-primary-foreground dark:bg-input/30 h-10.5 w-full min-w-0 rounded-md px-3 py-1 text-sm transition-[color,box-shadow] outline-none file:inline-flex file:items-center file:h-10.5 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm text-gray-01",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Input };

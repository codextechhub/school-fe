import { cn } from "@/lib/utils";

/**
 * A short list of choices shown all at once, one of which is picked.
 *
 * Used where the design lays the options out as buttons rather than hiding
 * them in a menu: a reason code, a proposed mark. Every choice stays visible,
 * which on a phone is one tap instead of two. A radio group to assistive
 * technology.
 */
export function ChoiceChips<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (next: T) => void;
  ariaLabel: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-9 rounded-md border px-3 text-sm font-medium transition-colors",
              on
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-white text-gray-06 hover:bg-white-05",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

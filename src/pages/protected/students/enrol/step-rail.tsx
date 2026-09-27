import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export interface RailStep {
  key: string;
  label: string;
  /** How many required fields this step is still short of. */
  missing: number;
  visited: boolean;
}

/**
 * The five steps, joined by a line, with a light travelling towards the next.
 *
 * **The line is the point.** Five numbered circles sitting apart read as five
 * separate buttons; joined, they read as one journey with a position on it. And
 * the segment leaving the current step carries a moving light, which is the only
 * animation on the form and points at where the reader goes next - a thing a
 * static row of numbers cannot say.
 *
 * A step already passed shows a tick rather than its number, because its number
 * is no longer information: what matters is whether it is done, and whether it
 * is short of anything.
 *
 * Unvisited steps stay disabled so the rail cannot be used to skip the
 * guardians and arrive at Review with nobody linked - but they stay READABLE,
 * because seeing what the form will ask for is half of what a stepper is for.
 */
export function StepRail({
  steps,
  current,
  onGo,
}: {
  steps: RailStep[];
  current: string;
  onGo: (key: string) => void;
}) {
  const index = steps.findIndex((s) => s.key === current);

  return (
    <ol data-guide="student-enrol.steps" className="hidden items-start sm:flex">
      {steps.map((step, i) => {
        const isCurrent = i === index;
        const isPast = i < index;
        const short = step.visited && !isCurrent && step.missing > 0;

        return (
          <li
            key={step.key}
            className={cn("flex min-w-0 items-center", i > 0 && "flex-1")}
          >
            {/* The connector sits BEFORE each step but the first, so the line
                between two circles belongs to one element rather than being two
                half-lines that never quite meet. */}
            {i > 0 && (
              <span
                aria-hidden
                className={cn(
                  "h-0.5 min-w-6 flex-1 rounded-full",
                  i <= index ? "bg-primary" : "bg-white-02",
                  // The segment the reader is about to travel.
                  i === index + 1 && "step-connector-live",
                )}
              />
            )}

            <button
              type="button"
              disabled={!step.visited}
              onClick={() => onGo(step.key)}
              aria-current={isCurrent ? "step" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3",
                step.visited && !isCurrent && "hover:bg-gray-03",
                !step.visited && "cursor-not-allowed",
              )}
            >
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold transition-colors",
                  isCurrent && "bg-primary text-white ring-4 ring-primary/15",
                  isPast && !short && "bg-primary text-white",
                  isPast && short && "bg-amber-500 text-white",
                  !isCurrent && !isPast && step.visited && "bg-white-03 text-primary",
                  !step.visited && "bg-gray-04 text-gray-05",
                )}
              >
                {isPast && !short ? <Check className="size-3.5" /> : i + 1}
              </span>

              <span className="min-w-0 text-left">
                <span
                  className={cn(
                    "block whitespace-nowrap text-[13px] leading-tight",
                    isCurrent && "font-semibold text-black-01",
                    !isCurrent && step.visited && "text-gray-06",
                    !step.visited && "text-gray-05/70",
                  )}
                >
                  {step.label}
                </span>
                {short && (
                  <span className="block text-[11px] leading-tight text-amber-700">
                    {step.missing} missing
                  </span>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

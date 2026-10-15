import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * A compact switch for views and mutually exclusive filters.
 *
 * The highlight SLIDES to what you pressed rather than blinking out of one
 * option and into another. That is not decoration: the block behind the label
 * is what says "you are here", and a thing that teleports has to be re-found
 * every time, while a thing that travels carries the eye with it. Pressing
 * Table and watching the marker move from Cards is the screen answering.
 *
 * One component, because there were five copies of this toggle across the
 * academics screens and a sixth was about to be written. A shared marker is
 * also the only way the movement can be consistent - five hand-rolled ones
 * would drift in duration and easing until each screen felt slightly different.
 */

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ElementType;
  /** A short total shown after the label. */
  count?: React.ReactNode;
}

export function SegmentedToggle<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
}: {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (next: T) => void;
  /** Names the group, since the buttons only name themselves. */
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "relative inline-flex shrink-0 rounded-full border border-white-02 bg-white p-0.5",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            className={cn(
              "relative inline-flex items-center gap-1.5 rounded-full px-3 py-1",
              "text-xs whitespace-nowrap transition-colors",
              active ? "text-primary" : "text-gray-06 hover:text-black-01",
            )}
          >
            {/* One element per GROUP, moved by layoutId, rather than one per
                option fading in and out. Framer matches the two positions and
                animates between them, which is what makes it travel instead of
                cross-fade. */}
            {active && (
              <motion.span
                layoutId={`segmented-${ariaLabel}`}
                className="absolute inset-0 rounded-full bg-pry-01"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            {option.icon && (
              <option.icon className="relative z-10 size-3.5" />
            )}
            <span className="relative z-10">{option.label}</span>
            {option.count !== undefined && (
              <span className="relative z-10 text-[11px] font-semibold tabular-nums">
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

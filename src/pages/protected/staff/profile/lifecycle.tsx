import { cn } from "@/lib/utils";
import type { StaffLifecycle } from "@/redux/services/staff/staff-types";

/**
 * Where somebody sits on the ordinary path, or that they are off it.
 *
 * **The path comes from the server and is not written here.** Invited then
 * Active is the whole of it; the other four statuses are not later stages and
 * must not be drawn as though they were. A strip showing Terminated as step
 * three would say a school expects everybody to get there, and one showing a
 * resigned teacher at step two would say she is still here.
 *
 * So an off-path person gets the server's own sentence instead of a stepper,
 * and this component decides nothing about which is which.
 */
export function Lifecycle({ lifecycle }: { lifecycle: StaffLifecycle }) {
  if (!lifecycle.on_path) {
    return (
      <p className="mt-3 rounded-lg bg-gray-04 px-3 py-2 text-xs text-gray-05">
        {lifecycle.note ??
          "This status sits outside the ordinary Invited to Active path."}
      </p>
    );
  }

  const index = lifecycle.steps.findIndex(
    (step) => step.value === lifecycle.current,
  );

  return (
    <ol className="mt-4 flex min-w-0 max-w-md items-center gap-1.5">
      {lifecycle.steps.map((step, i) => {
        const done = i < index;
        const current = i === index;
        return (
          <li
            key={step.value}
            className="flex min-w-0 flex-1 items-center gap-1.5"
          >
            <span
              className={cn(
                "grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-semibold",
                done && "bg-green-700 text-white",
                current && "bg-primary text-white",
                !done && !current && "bg-gray-04 text-gray-05",
              )}
            >
              {i + 1}
            </span>
            <span
              className={cn(
                "truncate text-xs",
                current ? "font-semibold text-black-01" : "text-gray-05",
              )}
            >
              {step.label}
            </span>
            {i < lifecycle.steps.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  "h-px min-w-4 flex-1",
                  done ? "bg-green-700" : "bg-white-02",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

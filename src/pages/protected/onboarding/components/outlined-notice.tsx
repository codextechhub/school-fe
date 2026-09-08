import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

/**
 * The outlined-circle empty state, as a whole-screen block.
 *
 * CustomTable already owns this idiom for a list with no rows; this is the same
 * shape for the cases that are not a list at all - a control room that was never
 * provisioned, a route that opens at go-live, a state call that failed. Keeping
 * one ring means those pages do not each invent their own empty screen.
 */
export function OutlinedNotice({
  icon: Icon,
  title,
  body,
  actionLabel,
  onAction,
  actionLoading,
  secondaryLabel,
  onSecondary,
  className,
}: {
  icon: LucideIcon;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionLoading?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-white rounded-md border border-white-02 px-6 py-14 flex flex-col items-center text-center gap-3.5",
        className,
      )}
    >
      <span className="size-40 rounded-full border border-primary grid place-content-center text-primary">
        <Icon className="size-9" strokeWidth={1.5} />
      </span>
      <h2 className="mt-1.5 text-lg font-semibold font-mont text-black-01 text-balance">
        {title}
      </h2>
      {body && (
        <p className="text-sm text-gray-06 max-w-[46ch] text-pretty">{body}</p>
      )}
      {(actionLabel || secondaryLabel) && (
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {actionLabel && (
            <Button onClick={onAction} loading={actionLoading}>
              {actionLabel}
            </Button>
          )}
          {secondaryLabel && (
            <Button variant="outline" onClick={onSecondary}>
              {secondaryLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

import { Link } from "react-router";
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
 *
 * An action that goes to another screen in this app takes `actionTo` rather
 * than an `onAction` that sets `window.location`: the button renders as a
 * router link, so the move keeps the loaded app, the store and the reader's
 * history instead of reloading everything. `onAction` is for work done in
 * place, such as a retry. When both are given, `actionTo` wins.
 */
export function OutlinedNotice({
  icon: Icon,
  title,
  body,
  actionLabel,
  onAction,
  actionTo,
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
  /** An in-app path the primary button links to. */
  actionTo?: string;
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
          {actionLabel && actionTo && (
            <Button asChild>
              <Link to={actionTo}>{actionLabel}</Link>
            </Button>
          )}
          {actionLabel && !actionTo && (
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

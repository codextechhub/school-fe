import { cloneElement, isValidElement, useId } from "react";
import type { ReactElement, ReactNode } from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

/**
 * The frame all five student drawers sit in.
 *
 * One shell rather than five, because the differences between them are the
 * fields and nothing else: same width, same header, same footer, same
 * disabled-until-valid rule. Five copies would drift, and the first thing to
 * drift is which of them can be saved empty.
 *
 * `w-full sm:max-w-md` is the house rule - full bleed on a phone, a panel above
 * it. The body scrolls, the footer does not, so Save is reachable without
 * scrolling to the end of a long form on a small screen.
 *
 * The body scrolls through `ScrollArea` rather than natively. A native
 * scrollbar takes its width out of the box, so a form is one width until it
 * grows past the panel and a narrower one afterwards, and every field shifts
 * left the moment one more row appears. How much it takes depends on the
 * reader's machine - nothing on a Mac trackpad, about fifteen pixels on
 * Windows with a mouse - so a drawer checked on one was never checked on the
 * other. The padding rides on the viewport rather than on this element,
 * because the scrolling box has to be the one that is padded or the last field
 * sits against the footer.
 */
export function DrawerShell({
  open,
  onClose,
  title,
  subtitle,
  children,
  saveLabel,
  onSave,
  canSave,
  saving,
  destructive,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  saveLabel: string;
  onSave: () => void;
  canSave: boolean;
  saving?: boolean;
  /** Colours the primary button for a move that takes a child off the roll. */
  destructive?: boolean;
}) {
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 bg-white p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-border px-5 pb-4 pt-5 pr-12 text-left">
          <SheetTitle className="font-mont text-base">{title}</SheetTitle>
          {subtitle && (
            <SheetDescription className="text-[13px] text-gray-01">
              {subtitle}
            </SheetDescription>
          )}
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1" viewportClassName="px-5 py-4">
          {children}
        </ScrollArea>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={onSave}
            disabled={!canSave || saving}
            className={destructive ? "bg-red-600 hover:bg-red-700" : undefined}
          >
            {saving ? "Saving…" : saveLabel}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * A labelled field. `error` shows only once the field has been touched.
 *
 * The label is tied to the control with `htmlFor`/`id` rather than by wrapping
 * it. A wrapping `<label>` looks equivalent and is not: the accessible name is
 * computed from the label's text, and an embedded control contributes its own
 * content to that text - so a `<select>` inside one announced as "Gender Select
 * a gender Female Male", reading its entire option list back as the name of the
 * field. The hint and the error are tied on with `aria-describedby`, so they are
 * announced as description rather than swallowed into the name too.
 */
export function Field({
  label,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  /**
   * Mark the label with the design's red asterisk.
   *
   * Marking the required ones rather than writing "(optional)" after the rest:
   * on a form where most fields ARE required, the second reads as an
   * apologetic list and the eye stops picking out anything.
   */
  required?: boolean;
  children: ReactNode;
}) {
  const id = useId();
  const noteId = `${id}-note`;
  const note = error ?? hint;

  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-gray-05">
        {label}
        {required && (
          <span aria-hidden className="pl-1 text-red-600">
            *
          </span>
        )}
      </label>
      {isValidElement(children)
        ? cloneElement(children as ReactElement<Record<string, unknown>>, {
            id,
            ...(note ? { "aria-describedby": noteId } : {}),
            ...(error ? { "aria-invalid": true } : {}),
          })
        : children}
      {note && (
        <span
          id={noteId}
          className={error ? "text-xs text-red-600" : "text-xs text-gray-05"}
        >
          {note}
        </span>
      )}
    </div>
  );
}

export const inputClass =
  "h-9 w-full rounded-lg border border-white-02 bg-white px-3 text-sm outline-none focus:border-primary";

export const errorInputClass =
  "h-9 w-full rounded-lg border border-red-400 bg-white px-3 text-sm outline-none focus:border-red-500";

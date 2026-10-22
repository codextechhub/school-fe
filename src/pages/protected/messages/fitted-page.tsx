import * as React from "react";

import { PageShell } from "@/components/layout/page-shell";
import { cn } from "@/lib/utils";

import { useFitViewport } from "./use-fit-viewport";

/**
 * The `<main>` of a screen made of fixed panes, such as a list beside a
 * conversation.
 *
 * It is a `PageShell` pinned to the visible screen below the app header, so the
 * page itself never scrolls and each pane scrolls inside its own box. The CSS
 * height is the fallback until the first measurement, and a proxy banner or an
 * on-screen keyboard is picked up by the measurement (see `useFitViewport`).
 * Children that should share the leftover height take `min-h-0 flex-1`.
 *
 * `ownsTop` is for the screen that has hidden the app header on a phone: the
 * page then fills the whole screen from its top edge and follows the visual
 * viewport, so its own header stays in view with the keyboard open.
 */
export function FittedPage({
  className,
  style,
  ownsTop = false,
  ...props
}: React.ComponentProps<typeof PageShell> & { ownsTop?: boolean }) {
  const { ref, height, shift } = useFitViewport<HTMLElement>(ownsTop);
  return (
    <PageShell
      ref={ref}
      style={{
        ...style,
        height,
        transform: shift ? `translateY(${shift}px)` : undefined,
      }}
      className={cn(
        "flex h-[calc(100dvh-3.75rem)] flex-col gap-4 overflow-hidden pb-4",
        ownsTop && "max-lg:h-dvh",
        className,
      )}
      {...props}
    />
  );
}

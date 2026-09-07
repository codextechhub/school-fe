/**
 * Shape-aware loading ghosts. A loading screen should preview the layout of
 * the data that is about to arrive - ghost table rows, ghost cards, ghost stat
 * tiles - instead of a spinner that tells the user nothing about what is
 * coming. Built on the <Skeleton> primitive so the pulse/reduced-motion policy
 * lives in exactly one place.
 *
 * Everything here is decorative: each ghost is aria-hidden, and the surface
 * that renders them announces itself ONCE via <SkeletonLoadingLabel>. A screen
 * reader must hear "Loading…" a single time, never once per ghost row.
 */

import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ghostWidth } from "@/components/custom/skeleton-widths";

/** One ghost line of text. `width` is a Tailwind width class. */
export function SkeletonText({
  width = "w-full",
  className,
}: {
  width?: string;
  className?: string;
}) {
  return <Skeleton className={cn("h-3.5", width, className)} />;
}

/**
 * One ghost table row spanning `columns` cells. `rowIndex` seeds the width
 * cycle so consecutive rows look ragged rather than striped.
 */
export function SkeletonRow({
  columns,
  rowIndex = 0,
  cellClassName,
  className,
}: {
  columns: number;
  rowIndex?: number;
  cellClassName?: string;
  className?: string;
}) {
  const count = Math.max(1, columns);
  return (
    <TableRow aria-hidden className={cn("hover:bg-transparent", className)}>
      {Array.from({ length: count }).map((_, col) => (
        <TableCell
          key={col}
          className={cn("border-white-02 border-y-5 py-3.5", cellClassName)}
        >
          {/* rowIndex * 3 keeps neighbouring rows out of phase with each other.
              min-w gives the ghost an intrinsic width: a percentage-only box
              contributes nothing to table auto-layout, so columns whose header
              is blank/narrow would collapse to a dot. */}
          <SkeletonText
            width={ghostWidth(rowIndex * 3 + col)}
            className="min-w-12"
          />
        </TableCell>
      ))}
    </TableRow>
  );
}

/**
 * Ghost of a phone list card - the stacked label/value rendering a table row
 * collapses into below `md`. `lines` is how many label/value pairs to preview.
 */
export function SkeletonCard({
  lines = 3,
  rowIndex = 0,
  className,
}: {
  lines?: number;
  rowIndex?: number;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "space-y-2.5 border-b border-white-02 px-3.5 py-3.5 last:border-0",
        className,
      )}
    >
      {/* the card's bold primary line */}
      <SkeletonText width={ghostWidth(rowIndex)} className="h-4 max-w-[60%]" />
      {Array.from({ length: Math.max(1, lines) }).map((_, i) => (
        // Label and value each get their own bounded column so the width
        // cycle actually varies them - a flex-1 ghost would stretch to a
        // uniform bar and read as a progress meter, not as content.
        <div key={i} className="flex items-center justify-between gap-3">
          <div className="w-1/3">
            <SkeletonText width={ghostWidth(rowIndex + i * 2)} className="h-3" />
          </div>
          <div className="flex w-1/2 justify-end">
            <SkeletonText
              width={ghostWidth(rowIndex * 2 + i + 3)}
              className="h-3"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Ghost of a stat/KPI tile: caption line over a value line. */
export function SkeletonKpi({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("space-y-3 rounded-md bg-white p-4", className)}
    >
      <SkeletonText width="w-24" className="h-3" />
      <SkeletonText width="w-16" className="h-6" />
    </div>
  );
}

/**
 * The one accessible announcement for a loading surface. Render exactly one
 * per surface, alongside the (aria-hidden) ghosts.
 */
export function SkeletonLoadingLabel({ text = "Loading…" }: { text?: string }) {
  return (
    <span role="status" aria-live="polite" className="sr-only">
      {text}
    </span>
  );
}

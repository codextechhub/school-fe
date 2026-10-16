import { PageHeader } from "@/components/layout/page-header";

/**
 * Shared heading for Attendance pages.
 *
 * Draws through `PageHeader`, so its size matches every other menu screen.
 * The purpose line comes first and the scope line (branch, date range,
 * provenance) sits under it as a second line, with empty entries dropped.
 * Actions wrap below the title on narrow screens, so a long branch or date
 * never stretches the page beyond the viewport.
 */
export function AttendancePageHeader({
  title,
  description,
  meta = [],
  actions,
}: {
  title: string;
  description?: string;
  meta?: Array<string | null | undefined>;
  actions?: React.ReactNode;
}) {
  const detail = meta.filter(Boolean).join(" · ");

  return (
    <PageHeader
      title={title}
      description={
        description || detail ? (
          <>
            {description}
            {detail && <span className={description ? "mt-0.5 block" : "block"}>{detail}</span>}
          </>
        ) : undefined
      }
      actions={actions}
    />
  );
}

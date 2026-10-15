/**
 * Shared heading for Attendance pages.
 *
 * The heading keeps the section name, purpose, scope, and date controls in a
 * stable order. Actions wrap below the title on narrow screens, so a long
 * branch or date never stretches the page beyond the viewport.
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
    <header className="flex min-w-0 flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Attendance</p>
        <h1 className="mt-1 font-mont text-2xl font-semibold tracking-tight text-black-01 sm:text-3xl">
          {title}
        </h1>
        {description && <p className="mt-1 text-sm text-gray-06">{description}</p>}
        {detail && <p className="mt-1 text-xs text-gray-05">{detail}</p>}
      </div>
      {actions && <div className="flex max-w-full flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

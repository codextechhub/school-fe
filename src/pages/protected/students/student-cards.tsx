import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ClickableCard } from "@/components/custom/surface";
import type { StudentRow } from "@/redux/services/students/students-types";

import { StudentStatusBadge } from "./status-badge";
import { PersonAvatar } from "./person-avatar";
import { getDirectoryRecordHealth } from "./profile-completeness";

/**
 * The directory as cards.
 *
 * Not a phone fallback - CustomTable already stacks rows into cards below `md`.
 * This is a deliberate desktop view for browsing rather than comparing, which
 * is what the design offers the toggle for.
 */
export function StudentCards({
  rows,
  loading,
  onOpen,
  page,
  totalPages,
  onPageChange,
  emptyText,
}: {
  rows: StudentRow[];
  loading?: boolean;
  onOpen: (id: number) => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  emptyText: string;
}) {
  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-white-02 bg-white px-4 py-10 text-center text-sm text-gray-05">
        {emptyText}
      </p>
    );
  }

  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((s) => (
          <li key={s.id} className="min-w-0">
            {/* The app's clickable card. Its own comment records four
                hand-rolled copies of which only two animated, so half the
                academics screens looked unclickable; this was a fifth. */}
            <ClickableCard
              onOpen={() => onOpen(s.id)}
              label={`Open ${s.full_name}'s record`}
              className="flex w-full min-w-0 flex-col gap-3 rounded-xl p-4 text-left"
            >
              <div className="flex min-w-0 items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  <PersonAvatar
                    name={s.full_name}
                    photoUrl={s.photo_url}
                    className="size-10 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-black-01">
                      {s.full_name}
                    </p>
                    <p className="truncate text-xs text-gray-05">
                      {s.student_number || "Not issued"}
                    </p>
                  </div>
                </div>
                <StudentStatusBadge status={s.status} label={s.status_label} />
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    s.class_name
                      ? "bg-white-03 text-primary"
                      : "bg-amber-500/10 text-amber-700"
                  }`}
                >
                  {s.class_name || "No class yet"}
                </span>
                {s.level_name && (
                  <span className="text-xs text-gray-05">{s.level_name}</span>
                )}
              </div>

              <div className="grid gap-2 border-t border-border pt-3">
                <p className="truncate text-xs text-gray-05">
                  {s.primary_guardian || "No guardian linked"}
                </p>
                <CardRecordHealth student={s} />
              </div>
            </ClickableCard>
          </li>
        ))}
      </ul>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-gray-05">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="inline-flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => onPageChange(Math.max(1, page - 1))}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

function CardRecordHealth({ student }: { student: StudentRow }) {
  const health = getDirectoryRecordHealth(student);

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-04">
        <span
          className={`block h-full rounded-full ${
            health.gaps === 0 ? "bg-emerald-600" : "bg-amber-500"
          }`}
          style={{ width: `${health.percentage}%` }}
        />
      </span>
      <span className="shrink-0 text-[11px] text-gray-05">
        {health.gaps === 0 ? "Ready" : `${health.gaps} gaps`}
      </span>
    </div>
  );
}

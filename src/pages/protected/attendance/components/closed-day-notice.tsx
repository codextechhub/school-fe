import { CalendarOff } from "lucide-react";

import type { ClosedDay } from "@/redux/services/attendance/attendance-types";

/**
 * A day with no register: the school, or this reader's part of it, was closed.
 *
 * Says why and says what it means, because the question a reader has on a
 * closed day is "is anything missing?", and the answer is no.
 */
export function ClosedDayNotice({ closed, dateLabel }: { closed: ClosedDay; dateLabel: string }) {
  return (
    <div
      role="status"
      className="flex min-w-0 items-start gap-3 rounded-md border border-blue-200 bg-blue-50 px-4 py-3.5"
    >
      <CalendarOff className="mt-0.5 size-5 shrink-0 text-blue-700" aria-hidden="true" />
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-semibold text-blue-900">No school: {closed.reason}</p>
        <p className="text-sm text-blue-900/80">
          {dateLabel} is closed, so no register was due and none is missing.
        </p>
      </div>
    </div>
  );
}

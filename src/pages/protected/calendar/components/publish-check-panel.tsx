import { AlertTriangle, CalendarOff, UserX } from "lucide-react";

import { cn } from "@/lib/utils";
import type { PublishCheck } from "./publish-check";

/** A publish refusal as the server sent it: its sentence and the rows it named. */
export interface PublishRefusal {
  message: string;
  items: string[];
}

/**
 * The publish check on a class's week: lessons not ready to publish, lessons
 * on a day the school no longer teaches, and lessons whose teacher has no
 * teaching duty for them.
 *
 * Red when something in it blocks publishing, amber when it is only worth
 * knowing. After a refused publish the server's sentence leads, and the rows
 * it named are listed only when the grid could not account for them itself,
 * so the same lesson is never listed twice.
 */
export function PublishCheckPanel({
  check,
  refusal,
}: {
  check: PublishCheck;
  refusal?: PublishRefusal | null;
}) {
  const { missing, offDay, duty, dutySeverity, blocking } = check;
  const explained = missing.length > 0 || offDay.length > 0 || duty.length > 0;
  if (!explained && !refusal) return null;
  const red = blocking || !!refusal;

  return (
    <div
      data-guide="class-timetable.publish-check"
      className={cn(
        "print-hide border-b px-4 py-3.5 sm:px-5",
        red ? "border-error-text/20 bg-error-text/5" : "border-yellow-01/30 bg-yellow-01/5",
      )}
    >
      <p
        className={cn(
          "flex items-center gap-1.5 text-[13px] font-medium",
          red ? "text-error-text" : "text-yellow-02",
        )}
      >
        <AlertTriangle className="size-3.5 shrink-0" />
        {blocking || refusal ? "Not ready to publish" : "Before you publish"}
      </p>

      {refusal?.message && (
        <p role="alert" className="mt-1 text-xs text-gray-06 text-pretty">
          {refusal.message}
        </p>
      )}
      {refusal && !explained && refusal.items.length > 0 && (
        <ul className="mt-1.5 grid gap-1">
          {refusal.items.map((item, i) => (
            <li key={`${item}-${i}`} className="text-xs text-gray-06 text-pretty">
              {item}
            </li>
          ))}
        </ul>
      )}

      {missing.length > 0 && (
        <div className="mt-2">
          <p className="text-xs font-medium text-gray-06">
            {missing.length} lesson{missing.length === 1 ? " is" : "s are"} not
            ready
          </p>
          <ul className="mt-1 grid gap-1">
            {missing.map((row) => (
              <li key={row.slotId} className="text-xs text-gray-06 text-pretty">
                {row.where} · {row.subject}: {row.needs}
              </li>
            ))}
          </ul>
        </div>
      )}

      {offDay.length > 0 && (
        <ul className="mt-2 grid gap-1">
          {offDay.map((row) => (
            <li
              key={row.slotId}
              className="flex items-start gap-1.5 text-xs text-gray-06 text-pretty"
            >
              <CalendarOff className="mt-px size-3.5 shrink-0 text-error-text" />
              <span className="min-w-0">
                {row.day} is not a teaching day: move or remove {row.className}
                &apos;s {row.subject}
              </span>
            </li>
          ))}
        </ul>
      )}

      {duty.length > 0 && (
        <div className="mt-2">
          <p className="flex items-center gap-1.5 text-xs font-medium text-gray-06">
            <UserX className="size-3.5 shrink-0" />
            {duty.length === 1
              ? "1 lesson's teacher does not have it in Teaching duties"
              : `${duty.length} lessons' teachers do not have them in Teaching duties`}
          </p>
          <ul className="mt-1 grid gap-1">
            {duty.map((row) => (
              <li key={row.key} className="text-xs text-gray-06 text-pretty">
                {row.subject && row.teacher
                  ? `${row.className} · ${row.subject} · ${row.teacher}`
                  : row.detail}
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-xs text-gray-05 text-pretty">
            {dutySeverity === "blocking"
              ? "The school requires a matching teaching duty, so publishing is blocked until each of these has one or a different teacher."
              : "Publishing still goes ahead. The school asks to be told about these."}
          </p>
        </div>
      )}
    </div>
  );
}

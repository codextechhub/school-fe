import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFieldAccess } from "@/components/finance-ui";
import { useSchoolDisplay } from "@/hooks/use-school-display";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import { cn } from "@/lib/utils";
import type { AttendanceMark, RegisterRow } from "@/redux/services/attendance/attendance-types";
import { PersonAvatar } from "@/pages/protected/students/person-avatar";

import { MARKS } from "../marks";

/** How a row may be worked: marked in place, asked to be corrected, or only read. */
export type RowMode = "mark" | "correct" | "read";

/** The tinted look of a picked mark button, per mark. */
const PICKED: Record<AttendanceMark, string> = {
  P: "border-transparent bg-[#EAF3DE] text-[#3B6D11]",
  L: "border-transparent bg-[#FAEEDA] text-[#854F0B]",
  A: "border-transparent bg-[#FCEBEB] text-[#A32D2D]",
  E: "border-transparent bg-[#E6F1FB] text-[#185FA5]",
};

/**
 * One student's line on a register.
 *
 * Built for a phone first, because a register is taken standing in front of a
 * class: the name on one line, and below it four large targets, one per mark.
 * From the `sm` width up the targets move to the end of the line.
 *
 * A suspended child is listed, locked, and counted nowhere. A mark the reader
 * may not write is shown as a chip; on a closed day the chip carries
 * "Request correction" for a reader who may ask for one.
 */
export function RegisterRowItem({
  row,
  mode,
  marks,
  offered = ["P", "L", "A", "E"],
  fieldResource = FIELD_RESOURCE.ATTENDANCE_REGISTER,
  aside,
  lockedText,
  busy,
  onMark,
  onRequestCorrection,
}: {
  row: RegisterRow;
  mode: RowMode;
  /** The marks this reader may record here, after Field Access. */
  marks: AttendanceMark[];
  /** The buttons the register has at all: a lesson register has no Excused. */
  offered?: AttendanceMark[];
  /** The Field Access resource the row's fields belong to. */
  fieldResource?: string;
  /** A line under the name, such as the morning mark beside a lesson. */
  aside?: ReactNode;
  /** What a locked row says in place of its buttons. A child's lock is a suspension. */
  lockedText?: ReactNode;
  busy: boolean;
  onMark: (mark: AttendanceMark) => void;
  onRequestCorrection?: () => void;
}) {
  const access = useFieldAccess(fieldResource);
  const { formatTime } = useSchoolDisplay();

  const details = [
    !access.isHidden("reason_code") ? row.reason_label : null,
    !access.isHidden("arrived_at") && row.arrived_at ? `Arrived ${formatTime(row.arrived_at)}` : null,
    !access.isHidden("note") ? row.note : null,
  ].filter(Boolean).join(" · ");

  return (
    <li className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2.5 px-4 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
      <PersonAvatar name={row.name} className="size-9" />
      <div className="min-w-0">
        <p className="truncate font-medium text-black-01">{row.name}</p>
        {row.student_number && <p className="text-xs text-gray-05">{row.student_number}</p>}
        {details && <p className="mt-0.5 text-xs text-gray-06">{details}</p>}
        {aside}
      </div>
      <div className="col-span-2 flex flex-wrap items-center gap-2 sm:col-span-1 sm:justify-end">
        {row.locked ? (
          lockedText ?? (
            <>
              <Badge variant="inactive" className="rounded-full">Suspended</Badge>
              <span className="text-xs text-gray-05">Kept out of attendance</span>
            </>
          )
        ) : mode === "mark" ? (
          offered.map((mark) => (
            <button
              key={mark}
              type="button"
              title={MARKS[mark].label}
              aria-label={`${MARKS[mark].label}: ${row.name}`}
              aria-pressed={row.mark === mark}
              disabled={busy || !marks.includes(mark)}
              onClick={() => onMark(mark)}
              className={cn(
                "h-11 w-12 rounded-md border text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:h-9 sm:w-10",
                row.mark === mark ? PICKED[mark] : "border-border bg-white text-gray-05 hover:bg-white-05",
              )}
            >
              {mark}
            </button>
          ))
        ) : (
          <>
            {row.mark !== undefined && (
              <Badge variant={row.mark ? MARKS[row.mark].badge : "inactive"} className="rounded-full">
                {row.mark ? MARKS[row.mark].label : "Not taken"}
                {row.mark === "L" && row.arrived_at && !access.isHidden("arrived_at")
                  ? ` · ${formatTime(row.arrived_at)}`
                  : ""}
              </Badge>
            )}
            {mode === "correct" && row.mark && onRequestCorrection && (
              <Button variant="outline" size="sm" onClick={onRequestCorrection}>
                Request correction
              </Button>
            )}
          </>
        )}
      </div>
    </li>
  );
}

import { GraduationCap } from "lucide-react";

import type { ClassTimetableRow } from "@/redux/services/calendar/calendar-types";
import { RowPicker } from "../components/row-picker";

/**
 * Which class's week is on screen.
 *
 * "Not started" in the subtitle is an ABSENT record, not a status. A class whose
 * grid has never been touched has no timetable row at all - that is the third
 * state, and a DRAFT default would quietly destroy the difference between "we
 * have not begun" and "we began and saved nothing".
 */
export function ClassPicker({
  classes,
  current,
  onPick,
}: {
  classes: ClassTimetableRow[];
  current: number | null;
  onPick: (id: number) => void;
}) {
  return (
    <RowPicker
      label="Timetable for"
      rows={classes}
      current={current}
      searchPlaceholder="Search classes"
      emptyText="No class matches that."
      presentation="card"
      icon={GraduationCap}
      subtitle={(c) =>
        [
          `${c.lesson_count} lesson${c.lesson_count === 1 ? "" : "s"}`,
          c.status_label,
          c.scope_label,
        ]
          .filter(Boolean)
          .join(" · ")
      }
      onPick={onPick}
    />
  );
}

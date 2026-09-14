import { Users } from "lucide-react";

import type { TeacherRow } from "@/redux/services/calendar/calendar-types";
import { RowPicker } from "../components/row-picker";

/**
 * Whose week is on screen.
 *
 * The two facts beside each name are the two this module can honestly report:
 * how many lessons they hold, and whether any of them clashes. Nothing else -
 * no specialism, no availability, no maximum load - because nothing in the
 * platform records any of them, and a picker inventing one would be worse than
 * a picker without it.
 */
export function PersonPicker({
  people,
  current,
  onPick,
}: {
  people: TeacherRow[];
  current: number | null;
  onPick: (id: number) => void;
}) {
  return (
    <RowPicker
      label="Timetable for"
      rows={people}
      current={current}
      searchPlaceholder="Search teachers"
      emptyText="No teacher matches that."
      presentation="card"
      icon={Users}
      subtitle={(t) =>
        `${t.lesson_count} lesson${t.lesson_count === 1 ? "" : "s"}${
          t.has_clash ? " · has a clash" : ""
        }`
      }
      onPick={onPick}
    />
  );
}

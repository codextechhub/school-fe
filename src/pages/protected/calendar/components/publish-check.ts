import type {
  ClashWarning,
  ClassTimetable,
  TeacherDutyMatch,
  TimetableSlot,
} from "@/redux/services/calendar/calendar-types";

/**
 * What stands between a class's week and publishing it, read off the grid.
 *
 * Three kinds of thing, kept apart from the clashes the grid already lists:
 *
 *   * **Lessons missing a teacher, or a room.** A room only counts when the
 *     school's `room_required_to_publish` says so; a school whose classes stay
 *     in their own rooms is never told a lesson "needs a room".
 *   * **Teaching-duty mismatches**: a lesson whose teacher holds no teaching
 *     duty for that class and subject. The server reports each as a warning on
 *     the grid (`TEACHER_HAS_NO_DUTY`). Under WARN it is listed and publishing
 *     goes ahead; under REFUSE it blocks; under OFF it is not shown.
 *   * **Lessons on a day the school no longer teaches**: any lesson in a column
 *     the server flags `is_teaching_day: false`. Always blocking: the lesson
 *     has to be moved or removed before the week can be published.
 *
 * The server's publish gate is still the one that decides. This is the list a
 * school reads before pressing Publish, so the refusal is never a surprise.
 */

/** The warning code the server gives a lesson whose teacher has no duty for it. */
export const TEACHER_HAS_NO_DUTY = "TEACHER_HAS_NO_DUTY";

/**
 * True for a teaching-duty warning or refusal code. Matched on the word so a
 * refusal code worded differently from the warning's is still recognised.
 */
export function isDutyCode(code: string | undefined | null): boolean {
  return !!code && (code === TEACHER_HAS_NO_DUTY || code.includes("DUTY"));
}

/**
 * A grid's warnings split into real clashes and duty mismatches.
 *
 * A duty mismatch is not a clash: nobody is double-booked, and counting it in
 * "3 clashes" or flagging its cell red would send a school looking for a
 * collision that is not there.
 */
export function splitWarnings(warnings: ClashWarning[] = []): {
  clashes: ClashWarning[];
  duty: ClashWarning[];
} {
  const clashes: ClashWarning[] = [];
  const duty: ClashWarning[] = [];
  for (const w of warnings) (isDutyCode(w.code) ? duty : clashes).push(w);
  return { clashes, duty };
}

export interface MissingLesson {
  slotId: number;
  where: string;
  subject: string;
  /** "needs a teacher", "needs a room" or "needs a teacher and a room". */
  needs: string;
}

export interface OffDayLesson {
  slotId: number;
  day: string;
  className: string;
  subject: string;
}

export interface DutyMismatch {
  key: string;
  className: string;
  subject: string;
  teacher: string;
  /** The server's sentence, for a mismatch whose lesson this grid cannot show. */
  detail: string;
}

export interface PublishCheck {
  missing: MissingLesson[];
  offDay: OffDayLesson[];
  duty: DutyMismatch[];
  /** "warning" publishes anyway; "blocking" is refused by the server. */
  dutySeverity: "warning" | "blocking";
  /** True when something here stops the week publishing. */
  blocking: boolean;
}

interface Lesson {
  slot: TimetableSlot;
  where: string;
  day: string;
  taught: boolean;
}

function lessonsOf(grid: ClassTimetable): Lesson[] {
  const out: Lesson[] = [];
  for (const day of grid.days) {
    for (const cell of day.cells) {
      if (cell.slot) {
        out.push({
          slot: cell.slot,
          where: `${day.day_label} · ${cell.period_label}`,
          day: day.day_label,
          taught: day.is_teaching_day !== false,
        });
      }
    }
  }
  return out;
}

function needsOf(slot: TimetableSlot, roomRequired: boolean): string {
  const noTeacher = !slot.teacher;
  const noRoom = roomRequired && slot.room == null;
  if (noTeacher && noRoom) return "needs a teacher and a room";
  if (noTeacher) return "needs a teacher";
  if (noRoom) return "needs a room";
  return "";
}

export function publishCheckFor(
  grid: ClassTimetable,
  {
    roomRequired,
    dutyMatch,
  }: { roomRequired: boolean; dutyMatch: TeacherDutyMatch },
): PublishCheck {
  const lessons = lessonsOf(grid);
  const missing: MissingLesson[] = [];
  for (const { slot, where } of lessons) {
    const needs = needsOf(slot, roomRequired);
    if (needs) {
      missing.push({ slotId: slot.id, where, subject: slot.subject_name, needs });
    }
  }

  const offDay: OffDayLesson[] = lessons
    .filter((lesson) => !lesson.taught)
    .map(({ slot, day }) => ({
      slotId: slot.id,
      day,
      className: slot.class_name || grid.school_class.name,
      subject: slot.subject_name,
    }));

  const bySlot = new Map(lessons.map(({ slot }) => [slot.id, slot]));
  const duty: DutyMismatch[] =
    dutyMatch === "OFF"
      ? []
      : splitWarnings(grid.warnings).duty.map((w, i) => {
          const slot = (w.slot_ids ?? []).map((id) => bySlot.get(id)).find(Boolean);
          return {
            key: `${w.code}-${slot?.id ?? i}`,
            className: slot?.class_name ?? grid.school_class.name,
            subject: slot?.subject_name ?? "",
            teacher: slot?.teacher?.name ?? "",
            detail: w.detail,
          };
        });

  const dutySeverity = dutyMatch === "REFUSE" ? "blocking" : "warning";
  return {
    missing,
    offDay,
    duty,
    dutySeverity,
    blocking:
      missing.length > 0 ||
      offDay.length > 0 ||
      (dutySeverity === "blocking" && duty.length > 0),
  };
}

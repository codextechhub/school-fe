import type {
  ExamSlot,
  Invigilator,
  Person,
  Sitting,
} from "@/redux/services/calendar/calendar-types";

// The paper form's shape, and the two ways of filling it in. Split from the
// drawer so the screen can build one without importing a form.

export interface PaperValues {
  school_class: number | null;
  subject: number | null;
  exam_date: string;
  sitting: Sitting;
  /** Kept as strings, so an empty box stays empty rather than becoming 00:00. */
  start_time: string;
  end_time: string;
  room: number | null;
  invigilator: number | null;
}

/**
 * A blank paper, dated to the exam period's first day.
 *
 * Every paper has to sit inside the period anyway, so starting there saves a
 * date pick and can never be out of range - unlike today's date, which usually
 * is.
 */
export function blankPaper(firstDate: string): PaperValues {
  return {
    school_class: null,
    subject: null,
    exam_date: firstDate,
    sitting: "MORNING",
    start_time: "",
    end_time: "",
    room: null,
    invigilator: null,
  };
}

export function paperValuesFrom(slot: ExamSlot): PaperValues {
  return {
    school_class: slot.school_class,
    subject: slot.subject,
    exam_date: slot.exam_date,
    sitting: slot.sitting,
    // The API sends HH:MM:SS; a time input takes HH:MM and rejects the rest.
    start_time: (slot.start_time ?? "").slice(0, 5),
    end_time: (slot.end_time ?? "").slice(0, 5),
    room: slot.room,
    invigilator: slot.invigilator?.id ?? null,
  };
}

/**
 * The invigilator picker's options: each eligible person with their role, and
 * the saved invigilator on top when they are no longer on the list.
 */
export function invigilatorOptions(
  invigilators: Invigilator[],
  current?: Person | null,
): { value: string; label: string }[] {
  const options = invigilators.map((person) => ({
    value: String(person.id),
    label: person.role_label ? `${person.name} · ${person.role_label}` : person.name,
  }));
  if (current && !invigilators.some((person) => person.id === current.id)) {
    options.unshift({ value: String(current.id), label: current.name });
  }
  return options;
}

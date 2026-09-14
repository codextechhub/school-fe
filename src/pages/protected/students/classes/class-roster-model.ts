import type {
  ClassSeats,
  StudentRow,
} from "@/redux/services/students/students-types";

/** The class load in the school's words, including legitimate over-capacity rows. */
export function loadNote(schoolClass: ClassSeats): string {
  if (schoolClass.capacity == null) return "No limit set";
  if (schoolClass.used > schoolClass.capacity) {
    return `Over by ${schoolClass.used - schoolClass.capacity}`;
  }
  if (schoolClass.remaining === 0) return "Full";
  return `${schoolClass.remaining} free`;
}

/** Preview the whole selected batch against the destination's current capacity. */
export function assignmentImpact(
  schoolClass: ClassSeats,
  count: number,
): string {
  if (schoolClass.capacity == null) {
    return `Into ${schoolClass.name}. This class has no capacity limit set.`;
  }
  const after = schoolClass.used + count;
  if (after > schoolClass.capacity) {
    return `${schoolClass.name} currently holds ${schoolClass.used} of ${schoolClass.capacity}. This assignment would put it ${after - schoolClass.capacity} over capacity.`;
  }
  return `Into ${schoolClass.name}. ${schoolClass.used} of ${schoolClass.capacity} seats are used, with ${schoolClass.capacity - schoolClass.used} free.`;
}

/** Append a roster page without repeating rows already held by the feed. */
export function mergeRosterRows(
  current: StudentRow[],
  incoming: StudentRow[],
): StudentRow[] {
  const known = new Set(current.map((student) => student.id));
  return [
    ...current,
    ...incoming.filter((student) => !known.has(student.id)),
  ];
}

import type { AttendanceMark } from "@/redux/services/attendance/attendance-types";

export interface FocusedRegisterFieldState {
  markHidden: boolean;
  markReadOnly: boolean;
  arrivedAtHidden: boolean;
  arrivedAtReadOnly: boolean;
  reasonCodeHidden: boolean;
  reasonCodeReadOnly: boolean;
  countsHidden: boolean;
  statusHidden: boolean;
}

/**
 * Field Access decisions for the register embedded on the Today page.
 *
 * A hidden or read-only mark makes the entire row non-editable. Late also
 * needs a writable arrival time, while Excused needs a writable reason. Count
 * and status visibility stay independent from whether marks may be changed.
 */
export function focusedRegisterFieldPolicy(fields: FocusedRegisterFieldState) {
  const canMark = !fields.markHidden && !fields.markReadOnly;
  const marks: AttendanceMark[] = canMark
    ? [
        "P",
        ...(!fields.arrivedAtHidden && !fields.arrivedAtReadOnly ? (["L"] as const) : []),
        "A",
        ...(!fields.reasonCodeHidden && !fields.reasonCodeReadOnly ? (["E"] as const) : []),
      ]
    : [];

  return {
    canMark,
    marks,
    showCounts: !fields.countsHidden,
    showStatus: !fields.statusHidden,
  };
}

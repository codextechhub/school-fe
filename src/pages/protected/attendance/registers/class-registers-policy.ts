export interface ClassRegistersFieldState {
  countsHidden: boolean;
  statusHidden: boolean;
  markHidden: boolean;
}

/**
 * Field visibility for the register directory and its selected-class preview.
 *
 * Counts, status and student marks remain independent. Hiding one cannot leak
 * it through a progress bar, filter, summary card, badge or nested row label.
 * Read-only marks remain visible because this page does not submit changes.
 */
export function classRegistersFieldPolicy(fields: ClassRegistersFieldState) {
  return {
    showCounts: !fields.countsHidden,
    showStatus: !fields.statusHidden,
    showStudentMarks: !fields.markHidden,
  };
}

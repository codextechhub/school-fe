export interface LessonDirectoryFieldState {
  statusHidden: boolean;
  countsHidden: boolean;
  markHidden: boolean;
  morningMarkHidden: boolean;
  submittedAtHidden: boolean;
}

/** Field visibility shared by the lesson queue and its focused preview. */
export function lessonDirectoryFieldPolicy(fields: LessonDirectoryFieldState) {
  return {
    showStatus: !fields.statusHidden,
    showCounts: !fields.countsHidden,
    showMark: !fields.markHidden,
    showMorningMark: !fields.morningMarkHidden,
    showSubmittedAt: !fields.submittedAtHidden,
  };
}

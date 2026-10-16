export interface StaffRegisterFieldState {
  statusHidden: boolean;
  countsHidden: boolean;
  markHidden: boolean;
  takenByHidden: boolean;
}

/** Field visibility shared by staff summary cards, previews and full registers. */
export function staffRegisterFieldPolicy(fields: StaffRegisterFieldState) {
  return {
    showStatus: !fields.statusHidden,
    showCounts: !fields.countsHidden,
    showMark: !fields.markHidden,
    showTakenBy: !fields.takenByHidden,
  };
}

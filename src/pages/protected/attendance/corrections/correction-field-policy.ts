export interface CorrectionFieldState {
  fromMarkHidden: boolean;
  toMarkHidden: boolean;
  arrivedAtHidden: boolean;
  reasonHidden: boolean;
  noteHidden: boolean;
  requesterHidden: boolean;
  requestedAtHidden: boolean;
  deciderHidden: boolean;
  decidedAtHidden: boolean;
  decisionNoteHidden: boolean;
  decisionNoteReadOnly: boolean;
}

/**
 * Field visibility for the correction queue and selected-request review.
 *
 * Each response field keeps its own read boundary. The decision note is the
 * only value this screen submits, so its write state separately controls the
 * input and request body while leaving a readable existing note visible.
 */
export function correctionFieldPolicy(fields: CorrectionFieldState) {
  return {
    showFromMark: !fields.fromMarkHidden,
    showToMark: !fields.toMarkHidden,
    showArrivedAt: !fields.arrivedAtHidden,
    showReason: !fields.reasonHidden,
    showNote: !fields.noteHidden,
    showRequester: !fields.requesterHidden,
    showRequestedAt: !fields.requestedAtHidden,
    showDecider: !fields.deciderHidden,
    showDecidedAt: !fields.decidedAtHidden,
    showDecisionNote: !fields.decisionNoteHidden,
    canWriteDecisionNote: !fields.decisionNoteHidden && !fields.decisionNoteReadOnly,
  };
}

/** Builds a decision body without carrying a note past its write boundary. */
export function correctionDecisionBody({
  id,
  approve,
  note,
  canWriteDecisionNote,
}: {
  id: number;
  approve: boolean;
  note: string;
  canWriteDecisionNote: boolean;
}) {
  const decisionNote = note.trim();
  return {
    id,
    approve,
    ...(canWriteDecisionNote && decisionNote ? { decision_note: decisionNote } : {}),
  };
}

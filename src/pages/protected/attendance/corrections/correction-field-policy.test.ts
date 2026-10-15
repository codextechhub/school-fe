import { describe, expect, it } from "vitest";

import {
  correctionDecisionBody,
  correctionFieldPolicy,
  type CorrectionFieldState,
} from "./correction-field-policy";

const writable: CorrectionFieldState = {
  fromMarkHidden: false,
  toMarkHidden: false,
  arrivedAtHidden: false,
  reasonHidden: false,
  noteHidden: false,
  requesterHidden: false,
  requestedAtHidden: false,
  deciderHidden: false,
  decidedAtHidden: false,
  decisionNoteHidden: false,
  decisionNoteReadOnly: false,
};

describe("attendance correction Field Access", () => {
  it("shows every readable field and allows a writable decision note", () => {
    expect(correctionFieldPolicy(writable)).toEqual({
      showFromMark: true,
      showToMark: true,
      showArrivedAt: true,
      showReason: true,
      showNote: true,
      showRequester: true,
      showRequestedAt: true,
      showDecider: true,
      showDecidedAt: true,
      showDecisionNote: true,
      canWriteDecisionNote: true,
    });
  });

  it("keeps a read-only decision note visible but excludes it from writes", () => {
    const policy = correctionFieldPolicy({ ...writable, decisionNoteReadOnly: true });
    expect(policy.showDecisionNote).toBe(true);
    expect(policy.canWriteDecisionNote).toBe(false);
  });

  it("removes every hidden field including the nested decision note", () => {
    const policy = correctionFieldPolicy(Object.fromEntries(
      Object.keys(writable).map((key) => [key, true]),
    ) as unknown as CorrectionFieldState);
    expect(Object.values(policy)).toEqual(Array(Object.keys(policy).length).fill(false));
  });

  it("submits a writable decision note after trimming it", () => {
    expect(correctionDecisionBody({
      id: 12,
      approve: true,
      note: "  Hospital card verified  ",
      canWriteDecisionNote: true,
    })).toEqual({
      id: 12,
      approve: true,
      decision_note: "Hospital card verified",
    });
  });

  it("omits a hidden or read-only decision note from the request body", () => {
    expect(correctionDecisionBody({
      id: 12,
      approve: false,
      note: "Must not leave the browser",
      canWriteDecisionNote: false,
    })).toEqual({ id: 12, approve: false });
  });
});

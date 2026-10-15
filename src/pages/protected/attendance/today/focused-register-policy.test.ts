import { describe, expect, it } from "vitest";

import { focusedRegisterFieldPolicy, type FocusedRegisterFieldState } from "./focused-register-policy";

const writable: FocusedRegisterFieldState = {
  markHidden: false,
  markReadOnly: false,
  arrivedAtHidden: false,
  arrivedAtReadOnly: false,
  reasonCodeHidden: false,
  reasonCodeReadOnly: false,
  countsHidden: false,
  statusHidden: false,
};

describe("focused register Field Access", () => {
  it("offers every mark when its required fields are writable", () => {
    expect(focusedRegisterFieldPolicy(writable)).toEqual({
      canMark: true,
      marks: ["P", "L", "A", "E"],
      showCounts: true,
      showStatus: true,
    });
  });

  it("turns the register read-only when the mark is read-only", () => {
    const policy = focusedRegisterFieldPolicy({ ...writable, markReadOnly: true });
    expect(policy.canMark).toBe(false);
    expect(policy.marks).toEqual([]);
  });

  it("removes mark controls and hidden summaries when their fields are hidden", () => {
    expect(focusedRegisterFieldPolicy({
      ...writable,
      markHidden: true,
      countsHidden: true,
      statusHidden: true,
    })).toEqual({
      canMark: false,
      marks: [],
      showCounts: false,
      showStatus: false,
    });
  });

  it("withholds Late and Excused when their required fields cannot be written", () => {
    const policy = focusedRegisterFieldPolicy({
      ...writable,
      arrivedAtHidden: true,
      reasonCodeReadOnly: true,
    });
    expect(policy.marks).toEqual(["P", "A"]);
  });
});

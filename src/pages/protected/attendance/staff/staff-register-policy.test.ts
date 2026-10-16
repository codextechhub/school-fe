import { describe, expect, it } from "vitest";

import { staffRegisterFieldPolicy } from "./staff-register-policy";

describe("staff register Field Access", () => {
  it("shows readable summary and preview fields", () => {
    expect(staffRegisterFieldPolicy({
      statusHidden: false,
      countsHidden: false,
      markHidden: false,
      takenByHidden: false,
    })).toEqual({
      showStatus: true,
      showCounts: true,
      showMark: true,
      showTakenBy: true,
    });
  });

  it("removes every hidden field from summaries and previews", () => {
    expect(Object.values(staffRegisterFieldPolicy({
      statusHidden: true,
      countsHidden: true,
      markHidden: true,
      takenByHidden: true,
    }))).toEqual([false, false, false, false]);
  });
});

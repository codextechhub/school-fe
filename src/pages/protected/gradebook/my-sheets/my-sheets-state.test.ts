import { describe, expect, it } from "vitest";

import type { MySheet } from "@/redux/services/gradebook/gradebook-types";

import { getMySheetBoardStage, getMySheetsSummary, groupMySheets } from "./my-sheets-state";

function sheet(overrides: Partial<MySheet>): MySheet {
  return {
    class: { id: 1, name: "JSS 1 A" },
    subject: { id: 1, name: "Basic Science" },
    entered: 0,
    roll: 25,
    exam_paper: null,
    status: "NOT_STARTED",
    cta: "ENTER",
    ...overrides,
  };
}

describe("My sheets class board", () => {
  it("keeps locked sheets submitted even when their completion count is unusual", () => {
    expect(getMySheetBoardStage(sheet({ status: "SUBMITTED", entered: 20 }))).toBe("SUBMITTED");
    expect(getMySheetBoardStage(sheet({ status: "APPROVED", entered: 25 }))).toBe("SUBMITTED");
  });

  it("moves an editable sheet to ready only when its whole roll is complete", () => {
    expect(getMySheetBoardStage(sheet({ status: "IN_PROGRESS", entered: 24 }))).toBe("NEEDS_WORK");
    expect(getMySheetBoardStage(sheet({ status: "RETURNED", entered: 25 }))).toBe("READY");
    expect(getMySheetBoardStage(sheet({ roll: 0, entered: 0 }))).toBe("NEEDS_WORK");
  });

  it("groups every sheet once and derives the compact totals from the same rows", () => {
    const sheets = [
      sheet({ entered: 10, roll: 25, status: "IN_PROGRESS" }),
      sheet({ entered: 25, roll: 25, status: "RETURNED" }),
      sheet({ entered: 24, roll: 24, status: "SUBMITTED" }),
      sheet({ entered: 22, roll: 22, status: "APPROVED" }),
    ];

    const groups = groupMySheets(sheets);

    expect(groups.NEEDS_WORK).toHaveLength(1);
    expect(groups.READY).toHaveLength(1);
    expect(groups.SUBMITTED).toHaveLength(2);
    expect(getMySheetsSummary(sheets)).toEqual({
      assigned: 4,
      studentsRemaining: 15,
      returned: 1,
      submitted: 2,
    });
  });
});

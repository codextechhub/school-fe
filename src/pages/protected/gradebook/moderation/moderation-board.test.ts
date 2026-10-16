import { describe, expect, it } from "vitest";

import type { ModerationRow } from "@/redux/services/gradebook/gradebook-types";

import { getModerationBoardStage, getModerationSummary, groupModerationRows } from "./moderation-board";

function row(overrides: Partial<ModerationRow>): ModerationRow {
  return {
    class: { id: 1, name: "SSS 1 A" },
    subject: { id: 1, name: "Mathematics" },
    branch: null,
    main_teacher: { id: 1, name: "Chukwuemeka Eze" },
    marked: 25,
    roll: 25,
    status: "SUBMITTED",
    compare: [],
    can_decide: true,
    ...overrides,
  };
}

describe("moderation department board", () => {
  it("places returned and approved sheets in their own columns", () => {
    expect(getModerationBoardStage(row({ status: "RETURNED", can_decide: false }))).toBe("RETURNED");
    expect(getModerationBoardStage(row({ status: "APPROVED", can_decide: false }))).toBe("APPROVED");
  });

  it("keeps every other readable moderation row in the waiting column", () => {
    expect(getModerationBoardStage(row({ status: "SUBMITTED", can_decide: false }))).toBe("WAITING");
    expect(getModerationBoardStage(row({ status: "IN_PROGRESS", can_decide: false }))).toBe("WAITING");
  });

  it("does not count a readable submitted sheet as the reader's decision", () => {
    const rows = [
      row({ class: { id: 1, name: "SSS 1 A" }, can_decide: true }),
      row({ class: { id: 2, name: "SSS 1 B" }, can_decide: false }),
      row({ class: { id: 3, name: "SSS 1 C" }, status: "RETURNED", can_decide: false }),
      row({ class: { id: 4, name: "SSS 1 D" }, status: "APPROVED", can_decide: false }),
    ];

    const groups = groupModerationRows(rows);

    expect(groups.WAITING).toHaveLength(2);
    expect(groups.RETURNED).toHaveLength(1);
    expect(groups.APPROVED).toHaveLength(1);
    expect(getModerationSummary(rows)).toEqual({ waitingForYou: 1, returned: 1, approved: 1 });
  });
});

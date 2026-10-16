import { describe, expect, it } from "vitest";

import type { ApprovalRow } from "@/redux/services/gradebook/gradebook-types";

import { getApprovalDeskStage, getApprovalDeskSummary, groupApprovalRows } from "./approvals-desk";

function row(overrides: Partial<ApprovalRow>): ApprovalRow {
  return {
    class: { id: 1, name: "SSS1 A" },
    branch: { id: 1, name: "Main Branch" },
    class_teacher: { id: 1, name: "Amaka Nwosu" },
    subjects_in: 5,
    subjects_due: 5,
    stage: "AWAITING",
    submitted_at: null,
    published_at: null,
    held: [],
    can_decide: true,
    ...overrides,
  };
}

describe("approvals decision desk", () => {
  it("places published classes in history and every other readable class in the queue", () => {
    expect(getApprovalDeskStage(row({ stage: "PUBLISHED", can_decide: false }))).toBe("PUBLISHED");
    expect(getApprovalDeskStage(row({ stage: "AWAITING", can_decide: false }))).toBe("AWAITING");
  });

  it("keeps readable classes without counting them as the reader's decisions", () => {
    const rows = [
      row({ class: { id: 1, name: "SSS1 A" }, can_decide: true, held: [{ student: { id: 9, name: "Sade Adeyemi" }, held_by: "Ngozi Ibekwe", placed_at: "2026-10-14" }] }),
      row({ class: { id: 2, name: "SSS1 B" }, can_decide: false }),
      row({ class: { id: 3, name: "JSS1 A" }, stage: "PUBLISHED", can_decide: false }),
    ];

    const groups = groupApprovalRows(rows);

    expect(groups.AWAITING).toHaveLength(2);
    expect(groups.PUBLISHED).toHaveLength(1);
    expect(getApprovalDeskSummary(rows)).toEqual({ waitingForYou: 1, heldResults: 1, published: 1 });
  });
});

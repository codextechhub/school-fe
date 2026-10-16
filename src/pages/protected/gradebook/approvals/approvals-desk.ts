import type { ApprovalRow } from "@/redux/services/gradebook/gradebook-types";

export type ApprovalDeskStage = "AWAITING" | "PUBLISHED";

export interface ApprovalDeskSummary {
  waitingForYou: number;
  heldResults: number;
  published: number;
}

/**
 * Keeps every readable class on the two-state desk without using visibility
 * as decision authority. `can_decide` separately controls the waiting count
 * and every action that changes a class.
 */
export function getApprovalDeskStage(row: ApprovalRow): ApprovalDeskStage {
  return row.stage === "PUBLISHED" ? "PUBLISHED" : "AWAITING";
}

export function groupApprovalRows(rows: ApprovalRow[]): Record<ApprovalDeskStage, ApprovalRow[]> {
  return rows.reduce<Record<ApprovalDeskStage, ApprovalRow[]>>(
    (groups, row) => {
      groups[getApprovalDeskStage(row)].push(row);
      return groups;
    },
    { AWAITING: [], PUBLISHED: [] },
  );
}

export function getApprovalDeskSummary(rows: ApprovalRow[]): ApprovalDeskSummary {
  return {
    waitingForYou: rows.filter((row) => row.can_decide).length,
    heldResults: rows.reduce((total, row) => total + row.held.length, 0),
    published: rows.filter((row) => row.stage === "PUBLISHED").length,
  };
}

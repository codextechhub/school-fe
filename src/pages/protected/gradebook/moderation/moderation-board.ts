import type { ModerationRow } from "@/redux/services/gradebook/gradebook-types";

export type ModerationBoardStage = "WAITING" | "RETURNED" | "APPROVED";

export interface ModerationSummary {
  waitingForYou: number;
  returned: number;
  approved: number;
}

export const moderationBoardStages: Array<{
  value: ModerationBoardStage;
  title: string;
  description: string;
}> = [
  {
    value: "WAITING",
    title: "Waiting for review",
    description: "Submitted sheets that still need a decision.",
  },
  {
    value: "RETURNED",
    title: "Returned",
    description: "Sent back to the teacher for correction.",
  },
  {
    value: "APPROVED",
    title: "Approved",
    description: "Reviewed sheets that can move to compilation.",
  },
];

/**
 * Places every readable moderation row on the board without treating visibility
 * as authority. A hub reader still sees submitted sheets in Waiting, while the
 * separate `can_decide` flag controls whether they count as the reader's work.
 */
export function getModerationBoardStage(row: ModerationRow): ModerationBoardStage {
  if (row.status === "APPROVED") return "APPROVED";
  if (row.status === "RETURNED") return "RETURNED";
  return "WAITING";
}

export function groupModerationRows(rows: ModerationRow[]): Record<ModerationBoardStage, ModerationRow[]> {
  return rows.reduce<Record<ModerationBoardStage, ModerationRow[]>>(
    (groups, row) => {
      groups[getModerationBoardStage(row)].push(row);
      return groups;
    },
    { WAITING: [], RETURNED: [], APPROVED: [] },
  );
}

export function getModerationSummary(rows: ModerationRow[]): ModerationSummary {
  return {
    waitingForYou: rows.filter((row) => row.can_decide).length,
    returned: rows.filter((row) => row.status === "RETURNED").length,
    approved: rows.filter((row) => row.status === "APPROVED").length,
  };
}

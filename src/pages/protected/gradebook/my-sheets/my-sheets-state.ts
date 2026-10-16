import type { MySheet } from "@/redux/services/gradebook/gradebook-types";

export type MySheetBoardStage = "NEEDS_WORK" | "READY" | "SUBMITTED";

export interface MySheetsSummary {
  assigned: number;
  studentsRemaining: number;
  returned: number;
  submitted: number;
}

export const mySheetBoardStages: Array<{
  value: MySheetBoardStage;
  title: string;
  description: string;
}> = [
  {
    value: "NEEDS_WORK",
    title: "Needs work",
    description: "Sheets with scores still to enter or correct.",
  },
  {
    value: "READY",
    title: "Ready to submit",
    description: "Every student has a complete result.",
  },
  {
    value: "SUBMITTED",
    title: "Submitted",
    description: "Waiting for review or already approved.",
  },
];

/**
 * Places each assigned sheet in one workflow column using values already
 * returned by the teacher hub. Submission wins over the completion count so a
 * locked sheet cannot drift back into the editable columns.
 */
export function getMySheetBoardStage(sheet: MySheet): MySheetBoardStage {
  if (sheet.status === "SUBMITTED" || sheet.status === "APPROVED") return "SUBMITTED";
  if (sheet.roll > 0 && sheet.entered >= sheet.roll) return "READY";
  return "NEEDS_WORK";
}

export function groupMySheets(sheets: MySheet[]): Record<MySheetBoardStage, MySheet[]> {
  return sheets.reduce<Record<MySheetBoardStage, MySheet[]>>(
    (groups, sheet) => {
      groups[getMySheetBoardStage(sheet)].push(sheet);
      return groups;
    },
    { NEEDS_WORK: [], READY: [], SUBMITTED: [] },
  );
}

export function getMySheetsSummary(sheets: MySheet[]): MySheetsSummary {
  return {
    assigned: sheets.length,
    studentsRemaining: sheets.reduce((total, sheet) => {
      if (getMySheetBoardStage(sheet) === "SUBMITTED") return total;
      return total + Math.max(0, sheet.roll - sheet.entered);
    }, 0),
    returned: sheets.filter((sheet) => sheet.status === "RETURNED").length,
    submitted: sheets.filter((sheet) => sheet.status === "SUBMITTED" || sheet.status === "APPROVED").length,
  };
}

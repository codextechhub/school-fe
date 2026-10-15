import { describe, expect, it } from "vitest";

import type { CorrectionRow } from "@/redux/services/attendance/attendance-types";

import { correctionMatchesSearch, correctionPageSummary } from "./correction-list-state";

function row(overrides: Partial<CorrectionRow> = {}): CorrectionRow {
  return {
    id: 1,
    student: { id: 4, name: "Tunde Adeleke", student_number: "LV-204" },
    class_id: 3,
    class_name: "JSS 1B",
    branch: { id: 2, name: "Annex Branch" },
    date: "2026-10-13",
    is_mine: false,
    status: "PENDING",
    requested_by_name: "Hauwa Sanni",
    ...overrides,
  };
}

describe("attendance correction list state", () => {
  it("searches student, admission number, class and branch", () => {
    expect(correctionMatchesSearch(row(), "tunde", false)).toBe(true);
    expect(correctionMatchesSearch(row(), "lv-204", false)).toBe(true);
    expect(correctionMatchesSearch(row(), "annex", false)).toBe(true);
    expect(correctionMatchesSearch(row(), "sss 3", false)).toBe(false);
  });

  it("does not search a hidden requester name", () => {
    expect(correctionMatchesSearch(row(), "hauwa", false)).toBe(false);
    expect(correctionMatchesSearch(row(), "hauwa", true)).toBe(true);
  });

  it("summarizes decisions and ownership on the loaded page", () => {
    expect(correctionPageSummary([
      row({ status: "APPROVED", is_mine: true }),
      row({ id: 2, status: "REJECTED" }),
      row({ id: 3, status: "APPROVED" }),
    ])).toEqual({ mine: 1, approved: 2, rejected: 1 });
  });
});

import { describe, expect, it } from "vitest";

import { reportExportPath, reportFileName } from "./export-path";

describe("reportExportPath", () => {
  it("names the table and the file type, and nothing else for the current term", () => {
    expect(reportExportPath("chronic", "csv", {})).toBe(
      "/v1/attendance/reports/export/?table=chronic&export=csv",
    );
  });

  it("carries the screen's term and branch, and leaves out all branches", () => {
    expect(reportExportPath("by_class", "xlsx", { term: 44, branch: 22 })).toBe(
      "/v1/attendance/reports/export/?table=by_class&export=xlsx&term=44&branch=22",
    );
    expect(reportExportPath("not_taken", "pdf", { branch: "all" })).not.toContain("branch");
  });
});

describe("reportFileName", () => {
  it("names the table and the term", () => {
    expect(reportFileName("by_class", "pdf", "First Term 2026/2027")).toBe(
      "attendance-by-class-first-term-2026-2027.pdf",
    );
  });
});

import { describe, expect, it } from "vitest";

import type {
  ClassSeats,
  StudentRow,
} from "@/redux/services/students/students-types";

import {
  assignmentImpact,
  loadNote,
  mergeRosterRows,
} from "./class-roster-model";

function schoolClass(overrides: Partial<ClassSeats> = {}): ClassSeats {
  return {
    id: 1,
    name: "JSS1 A",
    branch: null,
    branch_name: null,
    level: 1,
    level_name: "JSS1",
    level_order: [1, 1],
    capacity: 30,
    used: 20,
    remaining: 10,
    ...overrides,
  };
}

function student(id: number): StudentRow {
  return {
    id,
    student_number: `BFS/${id}`,
    first_name: `Student ${id}`,
    middle_name: "",
    last_name: "Example",
    full_name: `Student ${id} Example`,
    status: "ACTIVE",
    status_label: "Active",
    class_name: "JSS1 A",
    level_name: "JSS1",
    primary_guardian: "",
    photo_url: "",
    enrolment_date: "2026-09-01",
    applied_on: null,
  };
}

describe("class load copy", () => {
  it("distinguishes free, full, over-capacity, and unlimited classes", () => {
    expect(loadNote(schoolClass())).toBe("10 free");
    expect(loadNote(schoolClass({ used: 30, remaining: 0 }))).toBe("Full");
    expect(loadNote(schoolClass({ used: 32, remaining: -2 }))).toBe("Over by 2");
    expect(loadNote(schoolClass({ capacity: null, remaining: null }))).toBe(
      "No limit set",
    );
  });

  it("checks the whole assignment batch against capacity", () => {
    expect(assignmentImpact(schoolClass({ used: 29, remaining: 1 }), 3)).toContain(
      "2 over capacity",
    );
    expect(assignmentImpact(schoolClass({ used: 20, remaining: 10 }), 3)).toContain(
      "10 free",
    );
  });
});

describe("roster page merging", () => {
  it("keeps page order and drops a repeated boundary row", () => {
    const merged = mergeRosterRows(
      [student(1), student(2)],
      [student(2), student(3)],
    );

    expect(merged.map((row) => row.id)).toEqual([1, 2, 3]);
  });
});

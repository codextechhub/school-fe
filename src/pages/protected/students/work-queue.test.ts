import { describe, expect, it } from "vitest";

import { buildWorkQueue } from "./work-queue";
import type {
  ClassSeats,
  StudentRow,
} from "@/redux/services/students/students-types";

const NOW = new Date("2026-09-01T12:00:00Z");

function student(over: Partial<StudentRow> & { id: number }): StudentRow {
  return {
    student_number: "",
    first_name: "A",
    middle_name: "",
    last_name: "B",
    full_name: "A B",
    status: "ENROLLED",
    status_label: "Enrolled",
    class_name: "",
    level_name: "",
    primary_guardian: "",
    photo_url: "",
    enrolment_date: null,
    applied_on: null,
    ...over,
  };
}

function seat(over: Partial<ClassSeats> & { id: number; name: string }): ClassSeats {
  return {
    branch: null,
    branch_name: null,
    level: 1,
    level_name: "JSS1",
    level_order: [1, 1],
    capacity: 30,
    used: 10,
    remaining: 20,
    ...over,
  };
}

describe("buildWorkQueue", () => {
  it("names the child rather than counting them", () => {
    const { rows } = buildWorkQueue({
      unplaced: [
        student({ id: 7, full_name: "Emeka Obi", enrolment_date: "2026-08-26" }),
      ],
      applicants: [],
      seats: [],
      now: NOW,
      timeZone: "Africa/Lagos",
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe("Emeka Obi is on the roll with no class");
    expect(rows[0].detail).toContain("enrolled 6 days ago");
    expect(rows[0].studentId).toBe(7);
  });

  it("says WHY a child is stuck when every class at their level is full", () => {
    const { rows } = buildWorkQueue({
      unplaced: [
        student({ id: 7, full_name: "Emeka Obi", level_name: "JSS1", enrolment_date: "2026-08-31" }),
      ],
      applicants: [],
      seats: [seat({ id: 1, name: "JSS1 A", used: 30, remaining: 0 })],
      now: NOW,
      timeZone: "Africa/Lagos",
    });
    expect(rows[0].detail).toContain("JSS1 A is full");
  });

  it("does not claim a child is blocked when a class has room", () => {
    const { rows } = buildWorkQueue({
      unplaced: [student({ id: 7, level_name: "JSS1", enrolment_date: "2026-08-31" })],
      applicants: [],
      seats: [seat({ id: 1, name: "JSS1 A", used: 10, remaining: 20 })],
      now: NOW,
      timeZone: "Africa/Lagos",
    });
    expect(rows[0].detail).not.toContain("full");
  });

  it("puts the longest-waiting unplaced child first", () => {
    const { rows } = buildWorkQueue({
      unplaced: [
        student({ id: 1, full_name: "Recent One", enrolment_date: "2026-08-30" }),
        student({ id: 2, full_name: "Old One", enrolment_date: "2026-07-01" }),
      ],
      applicants: [],
      seats: [],
      now: NOW,
      timeZone: "Africa/Lagos",
    });
    expect(rows[0].title).toContain("Old One");
  });

  it("names the longest-waiting applicant beside the count", () => {
    const { rows } = buildWorkQueue({
      summary: undefined,
      unplaced: [],
      applicants: [
        student({ id: 3, full_name: "Chiamaka Nwosu", applied_on: "2026-08-20" }),
        student({ id: 4, full_name: "Later Person", applied_on: "2026-08-30" }),
      ],
      seats: [],
      now: NOW,
      timeZone: "Africa/Lagos",
    });
    expect(rows[0].title).toBe("2 applications awaiting enrolment");
    expect(rows[0].detail).toBe("Longest waiting 12 days · Chiamaka Nwosu");
  });

  it("carries the over-capacity class and where the overflow can go", () => {
    const { rows } = buildWorkQueue({
      unplaced: [],
      applicants: [],
      seats: [
        seat({ id: 1, name: "JSS1 A", capacity: 35, used: 36, remaining: -1 }),
        seat({ id: 2, name: "JSS1 B", capacity: 35, used: 34, remaining: 1 }),
      ],
      now: NOW,
      timeZone: "Africa/Lagos",
    });
    expect(rows[0].title).toBe("JSS1 A is over by 1");
    expect(rows[0].detail).toBe("36 of 35 · JSS1 B has 1 place");
  });

  it("keeps a blocked child above the backlog that is not blocking anyone", () => {
    // Ranking by SIZE would put twenty applications above one stuck child.
    const { rows } = buildWorkQueue({
      summary: { applicants: 20 } as never,
      unplaced: [student({ id: 7, full_name: "Emeka Obi", enrolment_date: "2026-08-01" })],
      applicants: [],
      seats: [],
      now: NOW,
      timeZone: "Africa/Lagos",
    });
    expect(rows[0].title).toContain("Emeka Obi");
    expect(rows[1].title).toContain("20 applications");
  });

  it("caps the list and reports what it left out", () => {
    const { rows, overflow } = buildWorkQueue({
      unplaced: [1, 2, 3, 4, 5, 6].map((id) =>
        student({ id, full_name: `Child ${id}`, enrolment_date: "2026-08-01" }),
      ),
      applicants: [],
      seats: [],
      now: NOW,
      timeZone: "Africa/Lagos",
      limit: 4,
    });
    expect(rows).toHaveLength(4);
    expect(overflow).toBe(2);
  });

  it("is empty when nothing is waiting, rather than inventing a row", () => {
    const { rows, overflow } = buildWorkQueue({
      summary: { applicants: 0 } as never,
      unplaced: [],
      applicants: [],
      seats: [seat({ id: 1, name: "JSS1 A" })],
      now: NOW,
      timeZone: "Africa/Lagos",
    });
    expect(rows).toEqual([]);
    expect(overflow).toBe(0);
  });

  it("treats a class with no capacity as having room, not as full", () => {
    const { rows } = buildWorkQueue({
      unplaced: [student({ id: 7, level_name: "JSS1", enrolment_date: "2026-08-31" })],
      applicants: [],
      seats: [seat({ id: 1, name: "JSS1 A", capacity: null, used: 99, remaining: null })],
      now: NOW,
      timeZone: "Africa/Lagos",
    });
    expect(rows[0].detail).not.toContain("full");
  });
});

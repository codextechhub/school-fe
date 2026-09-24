import { describe, expect, it } from "vitest";

import { deriveSidebarWorkCounts } from "./sidebar-work-counts";

describe("sidebar work counts", () => {
  it("maps each queue total to the door that opens that queue", () => {
    expect(
      deriveSidebarWorkCounts({
        applicants: 2,
        unassignedStudents: 1,
        pendingApprovals: 8,
        invitations: 3,
        uncoveredDuties: 4,
        dutiesWithoutLead: 5,
      }),
    ).toEqual({
      applicants: 2,
      unassignedStudents: 1,
      pendingApprovals: 8,
      invitations: 3,
      teachingGaps: 9,
    });
  });

  it("omits empty queues instead of drawing zero badges", () => {
    expect(
      deriveSidebarWorkCounts({
        applicants: 0,
        unassignedStudents: 0,
        pendingApprovals: 0,
        invitations: 0,
        uncoveredDuties: 0,
        dutiesWithoutLead: 0,
      }),
    ).toEqual({
      applicants: undefined,
      unassignedStudents: undefined,
      pendingApprovals: undefined,
      invitations: undefined,
      teachingGaps: undefined,
    });
  });

  it("counts both kinds of teaching gap when only one is present", () => {
    expect(
      deriveSidebarWorkCounts({ dutiesWithoutLead: 6 }).teachingGaps,
    ).toBe(6);
  });
});

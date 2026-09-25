import { describe, expect, it } from "vitest";

import type {
  StaffListRow,
  StaffRoster,
} from "@/redux/services/staff/staff-types";
import { postingSummary, rowsForPostingView } from "./posting-model";

const person = (
  id: number,
  name: string,
  overrides: Partial<StaffListRow> = {},
): StaffListRow => ({
  id,
  user_id: id,
  full_name: name,
  email: `${id}@example.com`,
  staff_number: `STA-${id}`,
  job_title: "Teacher",
  on_roll: true,
  employment_status: "ACTIVE",
  employment_status_label: "Active",
  display_employment_status: "ACTIVE",
  display_employment_status_label: "Active",
  employment_type: "FULL_TIME",
  account_status: "ACTIVE",
  account_flag: null,
  roles: ["Teacher"],
  branch_id: 1,
  posting_branch_ids: [1],
  branch_name: "Ikeja Branch",
  posted_school_wide: false,
  teaching_load: 0,
  on_leave_today: false,
  on_leave_until: null,
  hire_date: null,
  can_resend: false,
  invited_at: null,
  ...overrides,
});

const roster: StaffRoster = {
  branch: { id: 1, name: "Ikeja Branch" },
  total: 4,
  groups: [
    {
      key: "posted_here",
      title: "Posted here",
      note: "",
      movable: true,
      change_it: "",
      rows: [person(1, "Aisha Bello"), person(2, "Daniel Okafor")],
    },
    {
      key: "reaching_here",
      title: "Reaching here",
      note: "",
      movable: false,
      change_it: "Change roles",
      rows: [
        {
          ...person(3, "Grace Eze", { job_title: "Counsellor" }),
          via_roles: [{ name: "Pastoral care", school_wide: false }],
        },
      ],
    },
    {
      key: "school_wide",
      title: "School-wide",
      note: "",
      movable: false,
      change_it: "Change posting",
      rows: [person(4, "Ibrahim Musa")],
    },
  ],
};

describe("postingSummary", () => {
  it("keeps the server total and counts each semantic group", () => {
    expect(postingSummary(roster)).toEqual({
      total: 4,
      posted: 2,
      reaching: 1,
      schoolWide: 1,
    });
  });

  it("returns zeroes before the roster arrives", () => {
    expect(postingSummary()).toEqual({
      total: 0,
      posted: 0,
      reaching: 0,
      schoolWide: 0,
    });
  });
});

describe("rowsForPostingView", () => {
  it("selects one group without mixing posting and reach", () => {
    expect(
      rowsForPostingView(roster, "posted", "").map((row) => row.person.id),
    ).toEqual([1, 2]);
    expect(rowsForPostingView(roster, "reach", "")[0].viaRoles).toEqual([
      { name: "Pastoral care", school_wide: false },
    ]);
  });

  it("searches names, staff ids, job titles, roles and reach roles", () => {
    expect(rowsForPostingView(roster, "reach", "pastoral")[0].person.id).toBe(3);
    expect(rowsForPostingView(roster, "reach", "STA-3")[0].person.id).toBe(3);
    expect(rowsForPostingView(roster, "reach", "missing")).toEqual([]);
  });
});

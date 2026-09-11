import { describe, expect, it } from "vitest";

import type {
  StaffDetail,
  StaffListRow,
} from "@/redux/services/staff/staff-types";

import {
  getStaffDirectoryHealth,
  getStaffProfileCompleteness,
} from "./profile-completeness";

const row: StaffListRow = {
  id: 18,
  user_id: 40,
  full_name: "Ngozi Okafor",
  email: "ngozi@example.com",
  staff_number: "STF/2022/018",
  job_title: "Science Teacher",
  on_roll: true,
  employment_status: "ACTIVE",
  employment_status_label: "Active",
  display_employment_status: "ACTIVE",
  display_employment_status_label: "Active",
  employment_type: "FULL_TIME",
  account_status: "ACTIVE",
  account_flag: null,
  roles: ["Teacher", "Class Adviser"],
  branch_id: null,
  branch_name: null,
  posted_school_wide: null,
  teaching_load: 6,
  on_leave_today: false,
  on_leave_until: null,
  hire_date: "2022-09-05",
  can_resend: false,
  invited_at: "2022-09-01T08:00:00Z",
};

const detail: StaffDetail = {
  ...row,
  account: {
    status: "ACTIVE",
    label: "Active",
    can_sign_in: true,
    can_hold_password: true,
    email: "ngozi@example.com",
  },
  middle_name: "Adaeze",
  date_of_birth: "1988-05-22",
  phone: "+2348035550177",
  gender: "FEMALE",
  photo_url: null,
  exit_date: null,
  tenure: { years: 4, months: 0 },
  lifecycle: {
    on_path: true,
    steps: [
      { value: "INVITED", label: "Invited" },
      { value: "ACTIVE", label: "Active" },
    ],
    current: "ACTIVE",
  },
  counts: {
    qualifications: 2,
    documents: 3,
    teaching_assignments: 6,
    leave_requests: 2,
  },
  created_by: { id: 3, name: "School Administrator" },
};

describe("staff profile completeness", () => {
  it("uses only safe list-level fields for directory health", () => {
    expect(getStaffDirectoryHealth(row)).toEqual({
      completed: 5,
      total: 5,
      gaps: 0,
      percentage: 100,
    });

    expect(
      getStaffDirectoryHealth({
        ...row,
        staff_number: "",
        job_title: "",
        roles: [],
      }),
    ).toEqual({ completed: 2, total: 5, gaps: 3, percentage: 40 });
  });

  it("reports only editable missing profile fields", () => {
    const result = getStaffProfileCompleteness({
      ...detail,
      staff_number: "",
      phone: "",
      date_of_birth: null,
    });

    expect(result.gaps.map((gap) => gap.label)).toEqual([
      "Staff ID",
      "Phone number",
      "Date of birth",
    ]);
    expect(result.completed).toBe(4);
    expect(result.percentage).toBe(57);
  });

  it("does not treat a valid school-wide posting as incomplete", () => {
    const result = getStaffProfileCompleteness(detail);

    expect(result.gaps).toEqual([]);
    expect(result.percentage).toBe(100);
  });
});

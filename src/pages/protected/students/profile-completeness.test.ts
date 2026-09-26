import { describe, expect, it } from "vitest";

import type {
  StudentDetail,
  StudentDocumentRow,
  StudentGuardianLink,
  StudentRow,
} from "@/redux/services/students/students-types";

import {
  getDirectoryRecordHealth,
  getStudentProfileCompleteness,
} from "./profile-completeness";

const row: StudentRow = {
  id: 14,
  student_number: "XVS/2026/0142",
  first_name: "Amina",
  middle_name: "Zainab",
  last_name: "Bello",
  full_name: "Amina Bello",
  status: "ACTIVE",
  status_label: "Active",
  class_name: "SS2 Gold",
  level_name: "Senior Secondary",
  primary_guardian: "Halima Bello",
  photo_url: "/media/amina.jpg",
  enrolment_date: "2024-09-09",
  applied_on: null,
};

const detail: StudentDetail = {
  ...row,
  date_of_birth: "2010-03-14",
  age: 16,
  gender: "FEMALE",
  nationality: "Nigerian",
  state_of_origin: "Kaduna",
  address: "18 Allen Avenue, Ikeja",
  phone: "+2348035550142",
  email: "amina@example.com",
  previous_school: "Bright Future College",
  blood_group: "O+",
  allergies: "None known",
  conditions: "Asthma",
  emergency_contact_name: "Musa Bello",
  emergency_contact_phone: "+2348052224421",
  session_name: "2026/27",
  applied_for: null,
  applied_for_name: "",
  allowed_transitions: [],
  history_starts: null,
  created_at: "2024-09-09T08:00:00Z",
  updated_at: "2026-09-09T14:30:00Z",
};

const guardian = {
  id: 1,
  guardian: {
    id: 2,
    full_name: "Halima Bello",
    phone: "+2348035550148",
    email: "halima@example.com",
    occupation: "Engineer",
    address: "18 Allen Avenue, Ikeja",
    has_account: true,
    name_needs_review: false,
    photo_url: "",
  },
  relationship: "MOTHER",
  relationship_label: "Mother",
  is_primary: true,
  siblings: [],
} satisfies StudentGuardianLink;

const documents = [
  {
    document_type: "BIRTH_CERTIFICATE",
    label: "Birth certificate",
    required: true,
    attached: true,
    uploaded_at: "2024-09-09T08:00:00Z",
    id: 3,
    url: "/media/birth-certificate.pdf",
  },
  {
    document_type: "IMMUNISATION",
    label: "Immunisation record",
    required: true,
    attached: false,
    uploaded_at: null,
    id: null,
    url: "",
  },
] satisfies StudentDocumentRow[];

describe("student profile completeness", () => {
  it("measures only safe list-level fields in the directory", () => {
    expect(getDirectoryRecordHealth(row)).toEqual({
      completed: 4,
      total: 4,
      percentage: 100,
      gaps: 0,
    });

    expect(
      getDirectoryRecordHealth({
        ...row,
        student_number: "",
        class_name: "",
        primary_guardian: "",
      }),
    ).toEqual({ completed: 1, total: 4, percentage: 25, gaps: 3 });
  });

  it("includes missing editable fields, guardians, and required documents", () => {
    const result = getStudentProfileCompleteness({
      student: { ...detail, phone: "", email: "" },
      guardians: [guardian],
      documents,
    });

    expect(result.gaps.map((gap) => gap.label)).toEqual([
      "Student phone",
      "Student email",
      "Immunisation record",
    ]);
    expect(result.completed).toBe(result.total - 3);
  });

  it("does not score medical fields hidden by field-level permissions", () => {
    const restricted = { ...detail };
    delete restricted.blood_group;
    delete restricted.allergies;
    delete restricted.conditions;

    const result = getStudentProfileCompleteness({ student: restricted });

    expect(result.total).toBe(14);
    expect(result.gaps).toEqual([]);
    expect(result.percentage).toBe(100);
  });

  it("scores each medical field on its own, so one hidden field drops only itself", () => {
    const restricted = { ...detail, conditions: "" };
    delete restricted.allergies;

    const result = getStudentProfileCompleteness({ student: restricted });

    expect(result.total).toBe(16);
    expect(result.gaps.map((gap) => gap.label)).toEqual(["Medical conditions"]);
  });

  it("does not report unloaded supporting data as missing", () => {
    const result = getStudentProfileCompleteness({ student: detail });

    expect(result.gaps).toEqual([]);
    expect(result.total).toBe(17);
  });
});

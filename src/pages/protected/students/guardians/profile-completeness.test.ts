import { describe, expect, it } from "vitest";

import type { GuardianDetail } from "@/redux/services/students/students-types";

import { getGuardianProfileCompleteness } from "./profile-completeness";

const guardian: GuardianDetail = {
  id: 11,
  full_name: "Adaeze Nwankwo",
  phone: "+2348035550142",
  email: "adaeze.nwankwo@example.com",
  occupation: "Civil Engineer",
  address: "14 Palm Avenue, Ikeja",
  has_account: true,
  photo_url: "",
  wards: [],
};

describe("guardian profile completeness", () => {
  it("reports editable contact gaps", () => {
    const result = getGuardianProfileCompleteness({
      ...guardian,
      email: "",
      occupation: "",
    });

    expect(result.gaps.map((gap) => gap.label)).toEqual([
      "Email address",
      "Occupation",
    ]);
    expect(result).toMatchObject({ completed: 3, total: 5, percentage: 60 });
  });

  it("leaves out a field the viewer may not read, rather than calling it missing", () => {
    const restricted: GuardianDetail = { ...guardian, email: "" };
    delete restricted.phone;

    const result = getGuardianProfileCompleteness(restricted);

    expect(result.gaps.map((gap) => gap.label)).toEqual(["Email address"]);
    expect(result).toMatchObject({ completed: 3, total: 4, percentage: 75 });
  });

  it("reports a complete contact record", () => {
    expect(getGuardianProfileCompleteness(guardian)).toEqual({
      completed: 5,
      total: 5,
      gaps: [],
      percentage: 100,
    });
  });
});

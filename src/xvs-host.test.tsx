import { describe, expect, it, vi } from "vitest";

// The staff directory query is the only thing useDirectory reaches for, so it
// is the one thing to control. A single row carrying two different ids is the
// whole point: `id` is the employment record, `user_id` is the account, and
// which one the host publishes decides whether a name ever resolves.
const staffRow = {
  id: 51,
  user_id: 145,
  full_name: "Ngozi Eze",
  email: "ngozi@holy-cross.example.com",
  account_status: "ACTIVE",
  roles: ["Finance Admin", "School Admin"],
};

vi.mock("@/redux/services/roles/roles-api", () => ({
  useGetSchoolRolesQuery: () => ({ data: undefined, isLoading: false, isError: false }),
}));
vi.mock("@/redux/services/branches/branches-api", () => ({
  useGetMyBranchesQuery: () => ({ data: undefined, isLoading: false, isError: false }),
}));
vi.mock("@/redux/services/staff/staff-api", () => ({
  useGetStaffListQuery: () => ({
    data: { data: [staffRow] },
    isLoading: false,
    isError: false,
  }),
}));

import { useDirectory } from "./xvs-host";

describe("the directory the workflow screens look names up in", () => {
  it("publishes the ACCOUNT id, because that is what the workflow API names", () => {
    // requested_by, the approver lists and the approver-group endpoint all speak
    // account ids. Publishing the staff record's own id (51 here) means every
    // lookup misses and the approval screen falls back to "User 145" - and would
    // add the wrong person to an approver group if the sequences ever overlapped.
    const person = useDirectory().data?.[0];

    expect(person?.id).toBe("145");
    expect(person?.id).not.toBe("51");
  });

  it("stringifies the id, so a Map keyed by string cannot silently miss", () => {
    expect(useDirectory().data?.[0]?.id).toBe("145");
    expect(typeof useDirectory().data?.[0]?.id).toBe("string");
  });

  it("shows one role beside the name, from a person who may hold several", () => {
    expect(useDirectory().data?.[0]?.role).toBe("Finance Admin");
  });
});

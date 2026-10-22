import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The directory every shared staff picker reads: the claimant of an expense
 * claim, a payroll roster row's staff member, an approver.
 *
 * Ngozi, Lagoon View's finance admin, may raise claims and may not open the
 * staff directory. The host reads the names-only list, which answers to the
 * picker keys, so her claimant picker lists Tolu Fashola by account id and
 * name. A reader holding no picker key is not asked at all.
 */
const host = vi.hoisted(() => ({
  permissions: ["finance.expenseclaim.create"] as string[],
  asked: [] as Array<{ skip?: boolean }>,
}));

vi.mock("@/redux/services/roles/roles-api", () => ({
  useGetSchoolRolesQuery: () => ({ data: undefined, isLoading: false, isError: false }),
}));
vi.mock("@/redux/services/branches/branches-api", () => ({
  useGetMyBranchesQuery: () => ({ data: undefined, isLoading: false, isError: false }),
}));
vi.mock("@/redux/services/staff/staff-api", () => ({
  useGetStaffNamesQuery: (_args: unknown, options: { skip?: boolean }) => {
    host.asked.push(options);
    return options.skip
      ? { data: undefined, isLoading: false, isError: false }
      : { data: { data: [{ id: 213, name: "Tolu Fashola" }] }, isLoading: false, isError: false };
  },
}));
vi.mock("@/redux/features/auth/auth-slice", () => ({
  selectPermissions: (state: { permissions: string[] }) => state.permissions,
  selectFieldAccess: () => ({}),
  selectBranchReach: () => null,
  selectUser: () => null,
}));
vi.mock("@/redux/store", () => ({
  useAppSelector: (select: (state: unknown) => unknown) => select({ permissions: host.permissions }),
  useAppDispatch: () => vi.fn(),
}));

import { useDirectory } from "./xvs-host";

beforeEach(() => {
  host.permissions = ["finance.expenseclaim.create"];
  host.asked = [];
});

describe("the directory the staff pickers read", () => {
  it("publishes the ACCOUNT id as a string, with the name and nothing else", () => {
    const person = useDirectory().data?.[0];

    expect(person).toEqual({ id: "213", full_name: "Tolu Fashola", email: "", role: "", status: "ACTIVE" });
    expect(typeof person?.id).toBe("string");
  });

  it.each(["finance.salary.update", "workflow.template.update", "workflow.approvers.assign"])(
    "is read for a reader holding %s",
    (key) => {
      host.permissions = [key];
      expect(useDirectory().data).toHaveLength(1);
    },
  );

  it("is not asked for by a reader holding no picker key", () => {
    host.permissions = ["finance.expenseclaim.view", "school.students.view"];
    expect(useDirectory()).toEqual({ data: [], isLoading: false, isError: false });
    expect(host.asked.at(-1)).toEqual({ skip: true });
  });
});

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Giving a role from its own screen names the branch the grant reaches.
 *
 * Lagoon View runs Ikeja (1) and Lekki (2). Mrs Bello works at Lekki only.
 * Giving Ada the school-wide Teacher role from her screen grants it at Lekki,
 * because the whole school is not hers to hand out. A role configured for
 * Lekki grants its own branches, so no branch is named. A role reaching Ikeja
 * is not hers to give, and the panel says so instead of offering it.
 */
const assign = vi.fn();
vi.mock("@/redux/services/roles/roles-api", () => ({
  useAssignRoleMutation: () => [assign, { isLoading: false }],
  isPendingGrant: () => false,
}));
vi.mock("@/redux/services/staff/staff-api", () => ({
  useGetStaffListQuery: () => ({
    isLoading: false,
    data: {
      data: [
        { id: 10, user_id: 70, full_name: "Ada Obi", email: "ada@example.com", job_title: "Teacher", on_roll: true, can_manage: true },
        { id: 11, user_id: 71, full_name: "Tunde Bello", email: "tunde@example.com", job_title: "Bursar", on_roll: true, can_manage: false },
      ],
    },
  }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }));

const LEKKI = { id: 2, name: "Lekki Branch" };
const BELLO = {
  wholeSchool: false,
  branches: [LEKKI],
  soleBranch: LEKKI as typeof LEKKI | null,
  covers: (ids: number[]) => ids.length > 0 && ids.every((id) => id === 2),
};
let reader = BELLO;
vi.mock("@/hooks/use-reader-reach", () => ({ useReaderReach: () => reader }));

const { AssignRolePanel } = await import("./assign-role-panel");

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("AssignRolePanel", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    reader = BELLO;
    assign.mockReset();
    assign.mockReturnValue({ unwrap: () => Promise.resolve({ data: {} }) });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  const render = (roleBranchIds: number[]) =>
    act(async () =>
      root.render(
        <AssignRolePanel roleId={5} roleName="Teacher" roleBranchIds={roleBranchIds} heldBy={[]} onAssigned={vi.fn()} />,
      ),
    );
  const button = (label: string) =>
    [...container.querySelectorAll("button")].find((element) => element.textContent?.includes(label));
  const openAndGive = async () => {
    await act(async () => button("Give this role to somebody")!.click());
    await act(async () => button("Give")!.click());
  };

  it("grants a school-wide role at the one branch a branch reader works in", async () => {
    await render([]);
    await openAndGive();
    expect(assign).toHaveBeenCalledWith({ user: 70, role: 5, branch: 2 });
  });

  it("grants a role configured for the reader's branch without naming one", async () => {
    await render([2]);
    await openAndGive();
    expect(assign).toHaveBeenCalledWith({ user: 70, role: 5, branch: null });
  });

  it("keeps a whole-school reader's grant of a school-wide role school-wide", async () => {
    reader = { wholeSchool: true, branches: [LEKKI], soleBranch: null, covers: () => true };
    await render([]);
    await openAndGive();
    expect(assign).toHaveBeenCalledWith({ user: 70, role: 5, branch: null });
  });

  it("does not offer a role reaching past the reader, nor a person working beyond her branch", async () => {
    await render([1, 2]);
    expect(button("Give this role to somebody")).toBeUndefined();
    expect(container.textContent).toContain("This role reaches branches you do not work in");

    await render([]);
    await act(async () => button("Give this role to somebody")!.click());
    expect(container.textContent).toContain("Works beyond your branch");
    expect([...container.querySelectorAll("button")].filter((b) => b.textContent === "Give")).toHaveLength(1);
  });
});

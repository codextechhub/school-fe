import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The role directory tells a failed load apart from a school with no roles.
 *
 * Bright Star School's administrator opens Roles & Permissions while the server
 * is struggling. She sees that the list could not load and a Try again button,
 * not "No school roles are available", which would send her off to recreate
 * the Bursar and Registrar roles the school already has. When the list does
 * load and a group is genuinely empty, the empty message still shows.
 *
 * The API hooks return whatever each test puts in `rolesQuery`, and the table
 * is a plain list of role names, so the page's own branching is what runs.
 */
const navigate = vi.fn();
vi.mock("react-router", () => ({ useNavigate: () => navigate }));
vi.mock("@/components/layout/page-shell", () => ({
  PageShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock("@/components/custom/page-access-denied", () => ({ default: () => <p>Access denied</p> }));
vi.mock("@/components/custom/permission-gate", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/custom/custom-table", () => ({
  default: ({ tableBodyList }: { tableBodyList: { role: ReactNode }[] }) => (
    <ul>{tableBodyList.map((row, index) => <li key={index}>{row.role}</li>)}</ul>
  ),
}));
vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({ hasPermission: () => true }),
}));
vi.mock("@/redux/services/branches/branches-api", () => ({
  useGetAllMyBranchesQuery: () => ({ data: [] }),
}));

type RolesQuery = {
  data?: unknown[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
};
let rolesQuery: RolesQuery;
vi.mock("@/redux/services/roles/roles-api", () => ({
  useGetFieldAccessRolesQuery: () => rolesQuery,
}));

const { default: Roles } = await import("./index");

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const role = (key: string, name: string, system: boolean) => ({
  key,
  name,
  is_system_role: system,
  assigned_users_count: 1,
  permissions_count: 4,
  branch_ids: [],
  branch: null,
  status: "ACTIVE",
});

describe("Roles directory", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  const render = () => act(async () => root.render(<Roles />));
  const button = (label: string) =>
    [...container.querySelectorAll("button")].find((element) => element.textContent?.includes(label));

  it("shows a retry, not an empty directory, when the roles fail to load", async () => {
    const refetch = vi.fn();
    rolesQuery = { data: undefined, isLoading: false, isError: true, refetch };
    await render();

    expect(container.textContent).toContain("We could not load your roles");
    expect(container.textContent).not.toContain("No school roles are available.");
    await act(async () => button("Try again")!.click());
    expect(refetch).toHaveBeenCalledOnce();
  });

  it("keeps the empty message for a group that is genuinely empty", async () => {
    rolesQuery = {
      data: [role("bursar", "Bursar", true)],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
    await render();

    expect(container.textContent).toContain("Bursar");
    expect(container.textContent).toContain("No custom roles yet.");
    expect(container.textContent).not.toContain("We could not load your roles");
  });

  it("opens the Create Role form from Create role", async () => {
    rolesQuery = { data: [], isLoading: false, isError: false, refetch: vi.fn() };
    await render();

    await act(async () => button("Create role")!.click());
    expect(navigate).toHaveBeenCalledWith("/roles/new");
  });
});

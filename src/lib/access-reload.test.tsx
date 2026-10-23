import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, useNavigate } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  accessDiffers,
  markAccessChanged,
  reloadAfterAccessChange,
  takeAccessReloadNotice,
  useReloadOnNextMove,
  type AccessSnapshot,
} from "./access-reload";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * The app reloads when somebody's access changes, and only then.
 *
 * Lagoon View's bursar, Ngozi, holds Finance Admin at the Ikeja branch. Her
 * open tab re-reads her access every minute. The same permissions in another
 * order are not a change and must not reload her; one permission fewer, a
 * field newly hidden, or a branch added to her reach are, and must.
 */
const NGOZI: AccessSnapshot = {
  permissions: ["finance.invoice.view", "finance.invoice.create"],
  field_access: { "staff.bank_details": { hidden: ["account_number"], read_only: [] } },
  branch_reach: { whole_tenant: false, branch_ids: [1] },
};

describe("accessDiffers", () => {
  it("treats the same access in another order as unchanged", () => {
    expect(accessDiffers(NGOZI, {
      permissions: ["finance.invoice.create", "finance.invoice.view"],
      field_access: { "staff.bank_details": { read_only: [], hidden: ["account_number"] } },
      branch_reach: { whole_tenant: false, branch_ids: [1] },
    })).toBe(false);
  });

  it("treats an empty field list and an absent one as the same", () => {
    expect(accessDiffers(
      { ...NGOZI, field_access: { "staff.bank_details": { hidden: ["account_number"] } } },
      NGOZI,
    )).toBe(false);
  });

  it("sees a permission taken away", () => {
    expect(accessDiffers(NGOZI, { ...NGOZI, permissions: ["finance.invoice.view"] })).toBe(true);
  });

  it("sees a field hidden on a resource that had no rule", () => {
    expect(accessDiffers(NGOZI, {
      ...NGOZI,
      field_access: { ...NGOZI.field_access, "students.contact": { hidden: ["phone"] } },
    })).toBe(true);
  });

  it("sees a branch added to the reach, and the whole school granted", () => {
    expect(accessDiffers(NGOZI, { ...NGOZI, branch_reach: { whole_tenant: false, branch_ids: [1, 2] } })).toBe(true);
    expect(accessDiffers(NGOZI, { ...NGOZI, branch_reach: { whole_tenant: true, branch_ids: [] } })).toBe(true);
  });
});

describe("reload notice", () => {
  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("carries the message across the reload and shows it once", () => {
    const reload = vi.fn();
    vi.spyOn(window, "location", "get").mockReturnValue({ ...window.location, reload } as Location);

    reloadAfterAccessChange({ kind: "info", message: "Your access was changed." });

    expect(reload).toHaveBeenCalled();
    expect(takeAccessReloadNotice()).toEqual({ kind: "info", message: "Your access was changed." });
    expect(takeAccessReloadNotice()).toBeNull();
  });
});

/**
 * The reload waits for the person's next move to another page.
 *
 * Ngozi is filling in a payment voucher when her Finance Admin role is taken
 * away. Nothing reloads while she stays on the voucher; the moment she opens
 * another page, the app reloads there, built from her new access. Moving
 * between pages with no change pending never reloads.
 */
describe("useReloadOnNextMove", () => {
  afterEach(() => vi.restoreAllMocks());

  function Workspace() {
    useReloadOnNextMove();
    const navigate = useNavigate();
    return (
      <>
        <button type="button" id="students" onClick={() => navigate("/students")}>Students</button>
        <button type="button" id="staff" onClick={() => navigate("/staff")}>Staff</button>
      </>
    );
  }

  it("reloads at the next page move after a change, and not before", async () => {
    const reload = vi.fn();
    vi.spyOn(window, "location", "get").mockReturnValue({ ...window.location, reload } as Location);
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => root.render(<MemoryRouter initialEntries={["/finance/vouchers"]}><Workspace /></MemoryRouter>));

    await act(async () => container.querySelector<HTMLButtonElement>("#students")!.click());
    expect(reload).not.toHaveBeenCalled();

    markAccessChanged();
    expect(reload).not.toHaveBeenCalled();

    await act(async () => container.querySelector<HTMLButtonElement>("#staff")!.click());
    expect(reload).toHaveBeenCalledTimes(1);
    expect(takeAccessReloadNotice()?.message).toBe("Your access was changed, so XVS reloaded to match it.");

    await act(async () => root.unmount());
  });
});

/**
 * Every endpoint that changes access re-reads the signed-in person's own.
 *
 * Found by address rather than by a list of names, so a new endpoint that
 * grants a role or edits field access cannot be added without it. Without the
 * re-read, an administrator who changed their own access would keep the old
 * menus for up to a minute.
 */
const SERVICES = join(__dirname, "..", "redux", "services");
const ACCESS_ADDRESS = /role-assignments|field-access|roles\/bulk|\$\{scope\(\)\}\/roles\//;

function mutationBlocks(text: string) {
  const starts = [...text.matchAll(/^ {4}(\w+): builder\.(query|mutation)/gm)];
  return starts.map((match, index) => ({
    name: match[1],
    kind: match[2],
    body: text.slice(match.index, starts[index + 1]?.index ?? text.length),
  }));
}

describe("access-changing endpoints", () => {
  it("re-read the signed-in person's access after every change", () => {
    const blocks = readdirSync(SERVICES, { recursive: true })
      .map(String)
      .filter((path) => /-api\.ts$/.test(path))
      .flatMap((path) => mutationBlocks(readFileSync(join(SERVICES, path), "utf8")))
      .filter((block) => block.kind === "mutation" && ACCESS_ADDRESS.test(block.body));

    expect(blocks.map((block) => block.name)).toEqual(expect.arrayContaining([
      "assignRole",
      "revokeRoleAssignment",
      "updateSchoolRole",
      "updateRoleFieldAccess",
      "grantStaffRoleInBulk",
    ]));
    expect(blocks.filter((block) => !block.body.includes("onQueryStarted: recheckOwnAccess")).map((block) => block.name)).toEqual([]);
  });
});

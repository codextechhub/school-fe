import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FieldAccessMap } from "@/components/finance-ui";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import type { HoldRow, HoldsArgs, HoldsPage } from "@/redux/services/gradebook/gradebook-types";

/**
 * The fee holds list asks Field Access and the holds keys what to show and
 * offer.
 *
 * Mrs Ngozi Ibekwe is bursar at Lagoon View. Zainab Afolabi's family owes
 * ₦125,000 and her result is held; Tunde Bello owes nothing. The balance
 * switch removes the finance facts and the "needs attention" view with them,
 * because filtering on a balance would tell the reader who owes. A role that
 * may not write the reason cannot hold, and still lifts without a note.
 */
let fieldAccess: FieldAccessMap = {};
let manages = true;

vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({
    fieldAccess,
    hasPermission: () => manages,
    hasAnyPermission: () => manages,
    hasAllPermissions: () => true,
    hasModuleAccess: () => true,
  }),
}));
vi.mock("@/hooks/use-branch-lens", () => ({ useBranchLens: () => ({ branch: "all", applies: false, label: "" }) }));
vi.mock("@/components/layout/page-shell", () => ({
  PageShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));

const zainab: HoldRow = {
  student: { id: 373, name: "Zainab Afolabi", admission_number: "LV/0373" },
  class: { id: 82, name: "JSS1 A" },
  branch: null,
  balance: 12_500_000,
  oldest_unpaid_on: "2026-09-01",
  days_owed: 44,
  hold: { id: 1, reason: "Two terms unpaid.", placed_by: "Ngozi Ibekwe", placed_at: "2026-10-14T10:00:00Z" },
  released: false,
  released_on: null,
};
const tunde: HoldRow = { ...zainab, student: { id: 374, name: "Tunde Bello", admission_number: "LV/0374" }, balance: 0, oldest_unpaid_on: null, days_owed: null, hold: null };
let page: HoldsPage;
const asked: (HoldsArgs | void)[] = [];
const lift = vi.fn();

vi.mock("@/redux/services/gradebook/gradebook-api", () => ({
  useGetHoldsQuery: (args: HoldsArgs | void) => {
    asked.push(args);
    return { data: page, isLoading: false, isFetching: false, isError: false, refetch: vi.fn() };
  },
  usePlaceHoldMutation: () => [vi.fn(), { isLoading: false }],
  useLiftHoldMutation: () => [lift, { isLoading: false }],
}));

import FeeHoldsPage from "./index";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  fieldAccess = {};
  manages = true;
  asked.length = 0;
  lift.mockReset();
  lift.mockResolvedValue({ data: { data: { released: false } } });
  page = {
    success: true,
    message: "",
    pagination: { currentPage: 1, pageSize: 25, totalItems: 2, totalPages: 1, next: null, previous: null },
    data: [zainab, tunde],
    term: { id: 44, name: "First Term" },
    classes: [{ id: 82, name: "JSS1 A" }],
    as_of: "2026-10-15T10:00:00Z",
    finance_available: true,
  };
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const holdAccess = (hidden: string[], readOnly: string[]) => {
  fieldAccess = { [FIELD_RESOURCE.GRADEBOOK_HOLD]: { hidden, read_only: readOnly, open_on_create: [] } };
};
const labels = () => Array.from(document.body.querySelectorAll("button")).map((b) => b.textContent);
const render = () => act(() => root.render(<MemoryRouter><FeeHoldsPage /></MemoryRouter>));
const selectStudent = async (name: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) => candidate.textContent?.includes(name));
  expect(button).toBeDefined();
  await act(async () => button!.click());
};

describe("fee holds Field Access", () => {
  it("shows the balances, opens on the families who owe, and offers hold and lift", () => {
    render();
    expect(container.textContent).toContain("Balance from Finance");
    expect(container.textContent).toContain("Oldest unpaid");
    expect(container.textContent).toContain("Outstanding shown");
    expect(container.textContent).toContain("₦125,000.00");
    expect(container.textContent).toContain("Two terms unpaid.");
    expect(container.textContent).toContain("44 days overdue");
    expect(asked.at(-1)).toMatchObject({ owes: true });
    expect(labels()).toContain("Lift hold");
  });

  it("focuses the selected student and slides to the whole roll", async () => {
    render();
    await selectStudent("Tunde Bello");
    expect(labels()).toContain("Hold result");
    expect(container.textContent).toContain("No hold is active");

    const wholeRoll = Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Whole roll")!;
    await act(async () => wholeRoll.click());
    expect(wholeRoll.getAttribute("aria-pressed")).toBe("true");
    expect(asked.at(-1)).toMatchObject({ owes: false, page: 1 });
  });

  it("opens the hold drawer from the focused student", async () => {
    render();
    await selectStudent("Tunde Bello");
    const holdButton = Array.from(document.body.querySelectorAll("button")).find((button) => button.textContent === "Hold result")!;
    await act(async () => holdButton.click());
    expect(document.body.textContent).toContain("Hold Tunde Bello's result");
    expect(document.body.textContent).toContain("Reason for the hold");
    expect(document.body.querySelector("textarea")).not.toBeNull();
  });

  it("drops the balances and the owes filter when the balance is hidden", () => {
    holdAccess(["balance", "oldest_unpaid_on", "days_owed"], []);
    page = { ...page, data: page.data.map(({ balance: _b, oldest_unpaid_on: _o, days_owed: _d, ...row }) => row), as_of: undefined, finance_available: undefined };
    render();
    expect(container.textContent).not.toContain("Balance from Finance");
    expect(container.textContent).not.toContain("Oldest unpaid");
    expect(container.textContent).not.toContain("Outstanding shown");
    expect(container.textContent).not.toContain("Families owing");
    expect(container.querySelector('[aria-label="Fee hold list"]')).toBeNull();
    expect(labels()).not.toContain("Refresh Finance");
    expect(asked.at(-1)).toMatchObject({ owes: false });
    expect(container.textContent).not.toContain("as of");
  });

  it("withholds Hold result when the reason may not be written, and lifts without a note", async () => {
    holdAccess([], ["reason", "lift_note"]);
    render();
    await selectStudent("Tunde Bello");
    expect(labels()).not.toContain("Hold result");
    await selectStudent("Zainab Afolabi");
    const liftButton = Array.from(document.body.querySelectorAll("button")).find((b) => b.textContent === "Lift hold")!;
    await act(async () => liftButton.click());
    expect(document.body.querySelector("textarea")).toBeNull();
    const confirm = Array.from(document.body.querySelectorAll("button")).find((b) => b.textContent === "Lift the hold")!;
    await act(async () => confirm.click());
    expect(lift).toHaveBeenCalledWith({ holdId: 1 });
  });

  it("drops the reason when it is hidden but still says who held the result", () => {
    holdAccess(["reason", "lift_note"], []);
    page = { ...page, data: [{ ...zainab, hold: { id: 1, placed_by: "Ngozi Ibekwe", placed_at: zainab.hold!.placed_at } }] };
    render();
    expect(container.textContent).not.toContain("Two terms unpaid.");
    expect(container.textContent).toContain("by Ngozi Ibekwe");
  });

  it("reads only, with no hold action, for a role with the view key alone", () => {
    manages = false;
    render();
    expect(labels()).not.toContain("Lift hold");
    expect(labels()).not.toContain("Hold result");
  });

  it("says when a bill falls due while it is not yet overdue", () => {
    page = { ...page, data: [{ ...tunde, balance: 1_868_750, oldest_unpaid_on: "2026-11-15", days_owed: 0 }] };
    render();
    expect(container.textContent).toContain("₦18,687.50");
    expect(container.textContent).toMatch(/Due .*2026/);
  });

  it("keeps a released result read only", () => {
    page = { ...page, data: [{ ...tunde, released: true, released_on: "2026-10-14T10:00:00Z" }] };
    render();
    expect(container.textContent).toContain("a released result cannot be held");
    expect(labels()).not.toContain("Hold result");
  });

  it("says when Finance cannot answer, rather than showing zero", () => {
    page = { ...page, finance_available: false, data: page.data.map((row) => ({ ...row, balance: null, oldest_unpaid_on: null, days_owed: null })) };
    render();
    expect(container.textContent).toContain("Finance cannot answer right now");
    expect(container.textContent).not.toContain("₦0.00");
  });
});

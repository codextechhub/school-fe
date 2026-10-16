import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FieldAccessMap } from "@/components/finance-ui";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import type { ModerationRow } from "@/redux/services/gradebook/gradebook-types";

/**
 * The moderation queue asks Field Access what to show and offer.
 *
 * Mr Oluwaseun Bakare heads Sciences at Lagoon View, and SSS1 B Mathematics
 * waits for him. The class figures (average, highest and lowest, pass rate)
 * follow the class-figures switch, and returning a sheet needs Write on the
 * return note, because a return without a note is refused. Approving needs
 * neither, so it stays whatever the switches say.
 */
let fieldAccess: FieldAccessMap = {};

vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({
    fieldAccess,
    hasPermission: () => true,
    hasAnyPermission: () => true,
    hasAllPermissions: () => true,
    hasModuleAccess: () => true,
  }),
}));
vi.mock("@/hooks/use-branch-lens", () => ({ useBranchLens: () => ({ branch: "all", applies: false, label: "" }) }));
vi.mock("@/components/layout/page-shell", () => ({
  PageShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));

const waiting: ModerationRow = {
  class: { id: 87, name: "SSS1 B" },
  subject: { id: 41, name: "Mathematics" },
  branch: { id: 23, name: "Annex" },
  main_teacher: { id: 151, name: "Kayode Adeniyi" },
  marked: 25,
  roll: 25,
  class_average: "56.40",
  highest: 78,
  lowest: 39,
  pass_rate: 96,
  status: "SUBMITTED",
  compare: ["SSS1 A"],
  can_decide: true,
};
let rows: ModerationRow[] = [waiting];

vi.mock("@/redux/services/gradebook/gradebook-api", () => ({
  useGetModerationQueueQuery: () => ({
    data: { data: { branch_dimension: true, sheets: rows } },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useApproveSheetMutation: () => [vi.fn(), { isLoading: false }],
  useReturnSheetMutation: () => [vi.fn(), { isLoading: false }],
}));

import ModerationQueue from "./index";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  root = createRoot(container);
  fieldAccess = {};
  rows = [waiting];
});

afterEach(() => act(() => root.unmount()));

const render = () => act(() => root.render(<MemoryRouter><ModerationQueue /></MemoryRouter>));
const labels = () => Array.from(container.querySelectorAll("button, a")).map((b) => b.textContent);

describe("moderation Field Access", () => {
  it("shows the class figures and offers Return and Approve to the head", () => {
    render();
    expect(container.textContent).toContain("56.40%");
    expect(container.textContent).toContain("Compared with SSS1 A, which offers the same subject.");
    expect(container.querySelector('[role="button"][aria-label="Open Mathematics for SSS1 B"]')).not.toBeNull();
    expect(labels()).toEqual(expect.arrayContaining(["Return with a note", "Approve"]));
  });

  it("drops the class figures when they are hidden", () => {
    fieldAccess = {
      [FIELD_RESOURCE.GRADEBOOK_SHEET]: {
        hidden: ["class_average", "highest", "lowest", "pass_rate"],
        read_only: [],
        open_on_create: [],
      },
    };
    rows = [{ ...waiting, class_average: undefined, highest: undefined, lowest: undefined, pass_rate: undefined }];
    render();
    expect(container.textContent).not.toContain("Class average");
    expect(labels()).toContain("Approve");
  });

  it("withholds Return, but not Approve, when the note may not be written", () => {
    fieldAccess = { [FIELD_RESOURCE.GRADEBOOK_SHEET]: { hidden: [], read_only: ["note"], open_on_create: [] } };
    render();
    expect(labels()).not.toContain("Return with a note");
    expect(labels()).toContain("Approve");
  });

  it("offers no decision on a sheet the reader may only read", () => {
    rows = [{ ...waiting, can_decide: false, status: "APPROVED" }];
    render();
    expect(labels()).not.toContain("Approve");
    expect(container.textContent).toContain("Nothing is waiting for your decision");
  });
});

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FieldAccessPayload } from "@/redux/features/auth/auth-types";
import type { SchoolBranch } from "@/redux/services/branches/branches-types";

const mocks = vi.hoisted(() => ({
  fieldAccess: {} as FieldAccessPayload,
  list: [] as unknown[],
  detail: undefined as unknown,
}));

vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({ fieldAccess: mocks.fieldAccess }),
}));

vi.mock("@/hooks/use-school-display", () => ({
  useSchoolDisplay: () => ({ formatDate: (value: string) => value }),
}));

vi.mock("@/redux/services/branches/branches-api", () => ({
  useGetMyBranchesQuery: () => ({
    data: { data: mocks.list },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useGetMyBranchQuery: () => ({
    data: mocks.detail ? { data: mocks.detail } : undefined,
    isLoading: false,
    isError: false,
  }),
}));

import Branches from "./index";
import { BranchDrawer } from "./branch-drawer";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const IKEJA: SchoolBranch = {
  id: 1,
  code: 1,
  name: "Ikeja Branch",
  is_main: true,
  status: "ACTIVE",
  address: "12 Allen Avenue",
  email: "ikeja@bright-star.example",
  state: "Lagos",
  country: "Nigeria",
  opened_at: "2024-09-01",
  students_count: null,
  teachers_count: null,
  classes_count: 4,
};
const LEKKI: SchoolBranch = {
  ...IKEJA,
  id: 2,
  code: 2,
  name: "Lekki Branch",
  is_main: false,
  address: "5 Admiralty Way",
  email: "lekki@bright-star.example",
};

function without(branch: SchoolBranch, ...keys: Array<keyof SchoolBranch>): SchoolBranch {
  const copy = { ...branch } as Record<string, unknown>;
  for (const key of keys) delete copy[key];
  return copy as unknown as SchoolBranch;
}

const HIDDEN_ADDRESS_AND_EMAIL: FieldAccessPayload = {
  "school.branches": { hidden: ["address", "email"], read_only: ["address", "email"], open_on_create: [] },
};
const READ_ONLY_ALWAYS: FieldAccessPayload = {
  "school.branches": { hidden: [], read_only: ["address", "email"], open_on_create: [] },
};

describe("branch list Field Access", () => {
  beforeEach(() => {
    mocks.fieldAccess = {};
    mocks.list = [IKEJA, LEKKI];
  });

  const render = () => new DOMParser().parseFromString(
    renderToStaticMarkup(<MemoryRouter><Branches /></MemoryRouter>),
    "text/html",
  );

  it("shows each branch's name and full address to a role that may read it", () => {
    const text = render().body.textContent ?? "";

    expect(text).toContain("Ikeja Branch");
    expect(text).toContain("12 Allen Avenue, Lagos, Nigeria");
    expect(text).toContain("5 Admiralty Way, Lagos, Nigeria");
  });

  it("drops the street address but keeps the name, state and country when it is hidden", () => {
    mocks.fieldAccess = HIDDEN_ADDRESS_AND_EMAIL;
    mocks.list = [without(IKEJA, "address", "email"), without(LEKKI, "address", "email")];
    const text = render().body.textContent ?? "";

    expect(text).toContain("Ikeja Branch");
    expect(text).toContain("Lekki Branch");
    expect(text).toContain("Lagos, Nigeria");
    expect(text).not.toContain("Allen Avenue");
    expect(text).not.toContain("Admiralty Way");
    expect(text).not.toContain("No address on file");
  });

  it("does not claim an address is missing when only the state and country are absent too", () => {
    mocks.fieldAccess = HIDDEN_ADDRESS_AND_EMAIL;
    mocks.list = [{ ...without(IKEJA, "address", "email"), state: "", country: "" }];

    expect(render().body.textContent).toContain("No location on file");
  });

  it("offers no edit control for a branch, whatever the switches say", () => {
    mocks.fieldAccess = READ_ONLY_ALWAYS;
    const document = render();

    expect(document.querySelector("input, textarea, select")).toBeNull();
    expect(Array.from(document.querySelectorAll("button")).map((b) => b.textContent))
      .not.toContain("Edit");
  });
});

describe("branch drawer Field Access", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mocks.fieldAccess = {};
    mocks.detail = IKEJA;
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    document.body.innerHTML = "";
  });

  const open = () => act(() => root.render(<BranchDrawer code={1} onClose={vi.fn()} />));
  const rowLabels = () =>
    Array.from(document.body.querySelectorAll("dt")).map((dt) => dt.textContent);

  it("lists the address and email rows for a role that may read them", () => {
    open();

    expect(rowLabels()).toEqual(
      expect.arrayContaining(["Branch code", "Address", "State", "Country", "Email", "Opened"]),
    );
    expect(document.body.textContent).toContain("12 Allen Avenue");
    expect(document.body.textContent).toContain("ikeja@bright-star.example");
  });

  it("removes the address and email rows, with their labels, when both are hidden", () => {
    mocks.fieldAccess = HIDDEN_ADDRESS_AND_EMAIL;
    mocks.detail = without(IKEJA, "address", "email");
    open();

    expect(rowLabels()).not.toContain("Address");
    expect(rowLabels()).not.toContain("Email");
    expect(rowLabels()).toEqual(expect.arrayContaining(["Branch code", "State", "Country"]));
    expect(document.body.textContent).toContain("Ikeja Branch");
    expect(document.body.textContent).not.toContain("Allen Avenue");
    expect(document.body.textContent).not.toContain("ikeja@bright-star.example");
  });

  it("hides one of the two without touching the other", () => {
    mocks.fieldAccess = { "school.branches": { hidden: ["email"], read_only: ["address", "email"], open_on_create: [] } };
    mocks.detail = without(IKEJA, "email");
    open();

    expect(rowLabels()).toContain("Address");
    expect(rowLabels()).not.toContain("Email");
  });

  it("shows read-only values as plain text with no input", () => {
    mocks.fieldAccess = READ_ONLY_ALWAYS;
    mocks.detail = { ...IKEJA, _read_only_fields: ["address", "email"] };
    open();

    expect(document.body.textContent).toContain("12 Allen Avenue");
    expect(document.body.querySelector("input, textarea, select")).toBeNull();
  });
});

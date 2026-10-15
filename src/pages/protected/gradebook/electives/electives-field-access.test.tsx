import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FieldAccessMap } from "@/components/finance-ui";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import type { ClassElectives } from "@/redux/services/academics/academics-types";

/**
 * Who takes what asks Field Access, and the server, what to offer.
 *
 * Mrs Hauwa Sanni leads JSS1 B at Lagoon View, where Yoruba is the one subject
 * that is not core. The grid follows the `takes` switch of the electives
 * resource: writable, she ticks boxes; read-only, she sees ticks and nothing to
 * change; hidden, she is told so rather than shown an empty grid that would
 * read as nobody taking Yoruba. The server's `can_edit` is the other half: a
 * teacher who does not lead the class reads it whatever the switch says.
 */
let fieldAccess: FieldAccessMap = {};
let grid: ClassElectives;

vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({
    fieldAccess,
    hasPermission: () => false,
    hasAnyPermission: () => false,
    hasAllPermissions: () => false,
    hasModuleAccess: () => true,
  }),
}));
vi.mock("@/components/layout/page-shell", () => ({
  PageShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock("@/redux/services/academics/academics-api", () => ({
  useGetClassElectivesQuery: () => ({ data: { data: grid }, isLoading: false, isError: false, refetch: vi.fn() }),
  useSetClassElectivesMutation: () => [vi.fn(), { isLoading: false }],
}));
vi.mock("@/redux/services/gradebook/gradebook-api", () => ({
  useGetResultsHubQuery: () => ({ data: undefined, isLoading: false }),
  useGetMySheetsQuery: () => ({
    data: {
      data: {
        term: { id: 44, name: "First Term", session: "2026/2027" },
        sheets: [],
        duties: [{ kind: "CLASS_TEACHER", class: { id: 83, name: "JSS1 B" }, department: null, waiting: null, subjects_in: 5, subjects_due: 5, stage: "COMPILING" }],
      },
    },
    isLoading: false,
  }),
}));

import WhoTakesWhat from "./index";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const jss1b = (overrides: Partial<ClassElectives> = {}): ClassElectives => ({
  class: { id: 83, name: "JSS1 B" },
  term: { id: 44, name: "First Term" },
  can_edit: true,
  subjects: [{ id: 47, name: "Yoruba", code: "YOR", takers: 1, roll: 2 }],
  students: [
    { id: 501, name: "Tunde Adeleke", admission_number: "", takes: [47] },
    { id: 502, name: "Adaeze Chukwu", admission_number: "", takes: [] },
  ],
  ...overrides,
});

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  fieldAccess = {};
  grid = jss1b();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const render = () =>
  act(() => {
    root.render(
      <MemoryRouter initialEntries={["/gradebook/who-takes-what"]}>
        <WhoTakesWhat />
      </MemoryRouter>,
    );
  });

const boxes = () => container.querySelectorAll('[role="checkbox"]');

describe("who takes what Field Access", () => {
  it("offers a box per student and subject when the class teacher may change it", () => {
    render();
    expect(boxes().length).toBe(2);
    expect(container.textContent).toContain("1 of 2");
  });

  it("shows ticks and nothing to change when the switch is read-only", () => {
    fieldAccess = { [FIELD_RESOURCE.ACADEMICS_ELECTIVES]: { hidden: [], read_only: ["takes", "takers"], open_on_create: [] } };
    render();
    expect(boxes().length).toBe(0);
    expect(container.textContent).toContain("✓");
  });

  it("is read-only when the server says the reader may not change this class", () => {
    grid = jss1b({ can_edit: false });
    render();
    expect(boxes().length).toBe(0);
    expect(container.textContent).toContain("only the class teacher or an administrator changes this");
  });

  it("says who takes what is withheld rather than drawing an empty grid when it is hidden", () => {
    fieldAccess = { [FIELD_RESOURCE.ACADEMICS_ELECTIVES]: { hidden: ["takes", "takers"], read_only: [], open_on_create: [] } };
    grid = jss1b({ students: [{ id: 501, name: "Tunde Adeleke", admission_number: "" }] });
    render();
    expect(container.textContent).toContain("Your role cannot read who takes what");
    expect(container.querySelector("table")).toBeNull();
  });
});

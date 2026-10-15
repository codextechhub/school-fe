import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Analytics } from "@/redux/services/gradebook/gradebook-types";

/**
 * Analytics draw what the server sends and nothing else.
 *
 * Lagoon View published JSS1 A and JSS1 B, which both offer Mathematics. Tunde
 * Bello's overall average fell from 68.00 last term to 61.50. The class
 * figures, the overall averages and the positions are withheld by the server
 * where the reader may not read them; the screen must then drop the columns
 * and parts rather than print a blank under their headings.
 */
let exports = true;

vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({
    fieldAccess: {},
    hasPermission: () => exports,
    hasAnyPermission: () => exports,
    hasAllPermissions: () => true,
    hasModuleAccess: () => true,
  }),
}));
vi.mock("@/hooks/use-school-words", () => ({
  useSchoolWords: () => ({ term: "term", Term: "Term", terms: "terms", Terms: "Terms" }),
}));
vi.mock("@/hooks/use-branch-lens", () => ({ useBranchLens: () => ({ branch: "all", applies: false, label: "" }) }));
vi.mock("@/components/layout/page-shell", () => ({
  PageShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));

const report: Analytics = {
  term: { id: 44, name: "First Term", session: "2026/2027" },
  scope: {
    branch_dimension: false,
    classes: [{ id: 82, name: "JSS1 A", branch: null }, { id: 83, name: "JSS1 B", branch: null }],
    published_count: 2,
  },
  ranks: true,
  subjects: [
    {
      subject: { id: 41, name: "Mathematics" },
      class: { id: 82, name: "JSS1 A" },
      average: "60.80",
      spread: [{ grade: "A", count: 5 }, { grade: "F", count: 2 }],
      pass_rate: 89,
      marked: 27,
    },
  ],
  compare: [
    {
      subject: { id: 41, name: "Mathematics" },
      arms: [{ class: { id: 82, name: "JSS1 A" }, average: "60.80" }, { class: { id: 83, name: "JSS1 B" }, average: "54.20" }],
      gap: "6.60",
    },
  ],
  movers: [
    {
      student: { id: 381, name: "Tunde Bello", admission_number: "" },
      class: { id: 82, name: "JSS1 A" },
      from_term: { id: 43, name: "Third Term" },
      from: "68.00",
      to: "61.50",
      change: "-6.50",
    },
  ],
  tops: [{ class: { id: 82, name: "JSS1 A" }, students: [{ id: 373, name: "Zainab Afolabi" }], average: "77.00" }],
};
let data: Analytics = report;

vi.mock("@/redux/services/gradebook/gradebook-api", () => ({
  useGetAnalyticsQuery: () => ({ data: { data }, isLoading: false, isError: false, refetch: vi.fn() }),
  useExportAnalyticsMutation: () => [vi.fn(), { isLoading: false }],
}));

import AnalyticsPage from "./index";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  data = report;
  exports = true;
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const headers = () => Array.from(container.querySelectorAll("th")).map((th) => th.textContent);
const exportButtons = () => Array.from(container.querySelectorAll("button")).filter((b) => b.textContent?.includes("Export"));
const render = () => act(() => root.render(<MemoryRouter><AnalyticsPage /></MemoryRouter>));

describe("analytics", () => {
  it("draws all four parts, with an export on the two tables that have one", () => {
    render();
    expect(headers()).toEqual(expect.arrayContaining(["Average", "Grade spread", "Pass rate", "This term", "Change"]));
    expect(container.textContent).toContain("A 5 · F 2");
    expect(container.textContent).toContain("Gap of 6.60 points");
    expect(container.textContent).toContain("-6.50");
    expect(container.textContent).toContain("Zainab Afolabi");
    expect(exportButtons()).toHaveLength(2);
  });

  it("drops the class figures when they are withheld", () => {
    data = {
      ...report,
      subjects: report.subjects.map(({ average: _a, spread: _s, pass_rate: _p, ...row }) => row),
      compare: [],
    };
    render();
    expect(headers()).not.toContain("Average");
    expect(headers()).not.toContain("Grade spread");
    expect(headers()).not.toContain("Pass rate");
    expect(container.textContent).not.toContain("across classes");
  });

  it("drops the overall averages and the top of each class when they are withheld", () => {
    data = {
      ...report,
      movers: report.movers.map(({ from: _f, to: _t, change: _c, ...row }) => row),
      tops: undefined,
    };
    render();
    expect(headers()).not.toContain("Change");
    expect(container.textContent).not.toContain("68.00");
    expect(container.textContent).not.toContain("Top of each class");
  });

  it("offers no export to a reader without the export key", () => {
    exports = false;
    render();
    expect(exportButtons()).toHaveLength(0);
  });

  it("says when nothing is published, and when no student has an earlier term", () => {
    data = { ...report, movers: [] };
    render();
    expect(container.textContent).toContain("No student in a published class has an earlier published term");
    data = { ...report, scope: { ...report.scope, classes: [], published_count: 0 }, subjects: [], movers: [], tops: [] };
    render();
    expect(container.textContent).toContain("Nothing is published yet");
  });
});

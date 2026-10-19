import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FieldAccessMap } from "@/components/finance-ui";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import type { GradebookSettings, Scale, Structure } from "@/redux/services/gradebook/gradebook-types";

/**
 * Gradebook setup asks Field Access which parts to show and offer.
 *
 * Lagoon View's administrator opens Settings, Gradebook. Its Senior Secondary
 * structure (two CAs and an examination) and scale (A1 to F9) are in use and
 * nothing published rests on them. The setup resource has a switch for the
 * components, their maximums, the bands, their remarks and the principal's
 * remark templates. These pin what each does:
 *
 * - writable: every part shows, with Edit and New draft;
 * - components read-only: the structure shows with nothing to change it;
 * - components hidden: no structures panel at all;
 * - maximums hidden: the structures show without their Maximum column;
 * - bands hidden: no scales panel; remarks hidden: bands without remarks;
 * - templates hidden or read-only: no panel, or no Edit templates;
 * - who is told of a released result: hidden, no Telling families panel;
 *   read-only, the switch shows the school's choice and cannot move; writable,
 *   turning it on sends that one setting.
 */
let fieldAccess: FieldAccessMap = {};

const structure: Structure = {
  id: 4, name: "Senior Secondary assessment", program: 22, program_name: "Senior Secondary",
  branch: null, scope_label: "School-wide", is_shared: true, status: "IN_USE", copied_from: null,
  locked: false, lock_reason: null, created_at: "2026-10-14T17:22:17Z",
  components: [
    { id: 8, name: "1st CA", short_name: "CA1", max_score: 20, is_exam: false, order: 1 },
    { id: 10, name: "Examination", short_name: "EXAM", max_score: 80, is_exam: true, order: 2 },
  ],
  total: 100,
  total_check: { ok: true, message: "The components total 100." },
};
const scale: Scale = {
  id: 4, name: "Senior Secondary grading", program: 22, program_name: "Senior Secondary",
  branch: null, scope_label: "School-wide", is_shared: true, status: "IN_USE", copied_from: null,
  locked: false, lock_reason: null, created_at: "2026-10-14T17:22:17Z",
  bands: [
    { id: 16, min_score: 75, grade: "A1", remark: "Excellent", is_fail: false, order: 1 },
    { id: 24, min_score: 0, grade: "F9", remark: "Fail", is_fail: true, order: 2 },
  ],
  check: { ok: true, message: "No gap, no overlap, 0 to 100 covered." },
};
const settings: GradebookSettings = {
  show_class_stats: true, rank_in_class: true, conduct_ratings: true, rating_key: true,
  rating_traits: ["Punctuality"], moderated_programs: ["SSS"],
  programs: [{ code: "SSS", name: "Senior Secondary", moderated: true }],
  tell_every_parent: false,
};
const updateSettings = vi.fn(() => ({ unwrap: () => Promise.resolve({}) }));

vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({
    fieldAccess,
    hasPermission: () => true,
    hasAnyPermission: () => true,
    hasAllPermissions: () => true,
    hasModuleAccess: () => true,
  }),
}));
vi.mock("@/hooks/use-school-words", () => ({ useSchoolWords: () => ({ term: "term", terms: "terms" }) }));
vi.mock("../use-settings-write", () => ({ useSettingsWrite: () => ({ canSave: true, reason: null }) }));
vi.mock("../use-settings-branches", () => ({
  useSettingsBranches: () => ({ applies: false, wholeSchool: true, choices: [], isLoading: false }),
}));
vi.mock("@/redux/services/academics/academics-api", () => ({
  useGetProgramsQuery: () => ({ data: { data: [{ id: 22, name: "Senior Secondary", is_active: true }] } }),
}));
vi.mock("@/redux/services/gradebook/gradebook-api", () => {
  const mutation = () => [vi.fn(), { isLoading: false }];
  return {
    useGetGradebookSettingsQuery: () => ({ data: { data: settings }, isLoading: false, isError: false }),
    useGetStructuresQuery: () => ({ data: { data: [structure] }, isLoading: false }),
    useGetScalesQuery: () => ({ data: { data: [scale] }, isLoading: false }),
    useGetRemarkTemplatesQuery: () => ({
      data: { data: { templates: [{ band_min: 70, text: "An excellent result." }, { band_min: 0, text: "Let us meet." }] } },
      isLoading: false,
    }),
    useCopyStructureMutation: mutation,
    useActivateStructureMutation: mutation,
    useDeleteStructureMutation: mutation,
    useCreateStructureMutation: mutation,
    useUpdateStructureMutation: mutation,
    useCopyScaleMutation: mutation,
    useActivateScaleMutation: mutation,
    useDeleteScaleMutation: mutation,
    useCreateScaleMutation: mutation,
    useUpdateScaleMutation: mutation,
    useSaveRemarkTemplatesMutation: mutation,
    useUpdateGradebookSettingsMutation: () => [updateSettings, { isLoading: false }],
  };
});

import { GradebookSection } from "./gradebook-section";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  root = createRoot(container);
  fieldAccess = {};
  updateSettings.mockClear();
});

afterEach(() => act(() => root.unmount()));

const setup = (hidden: string[] = [], read_only: string[] = []) => {
  fieldAccess = { [FIELD_RESOURCE.GRADEBOOK_SETUP]: { hidden, read_only, open_on_create: [] } };
  act(() => root.render(<MemoryRouter><GradebookSection /></MemoryRouter>));
};
const text = () => container.textContent ?? "";
const buttons = (label: string) =>
  Array.from(container.querySelectorAll("button")).filter((b) => b.textContent === label).length;

describe("gradebook setup Field Access", () => {
  it("shows every part, with Edit and New draft, when all of it is writable", () => {
    setup();
    expect(text()).toContain("Assessment structures");
    expect(text()).toContain("Grading scales");
    expect(text()).toContain("Maximum");
    expect(text()).toContain("Excellent");
    expect(buttons("Edit")).toBe(2);
    expect(buttons("New draft")).toBe(2);
    expect(buttons("Edit templates")).toBe(1);
  });

  it("shows the structure with nothing to change it when its components are read-only", () => {
    setup([], ["components"]);
    expect(text()).toContain("Senior Secondary assessment");
    expect(buttons("Edit")).toBe(1);
    expect(buttons("New draft")).toBe(1);
  });

  it("drops the structures panel when the components are hidden, and the Maximum column with the maximums", () => {
    setup(["components"]);
    expect(text()).not.toContain("Assessment structures");
    act(() => root.unmount());
    root = createRoot(container);
    setup(["max_score", "total", "total_check"]);
    expect(text()).toContain("Assessment structures");
    expect(text()).not.toContain("Maximum");
  });

  it("drops the scales panel when the bands are hidden, and the remarks with the remark switch", () => {
    setup(["bands", "check"]);
    expect(text()).not.toContain("Grading scales");
    act(() => root.unmount());
    root = createRoot(container);
    setup(["remark"]);
    expect(text()).toContain("Grading scales");
    expect(text()).not.toContain("Excellent");
  });

  it("drops the templates panel when hidden and its Edit when read-only", () => {
    setup(["templates"]);
    expect(text()).not.toContain("Principal's remark templates");
    act(() => root.unmount());
    root = createRoot(container);
    setup([], ["templates"]);
    expect(text()).toContain("Principal's remark templates");
    expect(buttons("Edit templates")).toBe(0);
  });

  it("offers who is told of a released result, greys it when read-only and drops it when hidden", () => {
    const tellSwitch = () =>
      container.querySelector<HTMLButtonElement>('[aria-label="Tell every parent with a parent app account"]');
    setup();
    expect(text()).toContain("Telling families about results");
    expect(text()).toContain("Only the child's primary guardian is told");
    expect(tellSwitch()?.disabled).toBe(false);
    act(() => tellSwitch()?.click());
    expect(updateSettings).toHaveBeenCalledWith({ tell_every_parent: true });

    act(() => root.unmount());
    root = createRoot(container);
    setup([], ["tell_every_parent"]);
    expect(text()).toContain("Telling families about results");
    expect(tellSwitch()?.disabled).toBe(true);

    act(() => root.unmount());
    root = createRoot(container);
    setup(["tell_every_parent"]);
    expect(text()).not.toContain("Telling families about results");
  });
});

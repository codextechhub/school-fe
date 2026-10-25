import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FieldAccessMap } from "@/components/finance-ui";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import type { ClassTeacherTerm } from "@/redux/services/academics/academics-types";

/**
 * Lagoon View's JSS2 A over the year.
 *
 * Bisi Olanrewaju held it from 12 to 22 Oct, when Emeka Obi handed it to Tolu
 * Fashola. On 25 Oct he cleared it, and later that day gave it back to Tolu.
 * The history reads newest first, with the day it had nobody as a row of its
 * own. "Past class teachers" hides the list; "Who changed the class teacher"
 * is sent by the server or not, and the rows show it only when sent.
 */
let fieldAccess: FieldAccessMap = {};
const getClass = vi.fn();

vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({
    fieldAccess,
    hasPermission: () => true,
    hasAnyPermission: () => true,
    hasAllPermissions: () => true,
    hasModuleAccess: () => true,
  }),
}));
vi.mock("@/redux/services/academics/academics-api", () => ({
  useGetClassQuery: (id: number, options: { skip?: boolean }) => {
    getClass(id, options);
    return { data: undefined };
  },
}));
vi.mock("@/redux/services/staff/staff-api", () => ({
  useSetClassTeacherMutation: () => [vi.fn(), { isLoading: false }],
  useGetStaffListQuery: () => ({ data: { data: [] }, isFetching: false }),
}));

import { ClassTeacherDrawer } from "@/pages/protected/staff/drawers/class-teacher-drawer";
import { currentState, pastEntries } from "./class-teacher-history";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const EMEKA = { id: 7, name: "Emeka Obi" };
const T1 = "2026-10-12T00:45:13Z";
const T2 = "2026-10-22T12:44:03Z";
const T3 = "2026-10-25T09:00:00Z";
const T4 = "2026-10-25T15:00:00Z";

const JSS2A: ClassTeacherTerm[] = [
  { id: 4, staff_id: 150, name: "Tolu Fashola", started_at: T4, ended_at: null, set_by: EMEKA, ended_by: null },
  { id: 3, staff_id: 150, name: "Tolu Fashola", started_at: T2, ended_at: T3, set_by: EMEKA, ended_by: EMEKA },
  { id: 2, staff_id: 135, name: "Bisi Olanrewaju", started_at: T1, ended_at: T2, set_by: EMEKA, ended_by: EMEKA },
];

describe("reading a class's terms", () => {
  it("lists every earlier stretch newest first, nobody included", () => {
    expect(pastEntries(JSS2A).map((e) => [e.name, e.from, e.to, e.by?.name])).toEqual([
      [null, T3, T4, "Emeka Obi"],
      ["Tolu Fashola", T2, T3, "Emeka Obi"],
      ["Bisi Olanrewaju", T1, T2, "Emeka Obi"],
    ]);
  });

  it("dates the current holder from their own term", () => {
    expect(currentState(JSS2A)).toEqual({ since: T4, by: EMEKA });
  });

  it("dates a class left with nobody from when it was cleared", () => {
    const cleared = JSS2A.slice(1);
    expect(currentState(cleared)).toEqual({ since: T3, by: EMEKA });
    // The stretch of nobody is the current state, not an earlier row.
    expect(pastEntries(cleared)[0].name).toBe("Tolu Fashola");
  });

  it("has nothing to say about a class nobody has held", () => {
    expect(currentState([])).toBeNull();
    expect(pastEntries([])).toEqual([]);
  });

  it("keeps a start the history does not know as unknown", () => {
    const before: ClassTeacherTerm[] = [
      { id: 9, staff_id: 1, name: "Kunle Adebayo", started_at: null, ended_at: T2, set_by: null, ended_by: EMEKA },
    ];
    expect(pastEntries(before)[0]).toMatchObject({ from: null, to: T2, by: null });
  });
});

describe("the class teacher drawer's history", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    fieldAccess = {};
    getClass.mockClear();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const render = (history?: ClassTeacherTerm[]) =>
    act(() =>
      root.render(
        <ClassTeacherDrawer
          schoolClassId={84}
          className="JSS2 A"
          currentStaffId={150}
          currentName="Tolu Fashola"
          history={history}
          onClose={() => {}}
        />,
      ),
    );
  const text = () => document.body.textContent ?? "";

  it("shows who held the class before, and who changed it", () => {
    render(JSS2A);
    expect(text()).toContain("Earlier this year");
    expect(text()).toContain("Bisi Olanrewaju");
    expect(text()).toContain("No class teacher");
    expect(text()).toContain("set by Emeka Obi");
    expect(text()).toContain("cleared by Emeka Obi");
  });

  it("shows the same when the switches are read-only, since nothing writes them", () => {
    fieldAccess = {
      [FIELD_RESOURCE.ACADEMICS_CLASSES]: {
        hidden: [], read_only: ["class_teacher_history", "set_by", "ended_by"], open_on_create: [],
      },
    };
    render(JSS2A);
    expect(text()).toContain("Bisi Olanrewaju");
    expect(text()).toContain("set by Emeka Obi");
  });

  it("leaves out who changed it when the server does not send it", () => {
    render(JSS2A.map(({ set_by: _set, ended_by: _ended, ...term }) => term));
    expect(text()).toContain("Bisi Olanrewaju");
    expect(text()).not.toContain("Emeka Obi");
  });

  it("draws no history, and asks for none, when the history is hidden", () => {
    fieldAccess = {
      [FIELD_RESOURCE.ACADEMICS_CLASSES]: {
        hidden: ["class_teacher_history"], read_only: [], open_on_create: [],
      },
    };
    render();
    expect(text()).not.toContain("Earlier this year");
    expect(getClass).toHaveBeenCalledWith(84, { skip: true });
  });

  it("fetches the class's history when the caller has none to hand", () => {
    render();
    expect(getClass).toHaveBeenCalledWith(84, { skip: false });
  });
});

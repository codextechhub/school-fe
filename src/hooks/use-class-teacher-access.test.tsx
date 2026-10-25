import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FieldAccessMap } from "@/components/finance-ui";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import type { SchoolClass } from "@/redux/services/academics/academics-types";

/**
 * The Class teacher switch, as Lagoon View's screens read it.
 *
 * JSS2 A is Tolu Fashola's; SSS2 B has nobody. Ngozi Ibekwe's Bursar role may
 * not read the class teacher, so she is told neither, and nothing on her screen
 * calls SSS2 B empty. A role that may read but not write sees both names and
 * no Set or Change. A writable role gets both buttons.
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

import { ClassTeachers } from "@/pages/protected/staff/teaching/class-teachers";
import { classTeacherText, useClassTeacherAccess } from "./use-class-teacher-access";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const switchTo = (hidden: string[], readOnly: string[]) => {
  fieldAccess = {
    [FIELD_RESOURCE.ACADEMICS_CLASSES]: { hidden, read_only: readOnly, open_on_create: [] },
  };
};

const JSS2A = { id: 84, name: "JSS2 A", class_teacher: { staff_id: 150, name: "Tolu Fashola" } } as SchoolClass;
const SSS2B = { id: 87, name: "SSS2 B", class_teacher: null } as SchoolClass;

let container: HTMLDivElement;
let root: Root;

function Probe() {
  const { hidden, canChange } = useClassTeacherAccess();
  return <output data-hidden={hidden} data-can-change={canChange} />;
}

beforeEach(() => {
  container = document.createElement("div");
  root = createRoot(container);
  fieldAccess = {};
});

afterEach(() => act(() => root.unmount()));

describe("classTeacherText", () => {
  it("prints the name, says nobody for a class with none, and prints nothing when hidden", () => {
    expect(classTeacherText({ name: "Tolu Fashola" })).toBe("Tolu Fashola");
    expect(classTeacherText("Tolu Fashola")).toBe("Tolu Fashola");
    expect(classTeacherText(null)).toBe("No class teacher");
    expect(classTeacherText(null, "the class teacher")).toBe("the class teacher");
    expect(classTeacherText(undefined)).toBeNull();
  });
});

describe("useClassTeacherAccess", () => {
  const probe = () => {
    act(() => root.render(<Probe />));
    const out = container.querySelector("output")!;
    return { hidden: out.dataset.hidden === "true", canChange: out.dataset.canChange === "true" };
  };

  it("lets a reader see and change it when the switch is open", () => {
    expect(probe()).toEqual({ hidden: false, canChange: true });
  });

  it("lets a read-only reader see it but not change it", () => {
    switchTo([], ["class_teacher"]);
    expect(probe()).toEqual({ hidden: false, canChange: false });
  });

  it("hides it, and with it any change, when Read is off", () => {
    switchTo(["class_teacher"], []);
    expect(probe()).toEqual({ hidden: true, canChange: false });
  });
});

describe("the Class teachers panel", () => {
  const draw = (canChange: boolean) =>
    act(() => root.render(<ClassTeachers classes={[JSS2A, SSS2B]} canChange={canChange} onSet={() => {}} />));
  const buttons = () => Array.from(container.querySelectorAll("button")).map((b) => b.textContent);

  it("offers Change and Set to a reader who may write it", () => {
    draw(true);
    expect(buttons()).toEqual(["Change", "Set"]);
  });

  it("names the teachers with nothing to change them without Write", () => {
    draw(false);
    expect(container.textContent).toContain("Tolu Fashola");
    expect(container.textContent).toContain("No class teacher yet");
    expect(buttons()).toEqual([]);
  });
});

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { StaffDetail } from "@/redux/services/staff/staff-types";

/**
 * A member of staff correcting their own details.
 *
 * Tunde Bakare teaches at Holy Cross and holds no staff update key. The server
 * lets him change his photograph, middle name, date of birth and phone about
 * himself and nothing else, so the form offers those and sends only what he
 * changed. Where the school has closed his personal details to him, his middle
 * name and date of birth are absent from the record and absent from the form.
 */
const update = vi.fn();

vi.mock("@/redux/services/staff/staff-api", () => ({
  useUpdateStaffMutation: () => [update, { isLoading: false }],
}));
vi.mock("../../students/photo-picker", () => ({ PhotoPicker: () => null }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../../students/drawers/drawer-shell", async (importActual) => {
  const actual = await importActual<typeof import("../../students/drawers/drawer-shell")>();
  return {
    ...actual,
    DrawerShell: ({
      children,
      saveLabel,
      onSave,
      canSave,
    }: {
      children: ReactNode;
      saveLabel: string;
      onSave: () => void;
      canSave: boolean;
    }) => (
      <div>
        {children}
        <button type="button" disabled={!canSave} onClick={onSave}>{saveLabel}</button>
      </div>
    ),
  };
});

import { SelfEditDrawer } from "./self-edit-drawer";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const TUNDE = {
  id: 39,
  full_name: "Tunde Bakare",
  photo_url: null,
  middle_name: "",
  date_of_birth: null,
  phone: "",
} as unknown as StaffDetail;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  update.mockReset();
  update.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const render = (person: StaffDetail) =>
  act(() => root.render(<SelfEditDrawer person={person} onClose={() => {}} />));

const labels = () => [...container.querySelectorAll("label")].map((l) => l.textContent?.trim());

const type = (label: string, value: string) => {
  const field = [...container.querySelectorAll("label")]
    .find((l) => l.textContent?.trim().startsWith(label))!
    .parentElement!.querySelector("input")!;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  act(() => {
    setter.call(field, value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const saveButton = () =>
  [...container.querySelectorAll("button")].find((b) => b.textContent === "Save changes")!;

describe("SelfEditDrawer", () => {
  it("offers the three details a person may change and none of the school's", () => {
    render(TUNDE);
    expect(labels()).toEqual(
      expect.arrayContaining([expect.stringContaining("Middle name"), expect.stringContaining("Date of birth"), expect.stringContaining("Phone")]),
    );
    const text = container.textContent ?? "";
    for (const closed of ["Job title", "Hire date", "Staff ID", "Employment type"]) {
      expect(text).not.toContain(closed);
    }
  });

  it("leaves out a detail the record does not carry", () => {
    const { middle_name: _m, date_of_birth: _d, ...contactOnly } = TUNDE as unknown as Record<string, unknown>;
    render(contactOnly as unknown as StaffDetail);
    const shown = labels().join(" ");
    expect(shown).toContain("Phone");
    expect(shown).not.toContain("Middle name");
    expect(shown).not.toContain("Date of birth");
  });

  it("sends only what changed", async () => {
    render(TUNDE);
    expect(saveButton().disabled).toBe(true);
    type("Phone", " 08030000001 ");
    expect(saveButton().disabled).toBe(false);
    await act(async () => saveButton().click());
    expect(update).toHaveBeenCalledWith({ id: 39, body: { phone: "08030000001" } });
  });
});

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FieldAccessMap } from "@/components/finance-ui";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import type { StudentDetail } from "@/redux/services/students/students-types";

/**
 * Adding a new guardian follows the `/me` map as a record being created.
 *
 * Bright Star's registrar, Mrs. Okafor, holds a role with Write off on a
 * guardian's phone. The backend declares the phone open on create, so her map
 * lists it under `read_only` (or `hidden`) and under `open_on_create`. Enrolling
 * Tunde, or linking a parent to him later, she may still add his mother as a new
 * guardian with a phone number; she may not correct that number afterwards.
 * Only where the phone is closed to her and NOT open on create is she limited
 * to finding a guardian already at the school, since a guardian cannot be added
 * without one.
 *
 * `usePermissions` returns the map under test and the API hooks return fixed
 * data, so the screens' own Field Access rules are what these exercise.
 */
let fieldAccess: FieldAccessMap = {};
const link = vi.fn();

vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({
    fieldAccess,
    hasPermission: () => true,
    hasAnyPermission: () => true,
    hasAllPermissions: () => true,
    hasModuleAccess: () => true,
  }),
}));
vi.mock("@/redux/services/students/students-api", () => ({
  useGetGuardiansQuery: () => ({ data: { data: [] }, isFetching: false }),
  useGetStudentGuardiansQuery: () => ({ data: { data: [] } }),
  useLinkGuardianMutation: () => [link, { isLoading: false }],
}));
vi.mock("./drawers/drawer-shell", async (importActual) => {
  const actual = await importActual<typeof import("./drawers/drawer-shell")>();
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

import { GuardianRows, type GuardianDraft } from "./enrol/guardian-rows";
import { LinkGuardianDrawer } from "./drawers/link-guardian-drawer";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const guardians = (access: FieldAccessMap[string]): FieldAccessMap => ({
  [FIELD_RESOURCE.GUARDIANS]: access,
});

const PHONE_READ_ONLY_BUT_OPEN = guardians({ hidden: [], read_only: ["phone"], open_on_create: ["phone"] });
const PHONE_HIDDEN_BUT_OPEN = guardians({ hidden: ["phone"], read_only: [], open_on_create: ["phone"] });
const PHONE_HIDDEN_AND_CLOSED = guardians({ hidden: ["phone"], read_only: [], open_on_create: [] });

const NEW_ROW: GuardianDraft = {
  kind: "new",
  full_name: "",
  first_name: "Adaeze",
  middle_name: "",
  last_name: "Okeke",
  phone: "",
  email: "",
  relationship: "",
  is_primary: true,
};

function buttonNamed(text: string): HTMLButtonElement | undefined {
  return Array.from(document.body.querySelectorAll("button")).find(
    (b) => b.textContent?.trim() === text,
  );
}

function inputLabelled(text: string): HTMLInputElement | HTMLSelectElement | null {
  const label = Array.from(document.body.querySelectorAll("label")).find(
    (node) => node.textContent?.trim() === text,
  );
  const id = label?.getAttribute("for");
  return id ? document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null : null;
}

function type(input: HTMLInputElement | HTMLSelectElement, value: string) {
  const select = input instanceof HTMLSelectElement;
  const proto = select ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(input, value);
  input.dispatchEvent(new Event(select ? "change" : "input", { bubbles: true }));
}

describe("adding a new guardian with a phone open on create", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    link.mockReset();
    link.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    fieldAccess = {};
  });

  describe("on the enrol form", () => {
    async function render(rows: GuardianDraft[] = []) {
      await act(async () => {
        root.render(<GuardianRows rows={rows} onChange={() => {}} />);
      });
    }

    it("offers a new guardian, with an editable phone, to a role without Write on it", async () => {
      fieldAccess = PHONE_READ_ONLY_BUT_OPEN;
      await render([NEW_ROW]);

      expect(buttonNamed("Add a new one")).toBeDefined();
      const phone = inputLabelled("Phone");
      expect(phone).not.toBeNull();
      expect(phone?.closest("fieldset")?.disabled).toBe(false);
    });

    it("offers it too when the phone is hidden but open on create", async () => {
      fieldAccess = PHONE_HIDDEN_BUT_OPEN;
      await render([NEW_ROW]);

      expect(buttonNamed("Add a new one")).toBeDefined();
      expect(inputLabelled("Phone")?.closest("fieldset")?.disabled).toBe(false);
    });

    it("withholds it only when the phone is hidden and not open on create", async () => {
      fieldAccess = PHONE_HIDDEN_AND_CLOSED;
      await render();

      expect(buttonNamed("Add a new one")).toBeUndefined();
      expect(buttonNamed("Find an existing guardian")).toBeDefined();
    });
  });

  describe("in the link guardian drawer", () => {
    const tunde = { id: 41, full_name: "Tunde Okeke" } as StudentDetail;

    async function render() {
      await act(async () => {
        root.render(<LinkGuardianDrawer student={tunde} open onClose={() => {}} />);
      });
    }

    it("adds a guardian with a phone for a role without Write on it", async () => {
      fieldAccess = PHONE_READ_ONLY_BUT_OPEN;
      await render();

      const addNew = document.body.querySelector("button[aria-label='Add a new one view']") as HTMLButtonElement;
      expect(addNew).not.toBeNull();
      await act(async () => addNew.click());

      await act(async () => {
        type(inputLabelled("First name") as HTMLInputElement, "Adaeze");
        type(inputLabelled("Last name") as HTMLInputElement, "Okeke");
        type(inputLabelled("Phone") as HTMLInputElement, "0803 555 0101");
        type(inputLabelled("Relationship") as HTMLSelectElement, "MOTHER");
      });
      await act(async () => buttonNamed("Link guardian")?.click());

      expect(link).toHaveBeenCalledOnce();
      expect(link.mock.calls[0][0]).toMatchObject({
        id: 41,
        first_name: "Adaeze",
        last_name: "Okeke",
        phone: "0803 555 0101",
        relationship: "MOTHER",
      });
    });

    it("is search only when the phone is hidden and not open on create", async () => {
      fieldAccess = PHONE_HIDDEN_AND_CLOSED;
      await render();

      expect(document.body.querySelector("button[aria-label='Add a new one view']")).toBeNull();
      expect(inputLabelled("Phone")).toBeNull();
    });
  });
});

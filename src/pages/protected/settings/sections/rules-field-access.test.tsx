import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FieldAccessMap } from "@/components/finance-ui";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import type {
  EnrolmentRules,
  GuardianRules,
} from "@/redux/services/students/students-types";

/**
 * The enrolment and guardian rule screens follow the viewer's Field Access.
 *
 * Holy Cross requires a blood group and a previous school at enrolment. Mrs.
 * Okafor's role may not read a blood group, so the server lists only the
 * details she can read and her screen offers only those. Saving a change to
 * the previous school still sends the blood-group requirement back, so it is
 * not lifted by a screen that never showed it. The same role may not read a
 * guardian's email, so the guardian rules screen does not offer the email
 * requirement either.
 */
const ENROLMENT: EnrolmentRules = {
  min_age_years: 2,
  max_age_years: 25,
  required_documents: [],
  document_types: [],
  required_fields: ["blood_group", "previous_school"],
  binding_required_fields: ["previous_school"],
  optional_fields: [
    { value: "nationality", label: "Nationality" },
    { value: "previous_school", label: "Previous school" },
  ],
  capacity_mode: "WARN",
  default_capacity: null,
};
const GUARDIANS: GuardianRules = {
  min_per_student: 1,
  email_required: true,
  binding_email_required: false,
  matching: "EMAIL_THEN_PHONE",
  matching_options: [{ value: "EMAIL_THEN_PHONE", label: "Email, then phone" }],
  extra_relationships: [],
  relationships: [],
};

let enrolment: EnrolmentRules = ENROLMENT;
let fieldAccess: FieldAccessMap = {};
const saveEnrolment = vi.fn();
const saveGuardians = vi.fn();

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({
    fieldAccess,
    hasPermission: () => true,
    hasAnyPermission: () => true,
    hasAllPermissions: () => true,
    hasModuleAccess: () => true,
  }),
}));
vi.mock("../use-settings-write", async (importActual) => ({
  ...(await importActual<typeof import("../use-settings-write")>()),
  useSettingsWrite: () => ({ canSave: true, reason: null }),
}));
vi.mock("@/redux/services/students/students-api", () => ({
  useGetEnrolmentRulesQuery: () => ({ data: { data: enrolment }, isLoading: false }),
  useUpdateEnrolmentRulesMutation: () => [saveEnrolment, { isLoading: false }],
  useGetGuardianRulesQuery: () => ({ data: { data: GUARDIANS }, isLoading: false }),
  useUpdateGuardianRulesMutation: () => [saveGuardians, { isLoading: false }],
}));

import { EnrolmentSection } from "./enrolment-section";
import { GuardiansSection } from "./guardians-section";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const button = (text: string) =>
  Array.from(document.body.querySelectorAll("button")).find(
    (b) => b.textContent?.trim() === text,
  ) as HTMLButtonElement | undefined;

describe("rule screens and Field Access", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    saveEnrolment.mockReset();
    saveGuardians.mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    enrolment = ENROLMENT;
    fieldAccess = {};
  });

  describe("enrolment rules", () => {
    async function render() {
      await act(async () => root.render(<EnrolmentSection />));
    }

    it("lists only the details the server offers", async () => {
      await render();

      const labels = Array.from(container.querySelectorAll("label")).map((l) => l.textContent);
      expect(labels).toContain("Nationality");
      expect(labels).toContain("Previous school");
      expect(container.textContent).not.toContain("Blood group");
    });

    it("sends back a requirement it did not show, with the change made", async () => {
      saveEnrolment.mockReturnValue({ unwrap: () => Promise.resolve({}) });
      await render();

      const nationality = Array.from(container.querySelectorAll("label"))
        .find((l) => l.textContent === "Nationality")
        ?.querySelector("button[role='checkbox']") as HTMLButtonElement;
      await act(async () => nationality.click());
      await act(async () => button("Save enrolment rules")?.click());

      expect(saveEnrolment).toHaveBeenCalledOnce();
      expect([...saveEnrolment.mock.calls[0][0].required_fields].sort()).toEqual([
        "blood_group",
        "nationality",
        "previous_school",
      ]);
      expect(saveEnrolment.mock.calls[0][0]).not.toHaveProperty("binding_required_fields");
    });

    it("leaves hidden requirements to the server when another setting changes", async () => {
      saveEnrolment.mockReturnValue({ unwrap: () => Promise.resolve({}) });
      await render();

      const youngest = container.querySelector("input[type='number']") as HTMLInputElement;
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(youngest, "3");
        youngest.dispatchEvent(new Event("input", { bubbles: true }));
      });
      await act(async () => button("Save enrolment rules")?.click());

      expect(saveEnrolment.mock.calls[0][0]).toEqual({ min_age_years: 3 });
    });

    it("drops the whole panel when the user can read none of the details", async () => {
      enrolment = { ...ENROLMENT, optional_fields: [] };
      await render();

      expect(container.textContent).not.toContain("Details required at enrolment");
    });
  });

  describe("guardian rules", () => {
    async function render() {
      await act(async () => root.render(<GuardiansSection />));
    }

    it("offers the email requirement to a user who can read a guardian's email", async () => {
      await render();

      expect(container.textContent).toContain("Email required for a new guardian");
    });

    it("does not offer it where a guardian's email is hidden", async () => {
      fieldAccess = { [FIELD_RESOURCE.GUARDIANS]: { hidden: ["email"], read_only: [] } };
      await render();

      expect(container.textContent).not.toContain("Email required for a new guardian");
      expect(container.querySelector("[aria-label='Email required for a new guardian']")).toBeNull();
    });
  });
});

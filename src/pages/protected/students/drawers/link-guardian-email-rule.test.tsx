import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { GuardianRules, StudentDetail } from "@/redux/services/students/students-types";

/**
 * A new guardian's email is required of the registrar only where the rule binds
 * them.
 *
 * Holy Cross requires every new guardian to have an email. Mr. Bello's role may
 * not give a guardian's email, so the server answers `binding_email_required:
 * false` and his link form lets a guardian go in without one. A server that
 * sends no binding value binds him to `email_required`.
 */
let rules: Partial<GuardianRules> | undefined;

vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({
    fieldAccess: {},
    hasPermission: () => true,
    hasAnyPermission: () => true,
    hasAllPermissions: () => true,
    hasModuleAccess: () => true,
  }),
}));
vi.mock("@/redux/services/students/students-api", () => ({
  useGetGuardiansQuery: () => ({ data: { data: [] }, isFetching: false }),
  useGetStudentGuardiansQuery: () => ({ data: { data: [] } }),
  useLinkGuardianMutation: () => [vi.fn(), { isLoading: false }],
  useGetGuardianRulesQuery: () => ({ data: rules ? { data: rules } : undefined }),
}));
vi.mock("./drawer-shell", async (importActual) => {
  const actual = await importActual<typeof import("./drawer-shell")>();
  return {
    ...actual,
    DrawerShell: ({
      children,
      saveLabel,
      canSave,
    }: {
      children: ReactNode;
      saveLabel: string;
      canSave: boolean;
    }) => (
      <div>
        {children}
        <button type="button" disabled={!canSave}>{saveLabel}</button>
      </div>
    ),
  };
});

import { LinkGuardianDrawer } from "./link-guardian-drawer";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function labelled(text: string): HTMLLabelElement | undefined {
  return Array.from(document.body.querySelectorAll("label")).find(
    (node) => (node.textContent ?? "").replace(/\s*\*$/, "").trim() === text,
  );
}

function inputFor(text: string): HTMLInputElement | HTMLSelectElement {
  const id = labelled(text)?.getAttribute("for") ?? "";
  return document.getElementById(id) as HTMLInputElement | HTMLSelectElement;
}

function type(input: HTMLInputElement | HTMLSelectElement, value: string) {
  const select = input instanceof HTMLSelectElement;
  const proto = select ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(input, value);
  input.dispatchEvent(new Event(select ? "change" : "input", { bubbles: true }));
}

describe("LinkGuardianDrawer and the guardian email rule", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    rules = undefined;
  });

  async function openNewGuardianForm() {
    await act(async () => {
      root.render(
        <LinkGuardianDrawer student={{ id: 41 } as StudentDetail} open onClose={() => {}} />,
      );
    });
    const addNew = document.body.querySelector(
      "button[aria-label='Add a new one view']",
    ) as HTMLButtonElement;
    await act(async () => addNew.click());
  }

  async function fillEverythingButEmail() {
    await openNewGuardianForm();
    await act(async () => {
      type(inputFor("First name"), "Adaeze");
      type(inputFor("Last name"), "Okeke");
      type(inputFor("Phone"), "0803 555 0101");
      type(inputFor("Relationship"), "MOTHER");
    });
  }

  const link = () =>
    Array.from(document.body.querySelectorAll("button")).find(
      (b) => b.textContent === "Link guardian",
    ) as HTMLButtonElement;

  it("lets a guardian go in without an email where the rule does not bind the registrar", async () => {
    rules = { email_required: true, binding_email_required: false };
    await fillEverythingButEmail();

    expect(labelled("Email (optional)")).toBeDefined();
    expect(link().disabled).toBe(false);
  });

  it("asks for the email where the rule binds the registrar", async () => {
    rules = { email_required: false, binding_email_required: true };
    await fillEverythingButEmail();

    expect(labelled("Email")?.textContent).toMatch(/\*$/);
    expect(link().disabled).toBe(true);
    await act(async () => type(inputFor("Email"), "adaeze@example.com"));
    expect(link().disabled).toBe(false);
  });

  it("follows email_required when the server sends no binding value", async () => {
    rules = { email_required: true };
    await fillEverythingButEmail();

    expect(link().disabled).toBe(true);
  });
});

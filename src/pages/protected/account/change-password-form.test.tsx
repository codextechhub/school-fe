import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Changing your own password from Account security.
 *
 * Nneka Okafor, Meridian Crest's administrator, replaces a password that was
 * shared in a chat. The form is driven through the real base query against a
 * stubbed server, so these tests also hold that no refusal escapes as a toast:
 * every one lands under the box it is about.
 */

const toastSpies = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
  message: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: toastSpies }));
vi.mock("@/routes", () => ({ router: { navigate: vi.fn() } }));

import { baseApi } from "@/redux/services/base-api";
import { authSliceReducer } from "@/redux/features/auth/auth-slice";
import { ACTIONS } from "@/lib/action-palette/registry";
import { routesPath } from "@/routes/routesPath";
import {
  ChangePasswordForm,
  MISMATCH_MESSAGE,
  SIGNED_OUT_EVERYWHERE_MESSAGE,
} from "./change-password-form";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const CHANGE_PATH = /\/user\/auth\/password\/change\/$/;
const POLICY_PATH = /\/user\/auth\/password\/policy\/$/;

type Reply = { status: number; body: unknown };
let changeReply: Reply;
const sentBodies: unknown[] = [];

const POLICY = {
  min_length: 12,
  require_uppercase: true,
  require_lowercase: true,
  require_digit: true,
  require_special: true,
  requirements: [
    "At least 12 characters",
    "An uppercase letter (A–Z)",
    "A lowercase letter (a–z)",
    "A number (0–9)",
    "A special character (e.g. ! @ # $ %)",
  ],
};

const fetchMock = vi.fn(async (input: Request) => {
  const { pathname } = new URL(input.url);
  let reply: Reply = { status: 200, body: { success: true, message: "", data: {} } };
  if (input.method === "POST" && CHANGE_PATH.test(pathname)) {
    sentBodies.push(await input.json());
    reply = changeReply;
  } else if (input.method === "GET" && POLICY_PATH.test(pathname)) {
    reply = { status: 200, body: { success: true, message: "Password policy.", data: POLICY } };
  }
  return new Response(JSON.stringify(reply.body), {
    status: reply.status,
    headers: { "content-type": "application/json" },
  });
});

const refusal = (error: unknown): Reply => ({
  status: 400,
  body: { success: false, message: "Invalid request.", error },
});

const makeStore = () =>
  configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer, auth: authSliceReducer },
    middleware: (getDefault) =>
      getDefault({ serializableCheck: false }).concat(baseApi.middleware),
  });

let container: HTMLDivElement;
let root: Root;

beforeEach(async () => {
  changeReply = { status: 200, body: { success: true, message: "Password updated successfully." } };
  sentBodies.length = 0;
  for (const spy of Object.values(toastSpies)) spy.mockClear();
  vi.stubGlobal("fetch", fetchMock);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      <Provider store={makeStore()}>
        <MemoryRouter>
          <ChangePasswordForm />
        </MemoryRouter>
      </Provider>,
    );
  });
  await settle();
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  fetchMock.mockClear();
  vi.unstubAllGlobals();
});

/** Lets the request, the base query and the form's handler all finish. */
async function settle() {
  for (let i = 0; i < 5; i += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

const input = (id: string) => container.querySelector<HTMLInputElement>(`#${id}`)!;

const type = async (id: string, value: string) => {
  const field = input(id);
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  await act(async () => {
    setter.call(field, value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const saveButton = () =>
  [...container.querySelectorAll("button")].find((b) => b.textContent?.includes("Save password"))!;

/** The error line CustomInput draws under a box, or "" when there is none. */
const errorUnder = (id: string) => {
  const wrapper = input(id).closest("div.grid");
  return wrapper?.querySelector("p.text-error-text")?.textContent ?? "";
};

const fill = async (current: string, next: string, confirm = next) => {
  await type("current_password", current);
  await type("new_password", next);
  await type("confirm_password", confirm);
};

const save = async () => {
  await act(async () => saveButton().click());
  await settle();
};

describe("ChangePasswordForm", () => {
  it("sends exactly the current, new and confirmation passwords", async () => {
    await fill("SchoolStaff@2026", "Meridian#Crest2026");
    await save();

    expect(sentBodies).toEqual([
      {
        current_password: "SchoolStaff@2026",
        password: "Meridian#Crest2026",
        confirm_password: "Meridian#Crest2026",
      },
    ]);
  });

  it("shows a wrong current password under Current password", async () => {
    changeReply = refusal({ current_password: ["Current password is incorrect."] });
    await fill("Shared-in-chat1!", "Meridian#Crest2026");
    await save();

    expect(errorUnder("current_password")).toBe("Current password is incorrect.");
    expect(errorUnder("new_password")).toBe("");
    expect(toastSpies.error).not.toHaveBeenCalled();
  });

  it("shows policy refusals under New password", async () => {
    changeReply = refusal({
      password: [
        "This password is too common.",
        "This password must contain a special character.",
      ],
    });
    await fill("SchoolStaff@2026", "Password1234A");
    await save();

    expect(errorUnder("new_password")).toBe(
      "This password is too common. This password must contain a special character.",
    );
    expect(toastSpies.error).not.toHaveBeenCalled();
  });

  it("shows a reused password under New password", async () => {
    changeReply = refusal({ password: ["New password must differ from current password."] });
    await fill("SchoolStaff@2026", "SchoolStaff@2026");
    await save();

    expect(errorUnder("new_password")).toBe("New password must differ from current password.");
  });

  it("catches a mismatch before anything is sent", async () => {
    await fill("SchoolStaff@2026", "Meridian#Crest2026", "Meridian#Crest2025");

    expect(errorUnder("confirm_password")).toBe(MISMATCH_MESSAGE);
    expect(saveButton().disabled).toBe(true);
    await save();
    expect(sentBodies).toEqual([]);
  });

  it("keeps Save off until all three boxes are filled", async () => {
    expect(saveButton().disabled).toBe(true);
    await type("new_password", "Meridian#Crest2026");
    await type("confirm_password", "Meridian#Crest2026");
    expect(saveButton().disabled).toBe(true);
    await type("current_password", "SchoolStaff@2026");
    expect(saveButton().disabled).toBe(false);
  });

  it("clears the boxes and says every device was signed out on success", async () => {
    await fill("SchoolStaff@2026", "Meridian#Crest2026");
    await save();

    expect(input("current_password").value).toBe("");
    expect(input("new_password").value).toBe("");
    expect(input("confirm_password").value).toBe("");
    const status = container.querySelector('[role="status"]')?.textContent ?? "";
    expect(status).toContain("Password changed.");
    expect(status).toContain(SIGNED_OUT_EVERYWHERE_MESSAGE);
    expect(saveButton().disabled).toBe(true);
  });

  it("shows a refusal that names no box in the form, not as a toast", async () => {
    changeReply = {
      status: 403,
      body: { success: false, message: "Your account is not active.", error: {} },
    };
    await fill("SchoolStaff@2026", "Meridian#Crest2026");
    await save();

    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      "Your account is not active.",
    );
    expect(toastSpies.error).not.toHaveBeenCalled();
  });

  it("lists the server's password policy beside the new password", () => {
    const rules = container.querySelector('[aria-label="Password rules"]')?.textContent ?? "";
    for (const rule of POLICY.requirements) expect(rules).toContain(rule);
  });
});

describe("the Change password action", () => {
  it("opens Account security for anybody signed in", () => {
    const action = ACTIONS.find((a) => a.id === "change-password");
    expect(action).toMatchObject({
      label: "Change password",
      gate: null,
      run: { to: routesPath.PROTECTED.ACCOUNT.SECURITY },
    });
  });
});

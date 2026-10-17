import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Account security while proxying.
 *
 * Nneka Okafor, Meridian Crest's administrator, is proxying as the teacher
 * Chidi Eze. Every request now acts as Chidi, so a password changed here would
 * be his. The page withholds the form and tells her how to reach her own.
 */

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));
vi.mock("@/routes", () => ({ router: { navigate: vi.fn() } }));

import { baseApi } from "@/redux/services/base-api";
import { authSliceReducer, setImpersonation } from "@/redux/features/auth/auth-slice";
import type { ActiveImpersonation } from "@/redux/features/auth/auth-types";
import AccountSecurity from "./security";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const PROXY_AS_CHIDI = {
  id: 7,
  tenantSlug: "meridian-crest",
  target: {
    id: 51,
    email: "chidi.eze@meridiancrest.example.com",
    full_name: "Chidi Eze",
    tenant_kind: "SCHOOL",
    role: "Teacher",
    tenant_slug: "meridian-crest",
    tenant_name: "Meridian Crest",
    school_name: "Meridian Crest",
  },
  actor: {},
} as unknown as ActiveImpersonation;

const makeStore = () =>
  configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer, auth: authSliceReducer },
    middleware: (getDefault) =>
      getDefault({ serializableCheck: false }).concat(baseApi.middleware),
  });

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ success: true, message: "", data: {} }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })),
  );
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

const render = async (store: ReturnType<typeof makeStore>) => {
  await act(async () => {
    root.render(
      <Provider store={store}>
        <MemoryRouter>
          <AccountSecurity />
        </MemoryRouter>
      </Provider>,
    );
  });
};

describe("AccountSecurity", () => {
  it("withholds the form while proxying and names whose password it would be", async () => {
    const store = makeStore();
    store.dispatch(setImpersonation(PROXY_AS_CHIDI));
    await render(store);

    expect(container.querySelector("#current_password")).toBeNull();
    expect(container.textContent).toContain("Exit proxy to change your password");
    expect(container.textContent).toContain("You are proxying as Chidi Eze");
  });

  it("shows the form to a person signed in as themselves", async () => {
    await render(makeStore());

    expect(container.querySelector("#current_password")).not.toBeNull();
    expect(container.textContent).not.toContain("Exit proxy");
  });
});

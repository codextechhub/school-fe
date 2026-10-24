/**
 * The ledger entity reaches both export calls.
 *
 * Every Finance and Procurement dataset reads one set of books, and the server
 * resolves which from `?entity=` before it can prepare or run anything. FinPro
 * screens hand the entity to the host's QuickExportButton, so this drives the
 * export through that adapter, as the journal entries screen does, and checks
 * the query string of each request.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const toastSpies = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock("sonner", () => ({ toast: toastSpies }));
vi.mock("@/routes", () => ({ router: { navigate: vi.fn() } }));
vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({ hasAllPermissions: () => true }),
}));

import { baseApi } from "@/redux/services/base-api";
import { authSliceReducer } from "@/redux/features/auth/auth-slice";
import { QuickExportButton } from "@/xvs-host";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const fetchMock = vi.fn(async (input: Request) => {
  const { pathname } = new URL(input.url);
  const data = pathname.endsWith("/from-screen/")
    ? { config: { dataset_key: "finance.gl_postings", columns: [], filters: [] }, unmapped: [] }
    : { run: { id: 1, status: "SUCCEEDED" } };
  return new Response(JSON.stringify({ success: true, message: "Done", data }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
});

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  fetchMock.mockClear();
  vi.unstubAllGlobals();
});

const settle = async () => {
  for (let i = 0; i < 5; i += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
};

const exportWith = async (entity?: string) => {
  const store = configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer, auth: authSliceReducer },
    middleware: (getDefault) =>
      getDefault({ serializableCheck: false }).concat(baseApi.middleware),
  });
  await act(async () => {
    root.render(
      <Provider store={store}>
        <QuickExportButton screen="finance.gl_postings" params={{ source: "MANUAL" }} entity={entity} />
      </Provider>,
    );
  });
  await settle();
  await act(async () => container.querySelector("button")!.click());
  await settle();
  return fetchMock.mock.calls.map(([request]) => new URL((request as Request).url));
};

describe("QuickExportButton", () => {
  it("sends the entity to both the preparation and the run", async () => {
    const [prepare, run] = await exportWith("CSS");

    expect(prepare.pathname).toMatch(/\/exports\/from-screen\/$/);
    expect(prepare.searchParams.get("entity")).toBe("CSS");
    expect(prepare.searchParams.get("source")).toBe("MANUAL");
    expect(run.pathname).toMatch(/\/exports\/quick\/$/);
    expect(run.searchParams.get("entity")).toBe("CSS");
  });

  it("sends no entity for a tenant-scoped screen", async () => {
    const [prepare, run] = await exportWith(undefined);

    expect(prepare.searchParams.has("entity")).toBe(false);
    expect(run.searchParams.has("entity")).toBe(false);
  });
});

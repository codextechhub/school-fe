import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import {
  MemoryRouter,
  Outlet,
  Route,
  Routes,
  useNavigate,
  type NavigateFunction,
} from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}));

vi.mock("@/routes", () => ({ router: { navigate: vi.fn() } }));

import { baseApi } from "@/redux/services/base-api";
import { useRouteAcknowledgement } from "./use-route-acknowledgement";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const makeStore = () =>
  configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });

let navigate: NavigateFunction | null = null;

/** Hands the test the router's own navigate, so moves go through the router. */
function Navigator() {
  const to = useNavigate();
  useEffect(() => {
    navigate = to;
  }, [to]);
  return null;
}

/** Stands in for the protected shell: the one place the hook is mounted. */
function ProtectedShell() {
  useRouteAcknowledgement();
  return <Outlet />;
}

/**
 * The app's own composition, reduced to what decides whether a route is
 * acknowledged: public screens sit outside the shell, protected ones share one
 * mounted instance of it (routes/protected/index.tsx).
 */
function App() {
  return (
    <Routes>
      <Route path="/pay/:token" element={<span>Pay this invoice</span>} />
      <Route element={<ProtectedShell />}>
        <Route path="/export/runs/:id" element={<span>Export run</span>} />
        <Route path="/students" element={<span>Students</span>} />
      </Route>
    </Routes>
  );
}

let container: HTMLDivElement;
let root: Root;

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

const fetchMock = vi.fn(async (_request: unknown) =>
  jsonResponse({
    success: true,
    message: "Acknowledged.",
    data: { updated_count: 0, unread_count: 0 },
  }),
);

/** The paths reported so far, oldest first. */
const acknowledged = async () =>
  Promise.all(
    fetchMock.mock.calls
      .map((call) => call[0] as Request)
      .filter((request) => request.url.includes("/notify/acknowledge-route/"))
      .map(async (request) => (await new Request(request).json()).path),
  );

const go = async (path: string) => {
  await act(async () => {
    navigate?.(path);
  });
};

beforeEach(async () => {
  vi.stubGlobal("fetch", fetchMock);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      <Provider store={makeStore()}>
        <MemoryRouter initialEntries={["/pay/e3b0c442"]}>
          <Navigator />
          <App />
        </MemoryRouter>
      </Provider>,
    );
  });
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  navigate = null;
  fetchMock.mockClear();
  vi.unstubAllGlobals();
});

describe("reporting the route so the bell can clear itself", () => {
  it("says nothing while the caller is on a public screen", async () => {
    // A parent paying an invoice from an emailed link holds no account and has
    // no inbox to acknowledge, so the shell is never mounted for them.
    expect(document.body.textContent).toContain("Pay this invoice");
    expect(await acknowledged()).toEqual([]);
  });

  it("reports each new pathname once, and reports nothing for a query change", async () => {
    await go("/export/runs/8f1c2d34");
    expect(await acknowledged()).toEqual(["/export/runs/8f1c2d34"]);

    await go("/students");
    expect(await acknowledged()).toEqual([
      "/export/runs/8f1c2d34",
      "/students",
    ]);

    // Same record, seen differently. A filter or a page number acknowledges
    // nothing new, and the shell stays mounted across it.
    await go("/students?page=2");
    expect(await acknowledged()).toEqual([
      "/export/runs/8f1c2d34",
      "/students",
    ]);
  });
});

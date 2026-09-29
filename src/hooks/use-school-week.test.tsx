import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}));

vi.mock("@/routes", () => ({ router: { navigate: vi.fn() } }));

import { baseApi } from "@/redux/services/base-api";
import {
  CALENDAR_RULES_URLS,
  calendarApi,
} from "@/redux/services/calendar/calendar-api";
import type { CalendarRules } from "@/redux/services/calendar/calendar-types";
import { useSchoolWeek } from "./use-school-week";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const makeStore = () =>
  configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });
type Store = ReturnType<typeof makeStore>;

let container: HTMLDivElement;
let root: Root;
let seen: ReturnType<typeof useSchoolWeek> | null = null;

/** Hands the hook's answer to the test after each render. */
function Probe() {
  const week = useSchoolWeek();
  useEffect(() => {
    seen = week;
  }, [week]);
  return null;
}

const render = async (store: Store) => {
  await act(async () => {
    root.render(
      <Provider store={store}>
        <Probe />
      </Provider>,
    );
  });
};

/** A rules request that never answers, so the hook stays on its fallback. */
const pending = vi.fn((_input: RequestInfo | URL) => new Promise<Response>(() => {}));

const requested = () =>
  pending.mock.calls.map(([input]) => (input instanceof Request ? input.url : String(input)));

beforeEach(() => {
  vi.stubGlobal("fetch", pending);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  seen = null;
  pending.mockClear();
  vi.unstubAllGlobals();
});

describe("useSchoolWeek", () => {
  it("answers Monday to Friday, Monday first, while the rules load", async () => {
    await render(makeStore());

    expect(seen).toEqual({ weekStartsOn: 1, teachingDays: [1, 2, 3, 4, 5] });
    expect(requested().some((url) => url.includes(CALENDAR_RULES_URLS.rules))).toBe(true);
  });

  it("starts a Sunday-first school's week on Sunday, with its own days", async () => {
    const store = makeStore();
    await act(async () => {
      store.dispatch(
        calendarApi.util.upsertQueryData("getCalendarRules", undefined, {
          success: true,
          message: "",
          data: {
            teaching_days: [7, 1, 2, 3, 4],
            week_starts_on: 7,
          } as CalendarRules,
        }),
      );
    });
    await render(store);

    expect(seen).toEqual({ weekStartsOn: 0, teachingDays: [7, 1, 2, 3, 4] });
  });
});

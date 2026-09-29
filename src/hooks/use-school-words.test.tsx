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
import { academicsApi } from "@/redux/services/academics/academics-api";
import { schoolApi } from "@/redux/services/school/school-api";
import type { SchoolProfile } from "@/redux/services/school/school-types";
import { useSchoolWords, type SchoolWords } from "./use-school-words";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const makeStore = () =>
  configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });
type Store = ReturnType<typeof makeStore>;

let container: HTMLDivElement;
let root: Root;
let seen: SchoolWords | null = null;

/** Hands the hook's answer to the test after each render. */
function Probe() {
  const words = useSchoolWords();
  useEffect(() => {
    seen = words;
  }, [words]);
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

/** Every URL the hook has asked for so far. */
const requested = () =>
  pending.mock.calls.map(([input]) => (input instanceof Request ? input.url : String(input)));

const envelope = <T,>(data: T) => ({ success: true, message: "", data });

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

/**
 * Greenfield Academy runs two semesters. Its profile says so from onboarding,
 * and its academic rules say so too, with its own names and arms.
 */
describe("useSchoolWords", () => {
  it("says Term while the rules are loading and no profile is cached", async () => {
    await render(makeStore());

    expect(seen?.Term).toBe("Term");
    expect(seen?.settled).toBe(false);
    // The profile is read from the cache only, never requested for the word.
    expect(requested().some((url) => url.includes("/academics/rules/"))).toBe(true);
    expect(requested().some((url) => url.includes("/i/me/profile/"))).toBe(false);
  });

  it("falls back to a cached profile's term structure while the rules load", async () => {
    const store = makeStore();
    await act(async () => {
      store.dispatch(
        schoolApi.util.upsertQueryData(
          "getSchoolProfile",
          undefined,
          envelope({ term_structure: "2_SEMESTERS" } as SchoolProfile),
        ),
      );
    });
    await render(store);

    expect(seen?.Terms).toBe("Semesters");
    expect(seen?.termNames).toEqual(["First Semester", "Second Semester"]);
  });

  it("uses the school's rules once they have answered", async () => {
    const store = makeStore();
    await act(async () => {
      store.dispatch(
        academicsApi.util.upsertQueryData(
          "getAcademicRules",
          undefined,
          envelope({
            term_word: "SEMESTER" as const,
            term_word_options: [],
            term_names: ["Harmattan Semester", "Rain Semester"],
            default_arms: ["Gold", "Silver"],
          }),
        ),
      );
    });
    await render(store);

    expect(seen?.term).toBe("semester");
    expect(seen?.termNames).toEqual(["Harmattan Semester", "Rain Semester"]);
    expect(seen?.defaultArms).toEqual(["Gold", "Silver"]);
    expect(seen?.settled).toBe(true);
  });
});

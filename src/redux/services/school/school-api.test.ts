import { configureStore } from "@reduxjs/toolkit";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}));

import { academicsApi } from "../academics/academics-api";
import { baseApi } from "../base-api";
import { schoolApi } from "./school-api";

const makeStore = () =>
  configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });

const response = (data: unknown) =>
  new Response(JSON.stringify({ success: true, message: "Saved.", data }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("school profile cache dependencies", () => {
  it("reloads academic defaults after the term structure changes", async () => {
    let rulesReads = 0;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? input : new Request(input, init);
      if (request.url.includes("/academics/rules/")) {
        rulesReads += 1;
        const semester = rulesReads > 1;
        return response({
          term_word: semester ? "SEMESTER" : "TERM",
          term_word_options: [],
          term_names: semester
            ? ["First Semester", "Second Semester"]
            : ["First Term", "Second Term", "Third Term"],
          default_arms: ["A", "B", "C"],
        });
      }
      if (request.url.includes("/i/me/profile/") && request.method === "PATCH") {
        return response({ term_structure: "2_SEMESTERS" });
      }
      throw new Error(`Unexpected request: ${request.method} ${request.url}`);
    }));

    const store = makeStore();
    const rules = store.dispatch(academicsApi.endpoints.getAcademicRules.initiate());
    await rules.unwrap();

    await store.dispatch(
      schoolApi.endpoints.updateSchoolProfile.initiate({
        term_structure: "2_SEMESTERS",
      }),
    ).unwrap();

    await vi.waitFor(() => {
      expect(rulesReads).toBe(2);
      expect(
        academicsApi.endpoints.getAcademicRules.select()(store.getState()).data?.data.term_names,
      ).toEqual(["First Semester", "Second Semester"]);
    });

    rules.unsubscribe();
  });
});

import { describe, expect, it } from "vitest";

import { dayParams } from "./attendance-params";

describe("dayParams", () => {
  it("sends nothing for today across every branch", () => {
    expect(dayParams()).toEqual({});
    expect(dayParams({ branch: "all" })).toEqual({});
  });

  it("sends a chosen day and a chosen branch", () => {
    expect(dayParams({ date: "2026-10-09", branch: 22 })).toEqual({
      date: "2026-10-09",
      branch: 22,
    });
  });
});

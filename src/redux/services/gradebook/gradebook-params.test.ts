import { describe, expect, it } from "vitest";

import { termParams } from "./gradebook-params";

describe("termParams", () => {
  it("sends nothing for the current term across every branch", () => {
    expect(termParams()).toEqual({});
    expect(termParams({ branch: "all" })).toEqual({});
  });

  it("sends a named term and a named branch", () => {
    expect(termParams({ term: 44, branch: 22 })).toEqual({ term: 44, branch: 22 });
  });
});

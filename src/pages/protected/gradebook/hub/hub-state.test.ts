import { describe, expect, it } from "vitest";

import type { HubClass } from "@/redux/services/gradebook/gradebook-types";

import { filterHubClasses, hubStageOptions } from "./hub-state";

const classes = [
  { id: 1, name: "JSS 1 Blue", stage: "ENTERING" },
  { id: 2, name: "JSS 2 Gold", stage: "COMPILING" },
  { id: 3, name: "Primary 6 Rose", stage: "AWAITING" },
  { id: 4, name: "SS 1 Science", stage: "PUBLISHED" },
] as HubClass[];

describe("results hub stage filter", () => {
  it("keeps awaiting approval and published classes in one compact final stage", () => {
    expect(filterHubClasses(classes, "FINAL").map((item) => item.id)).toEqual([3, 4]);
  });

  it("reports counts from the same class rows the filter displays", () => {
    expect(hubStageOptions(classes).map(({ value, count }) => [value, count])).toEqual([
      ["ALL", 4],
      ["ENTERING", 1],
      ["COMPILING", 1],
      ["FINAL", 2],
    ]);
  });
});

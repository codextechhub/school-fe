import { describe, expect, it } from "vitest";

import type { PromotionPlan } from "@/redux/services/students/students-types";

import { outcomeFor, reviewCounts } from "./promotion-model";

const plan = {
  students: [
    { id: 1, outcome: "PROMOTE" },
    { id: 2, outcome: "PROMOTE" },
    { id: 3, outcome: "GRADUATE" },
    { id: 4, outcome: "HOLD" },
  ],
} as PromotionPlan;

describe("promotion review model", () => {
  it("uses a student's override before the server default", () => {
    expect(outcomeFor(plan.students[0], { "1": "REPEAT" })).toBe("REPEAT");
    expect(outcomeFor(plan.students[0], {})).toBe("PROMOTE");
  });

  it("recalculates every review count after overrides", () => {
    expect(reviewCounts(plan, { "1": "REPEAT", "4": "PROMOTE" })).toEqual({
      promote: 2,
      repeat: 1,
      graduate: 1,
      hold: 0,
    });
  });
});

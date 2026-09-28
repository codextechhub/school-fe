import { describe, expect, it } from "vitest";

import type { PromotionPlan } from "@/redux/services/students/students-types";

import { destinationOf } from "./outcome";
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

describe("destinationOf", () => {
  const empty = { exceptions: { by_class: [], by_student: [] } } as unknown as PromotionPlan;

  it("names every class a spread year group lands in", () => {
    const row = {
      from_id: 1,
      to: "JSS2 A, JSS2 B, JSS2 C",
      to_classes: [{ name: "JSS2 A" }, { name: "JSS2 B" }, { name: "JSS2 C" }],
      terminal: false,
    };
    expect(destinationOf(empty, row).label).toBe("Spread: JSS2 A, JSS2 B, JSS2 C");
  });

  it("names the one class when the arm is kept", () => {
    const row = { from_id: 1, to: "JSS2 B", to_classes: [{ name: "JSS2 B" }], terminal: false };
    expect(destinationOf(empty, row).label).toBe("JSS2 B");
  });
});

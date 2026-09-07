import { describe, expect, it } from "vitest";
import { SECTION_ORDER, groupBySection } from "./index";
import { testAction } from "./test-actions";
import type { ActionDef, ActionSection, ScoredAction } from "./types";

const scored = (action: ActionDef, tier = 3, popularity = 0): ScoredAction => ({
  action,
  tier,
  popularity,
  matchScore: 0,
});

describe("SECTION_ORDER", () => {
  it("lists every section exactly once", () => {
    const all: ActionSection[] = [
      "Overview",
      "People",
      "Academics",
      "Finance",
      "Procurement",
      "Settings",
      "Data",
      "Onboarding",
      "Account",
    ];
    expect([...SECTION_ORDER].sort()).toEqual([...all].sort());
    expect(new Set(SECTION_ORDER).size).toBe(SECTION_ORDER.length);
  });
});

describe("groupBySection", () => {
  it("returns the fixed section order, not the relevance order", () => {
    const results = [
      scored(testAction("logout")), // Account
      scored(testAction("view-fee-invoices")), // Finance
      scored(testAction("view-students")), // People
    ];
    expect(groupBySection(results).map((g) => g.section)).toEqual(["People", "Finance", "Account"]);
  });

  it("preserves relevance order inside a group", () => {
    const results = [
      scored(testAction("enroll-student"), 4),
      scored(testAction("view-students"), 3),
    ];
    const people = groupBySection(results)[0];
    expect(people.section).toBe("People");
    expect(people.items.map((i) => i.action.id)).toEqual(["enroll-student", "view-students"]);
  });

  it("omits empty sections", () => {
    expect(groupBySection([scored(testAction("view-home"))]).map((g) => g.section)).toEqual([
      "Overview",
    ]);
  });

  it("returns nothing for no results", () => {
    expect(groupBySection([])).toEqual([]);
  });
});

describe("ActionRun commands", () => {
  it("covers exactly the header account-menu commands", () => {
    expect(testAction("proxy-user").run).toEqual({ command: "proxy" });
    expect(testAction("logout").run).toEqual({ command: "logout" });
  });
});

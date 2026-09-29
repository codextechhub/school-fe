import { describe, expect, it } from "vitest";

import { termWordsFor } from "@/lib/school-words";
import { scoreAction, TIER } from "./match";
import { ACTIONS } from "./registry";
import { inSchoolWords, labelInSchoolWords } from "./school-words";

const SEMESTER = termWordsFor("SEMESTER");
const TERM = termWordsFor("TERM");
const calendar = ACTIONS.find((action) => action.id === "view-term-calendar")!;

describe("palette labels in the school's word", () => {
  it("rewords a label for a school that runs semesters", () => {
    expect(labelInSchoolWords("View term calendar", SEMESTER)).toBe(
      "View semester calendar",
    );
    expect(labelInSchoolWords("Sessions & Terms", SEMESTER)).toBe(
      "Sessions & Semesters",
    );
  });

  it("leaves words that only contain the letters alone", () => {
    expect(labelInSchoolWords("View terminal levels", SEMESTER)).toBe(
      "View terminal levels",
    );
  });

  it("hands back the same list for a school that says term", () => {
    expect(inSchoolWords(ACTIONS, TERM)).toBe(ACTIONS);
  });

  it("finds the calendar by either word, at either kind of school", () => {
    for (const words of [TERM, SEMESTER]) {
      const [action] = inSchoolWords([calendar], words);
      expect(scoreAction(action, "semester")?.tier ?? TIER.NONE).toBeGreaterThan(TIER.NONE);
      expect(scoreAction(action, "term view")?.tier ?? TIER.NONE).toBeGreaterThan(TIER.NONE);
    }
  });
});

import { describe, expect, it } from "vitest";

import {
  blankTerms,
  dayAfter,
  dayLabel,
  scopeOf,
  statusOf,
  teachingWeeks,
  termProblem,
  termState,
  termWindows,
  weeksBetween,
} from "./session-format";
import type { AcademicSession } from "@/redux/services/academics/academics-types";

const session = (over: Partial<AcademicSession> = {}): AcademicSession => ({
  id: 1,
  name: "2026/2027",
  start_date: "2026-08-17",
  end_date: "2027-07-16",
  status: "ACTIVE",
  activated_at: null,
  archived_at: null,
  terms: [],
  term_count: 0,
  ...over,
});

describe("termState", () => {
  const term = { start_date: "2026-09-01", end_date: "2026-12-11" };

  it("reads a term that has ended as completed", () => {
    expect(termState(term, "2027-01-05")).toBe("completed");
  });

  it("reads a term that has started and not ended as ongoing", () => {
    expect(termState(term, "2026-10-01")).toBe("ongoing");
  });

  it("counts the first and last day as inside the term", () => {
    expect(termState(term, "2026-09-01")).toBe("ongoing");
    expect(termState(term, "2026-12-11")).toBe("ongoing");
  });

  it("reads a term that has not started as pending", () => {
    expect(termState(term, "2026-08-31")).toBe("pending");
  });

  it("treats a term with no dates as pending, not as completed", () => {
    // "" < any date string, so a naive comparison would call an undated term
    // completed and print a tick against a term nobody has scheduled.
    expect(termState({ start_date: "", end_date: "" }, "2026-10-01")).toBe("pending");
  });
});

describe("scopeOf", () => {
  it("renders the server's sentence when there is one", () => {
    expect(scopeOf(session({ scope_label: "Lekki Branch, Ikeja Branch" }))).toBe(
      "Lekki Branch, Ikeja Branch",
    );
  });

  it("says the whole school when the field was dropped", () => {
    // A single-branch school gets no scope_label at all, and absent must read
    // as "everywhere" rather than as "no branches set".
    expect(scopeOf(session())).toBe("The whole school");
  });
});

describe("statusOf", () => {
  it("labels the three statuses the API can send", () => {
    expect(statusOf("ACTIVE").label).toBe("Active");
    expect(statusOf("DRAFT").label).toBe("Draft");
    expect(statusOf("ARCHIVED").label).toBe("Archived");
  });

  it("prints an unknown status rather than nothing", () => {
    // A status this build has not heard of must not render as a blank chip.
    expect(statusOf("CLOSED").label).toBe("CLOSED");
  });
});

describe("teaching weeks", () => {
  it("rounds a dated term to whole weeks", () => {
    expect(weeksBetween("2026-09-01", "2026-12-08")).toBe(14);
  });

  it("adds all terms and ignores undated terms", () => {
    expect(
      teachingWeeks([
        { start_date: "2026-09-01", end_date: "2026-12-08" },
        { start_date: "2027-01-04", end_date: "2027-03-29" },
        { start_date: "", end_date: "" },
      ]),
    ).toBe(26);
  });
});

describe("termWindows", () => {
  const year = { start: "2026-09-07", end: "2027-07-16" };
  const term = (name: string, start_date = "", end_date = "") => ({
    name,
    start_date,
    end_date,
  });

  it("opens the first term from the session start", () => {
    const [first] = termWindows([term("First Term")], year);
    expect(first).toMatchObject({
      waitingOn: null,
      startMin: "2026-09-07",
      max: "2027-07-16",
    });
  });

  it("keeps later terms shut until the term before has an end date", () => {
    const windows = termWindows(
      [term("First Term", "2026-09-07"), term("Second Term"), term("Third Term")],
      year,
    );
    expect(windows[1].waitingOn).toBe("First Term");
    expect(windows[1].startMin).toBeUndefined();
    expect(windows[2].waitingOn).toBe("Second Term");
  });

  it("opens the next term from the day after the previous one ends", () => {
    const windows = termWindows(
      [
        term("First Term", "2026-09-07", "2026-12-18"),
        term("Second Term"),
        term("Third Term"),
      ],
      year,
    );
    expect(windows[1]).toMatchObject({
      waitingOn: null,
      startMin: "2026-12-19",
      follows: { name: "First Term", end: "2026-12-18" },
    });
    expect(windows[2].waitingOn).toBe("Second Term");
  });

  it("applies the same chain to two semesters", () => {
    const windows = termWindows(
      [term("First Semester", "2026-09-07", "2027-01-29"), term("Second Semester")],
      year,
    );
    expect(windows[1].startMin).toBe("2027-01-30");
  });

  it("opens a term's end from the day after its own start", () => {
    const [first] = termWindows([term("First Term", "2026-09-07")], year);
    expect(first.endMin).toBe("2026-09-08");
  });

  it("names an unnamed term by its position", () => {
    const windows = termWindows([term(""), term("Second Term")], year);
    expect(windows[1].waitingOn).toBe("Term 1");
  });

  it("names an unnamed row in the school's own word", () => {
    const windows = termWindows(
      [term(""), term("Second Semester")],
      year,
      "Semester",
    );
    expect(windows[1].waitingOn).toBe("Semester 1");
  });
});

describe("termProblem", () => {
  const year = { start: "2026-09-07", end: "2027-07-16" };

  it("flags a term that starts on or before the previous one ends", () => {
    const terms = [
      { name: "First Term", start_date: "2026-09-07", end_date: "2026-12-18" },
      { name: "Second Term", start_date: "2026-12-18", end_date: "2027-04-02" },
    ];
    expect(termProblem(terms, 1, year)).toBe(
      "Second Term starts before First Term ends.",
    );
  });

  it("flags a term that ends on the day it starts", () => {
    const terms = [
      { name: "First Term", start_date: "2026-09-07", end_date: "2026-09-07" },
    ];
    expect(termProblem(terms, 0, year)).toBe(
      "First Term ends on or before it starts.",
    );
  });

  it("names an unnamed semester in the school's word", () => {
    const terms = [{ name: "", start_date: "2026-09-07", end_date: "2026-09-07" }];
    expect(termProblem(terms, 0, year, "Semester")).toBe(
      "Semester 1 ends on or before it starts.",
    );
  });

  it("accepts terms that follow one another", () => {
    const terms = [
      { name: "First Term", start_date: "2026-09-07", end_date: "2026-12-18" },
      { name: "Second Term", start_date: "2027-01-05", end_date: "2027-04-02" },
    ];
    expect(termProblem(terms, 1, year)).toBe("");
  });
});

/**
 * Greenfield Academy runs two semesters and names them itself; Bright Star
 * School keeps the three terms every school starts with.
 */
describe("blankTerms", () => {
  it("opens a new year on one undated row per school term name", () => {
    expect(blankTerms(["Harmattan Semester", "Rain Semester"])).toEqual([
      { name: "Harmattan Semester", order_index: 1, start_date: "", end_date: "" },
      { name: "Rain Semester", order_index: 2, start_date: "", end_date: "" },
    ]);
  });

  it("keeps the count and order of the names it is given", () => {
    const rows = blankTerms(["First Term", "Second Term", "Third Term"]);
    expect(rows.map((row) => [row.name, row.order_index])).toEqual([
      ["First Term", 1],
      ["Second Term", 2],
      ["Third Term", 3],
    ]);
  });

  it("opens with no rows when there are no names", () => {
    expect(blankTerms([])).toEqual([]);
  });
});

describe("dayAfter and dayLabel", () => {
  it("rolls over the end of a month and a year", () => {
    expect(dayAfter("2026-12-31")).toBe("2027-01-01");
    expect(dayAfter("2027-02-28")).toBe("2027-03-01");
  });

  it("prints a calendar day without shifting it", () => {
    expect(dayLabel("2026-12-18")).toBe("18 Dec 2026");
  });

  it("prints it in the school's date style", () => {
    const prefs = { timeZone: "Africa/Lagos", dateFormat: "YYYY_MM_DD", clock: "H12" } as const;
    expect(dayLabel("2026-12-18", prefs)).toBe("2026-12-18");
  });
});

import { describe, expect, it } from "vitest";

import {
  scopeOf,
  statusOf,
  teachingWeeks,
  termState,
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

import { describe, expect, it } from "vitest";

import { buildAttention } from "./attention";
import { termWordsFor } from "@/lib/school-words";
import type { CalendarAlert } from "@/redux/services/calendar/calendar-types";
import type { OnboardingState } from "@/redux/services/onboarding/onboarding-types";
import type { StudentSummary } from "@/redux/services/students/students-types";
import type { StaffCounts } from "@/redux/services/staff/staff-types";

const alert = (
  code: CalendarAlert["code"],
  detail = "something",
  ids: number[] = [],
): CalendarAlert => ({ code, detail, ids });

const onboarding = (blocking: string[], blocked = true) =>
  ({
    go_live_blocked: blocked,
    blocking_tasks: blocking,
  }) as unknown as OnboardingState;

describe("buildAttention", () => {
  it("has nothing to say when nothing is wrong", () => {
    expect(buildAttention({})).toEqual([]);
    expect(buildAttention({ alerts: [], branchesWithoutSession: [] })).toEqual([]);
  });

  it("renders the server's sentence rather than writing its own", () => {
    // The server knows which class has no timetable. A second implementation
    // here is a second answer that will disagree the day a rule changes.
    const detail = "2 classes have no timetable: JSS1 A, JSS1 B.";
    const [item] = buildAttention({
      alerts: [alert("CLASS_HAS_NO_TIMETABLE", detail, [1, 2])],
    });
    expect(item.detail).toBe(detail);
  });

  it("puts going live above everything else", () => {
    const items = buildAttention({
      alerts: [alert("TIMETABLE_HAS_CLASHES"), alert("SESSION_HAS_NO_TERMS")],
      onboarding: onboarding(["profile", "roles"]),
    });
    expect(items[0].id).toBe("go-live");
    expect(items[0].tone).toBe("blocking");
    expect(items[0].detail).toContain("2 required setup steps");
  });

  it("counts one blocking step in words a person would use", () => {
    const [item] = buildAttention({ onboarding: onboarding(["profile"]) });
    expect(item.detail).toContain("One required setup step");
    expect(item.detail).not.toContain("1 required");
  });

  it("says nothing about going live once the gate is open", () => {
    // A live school is not "0 steps outstanding", it is simply not blocked.
    expect(buildAttention({ onboarding: onboarding([], false) })).toEqual([]);
    expect(buildAttention({ onboarding: onboarding([]) })).toEqual([]);
  });

  it("orders alerts by what it costs to be wrong, not by arrival", () => {
    const items = buildAttention({
      alerts: [
        alert("EVENT_OUTSIDE_ANY_TERM"),
        alert("CLASS_HAS_NO_TIMETABLE"),
        alert("SESSION_HAS_NO_TERMS"),
        alert("TIMETABLE_HAS_CLASHES"),
      ],
    });
    // The id is `<code>-<ids>`; the codes carry underscores, so the code is
    // everything up to the last hyphen.
    expect(items.map((i) => i.id.replace(/-[^-]*$/, ""))).toEqual([
      "SESSION_HAS_NO_TERMS",
      "TIMETABLE_HAS_CLASHES",
      "CLASS_HAS_NO_TIMETABLE",
      "EVENT_OUTSIDE_ANY_TERM",
    ]);
  });

  it("treats a year with no terms as blocking and a stray event as information", () => {
    const [blocking] = buildAttention({ alerts: [alert("SESSION_HAS_NO_TERMS")] });
    const [info] = buildAttention({ alerts: [alert("EVENT_OUTSIDE_ANY_TERM")] });
    expect(blocking.tone).toBe("blocking");
    expect(info.tone).toBe("info");
  });

  it("titles the calendar alerts in the school's word for a term", () => {
    const alerts = [alert("SESSION_HAS_NO_TERMS"), alert("TERM_DATES_OVERLAP")];

    const [missing, overlap] = buildAttention({
      alerts,
      words: termWordsFor("SEMESTER"),
    });
    expect(missing.title).toBe("The year has no semesters");
    expect(missing.action).toBe("Add semesters");
    expect(overlap.title).toBe("Semesters overlap");

    const [termMissing] = buildAttention({ alerts });
    expect(termMissing.title).toBe("The year has no terms");
  });

  it("names a branch that is in no year at all", () => {
    const [item] = buildAttention({
      branchesWithoutSession: [{ id: 4, name: "Ikeja Branch" }],
    });
    expect(item.tone).toBe("blocking");
    expect(item.detail).toContain("Ikeja Branch");
    expect(item.action).toBe("Give it a year");
  });

  it("sends every item somewhere it can be acted on", () => {
    const items = buildAttention({
      alerts: [
        alert("SESSION_HAS_NO_TERMS"),
        alert("TIMETABLE_HAS_CLASHES"),
        alert("EVENT_OUTSIDE_ANY_TERM"),
      ],
      onboarding: onboarding(["profile"]),
      branchesWithoutSession: [{ id: 4, name: "Ikeja Branch" }],
    });
    expect(items).toHaveLength(5);
    for (const item of items) {
      expect(item.to).toMatch(/^\//);
      expect(item.action.length).toBeGreaterThan(0);
    }
  });

  it("sorts an unknown alert code last instead of throwing", () => {
    // The server owns this list. A school seeing a new warning at the bottom
    // beats a dashboard that will not render.
    const future = alert(
      "SOMETHING_NEW" as CalendarAlert["code"],
      "A rule this build has not heard of.",
    );
    const items = buildAttention({
      alerts: [future, alert("CLASS_HAS_NO_TIMETABLE")],
    });
    expect(items).toHaveLength(2);
    expect(items[1].detail).toBe("A rule this build has not heard of.");
    expect(items[1].tone).toBe("info");
    expect(items[1].to).toMatch(/^\//);
  });

  it("keeps two alerts of the same code apart by the rows they name", () => {
    const items = buildAttention({
      alerts: [
        alert("TIMETABLE_HAS_CLASHES", "JSS1 A clashes.", [1]),
        alert("TIMETABLE_HAS_CLASHES", "JSS2 B clashes.", [2]),
      ],
    });
    expect(new Set(items.map((i) => i.id)).size).toBe(2);
  });

  it("adds work from the modules that joined the school dashboard", () => {
    const items = buildAttention({
      pendingApprovals: 3,
      students: { applicants: 4, unassigned: 2 } as StudentSummary,
      staff: { locked_accounts: 1 } as StaffCounts,
    });

    expect(items.map((item) => item.id)).toEqual([
      "pending-approvals",
      "students-unassigned",
      "student-applicants",
      "staff-locked-accounts",
    ]);
    expect(items.every((item) => item.mine)).toBe(true);
  });

  it("keeps structural problems ahead of personal queues and notices last", () => {
    const items = buildAttention({
      alerts: [
        alert("EVENT_OUTSIDE_ANY_TERM"),
        alert("TIMETABLE_HAS_CLASHES"),
      ],
      pendingApprovals: 2,
      students: { applicants: 1, unassigned: 1 } as StudentSummary,
    });

    expect(items.map((item) => item.id)).toEqual([
      "TIMETABLE_HAS_CLASHES-all",
      "pending-approvals",
      "students-unassigned",
      "student-applicants",
      "EVENT_OUTSIDE_ANY_TERM-all",
    ]);
  });

  it("does not invent work for zero-value module summaries", () => {
    expect(buildAttention({
      pendingApprovals: 0,
      students: { applicants: 0, unassigned: 0 } as StudentSummary,
      staff: { locked_accounts: 0 } as StaffCounts,
    })).toEqual([]);
  });
});

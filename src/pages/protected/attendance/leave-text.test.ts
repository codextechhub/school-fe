import { describe, expect, it } from "vitest";

import { leaveLinkText, onLeaveClause } from "./leave-text";

const day = (iso: string) => `D(${iso})`;

/**
 * Mrs Okafor, class teacher of JSS 1A, is on annual leave until 6 Nov. A
 * register taken for her names the leave; a reader who may not read the type
 * or the dates still sees that she is away.
 */
describe("onLeaveClause", () => {
  it("names the type and the day she returns", () => {
    expect(onLeaveClause({ leave_type_label: "Annual", ends_on: "2026-11-06" }, day)).toBe(
      ", who is on annual leave until D(2026-11-06)",
    );
  });

  it("leaves out the type when the reader may not read it", () => {
    expect(onLeaveClause({ ends_on: "2026-11-06" }, day)).toBe(", who is on leave until D(2026-11-06)");
  });

  it("leaves out the end date when the reader may not read it", () => {
    expect(onLeaveClause({ leave_type_label: "Annual" }, day)).toBe(", who is on annual leave");
  });

  it("only says she is on leave when neither is readable, and says nothing without leave", () => {
    expect(onLeaveClause({}, day)).toBe(", who is on leave");
    expect(onLeaveClause(null, day)).toBe("");
  });
});

describe("leaveLinkText", () => {
  it("names the type and the last day", () => {
    expect(leaveLinkText({ type_label: "Sick", end_date: "2026-11-06" }, day)).toBe("Sick leave to D(2026-11-06)");
  });

  it("copes with either missing, and with both", () => {
    expect(leaveLinkText({ end_date: "2026-11-06" }, day)).toBe("Leave to D(2026-11-06)");
    expect(leaveLinkText({ type_label: "Sick" }, day)).toBe("Sick leave");
    expect(leaveLinkText({}, day)).toBe("View leave");
  });
});

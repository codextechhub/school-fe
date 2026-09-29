import { describe, expect, it } from "vitest";

import { blankEvent, closesSchoolShown } from "./event-draft";

const byType = { HOLIDAY: true, MIDTERM_BREAK: true, PTA: false };

describe("closesSchoolShown", () => {
  it("ticks the box for a new holiday when the school says holidays close it", () => {
    const draft = blankEvent(null);
    expect(draft.event_type).toBe("HOLIDAY");
    expect(
      closesSchoolShown({
        editing: false,
        chosen: false,
        eventType: draft.event_type,
        byType,
        value: draft.closes_school,
      }),
    ).toBe(true);
  });

  it("follows the type as it changes", () => {
    const shown = (eventType: "PTA" | "MIDTERM_BREAK") =>
      closesSchoolShown({ editing: false, chosen: false, eventType, byType, value: false });
    expect(shown("PTA")).toBe(false);
    expect(shown("MIDTERM_BREAK")).toBe(true);
  });

  it("keeps the person's own answer once they have changed the box", () => {
    expect(
      closesSchoolShown({
        editing: false,
        chosen: true,
        eventType: "HOLIDAY",
        byType,
        value: false,
      }),
    ).toBe(false);
  });

  it("never changes an event being edited", () => {
    expect(
      closesSchoolShown({
        editing: true,
        chosen: false,
        eventType: "HOLIDAY",
        byType,
        value: false,
      }),
    ).toBe(false);
  });

  it("keeps the box as it is for a type the rules do not mention, or before they load", () => {
    expect(
      closesSchoolShown({
        editing: false,
        chosen: false,
        eventType: "SPORTS",
        byType,
        value: false,
      }),
    ).toBe(false);
    expect(
      closesSchoolShown({
        editing: false,
        chosen: false,
        eventType: "HOLIDAY",
        byType: {},
        value: false,
      }),
    ).toBe(false);
  });
});

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type {
  ClassTimetable,
  TimetableSlot,
} from "@/redux/services/calendar/calendar-types";
import { publishCheckFor, splitWarnings } from "./publish-check";
import { PublishCheckPanel } from "./publish-check-panel";
import { DutyNote } from "./duty-note";
import { invigilatorOptions } from "./paper-values";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const slot = (id: number, over: Partial<TimetableSlot>): TimetableSlot => ({
  id,
  school_class: 10,
  class_name: "JSS1 A",
  day_of_week: 1,
  period: 1,
  period_label: "Period 1",
  subject: 1,
  subject_name: "Mathematics",
  teacher: { id: 20, name: "Ngozi Eze" },
  room: 5,
  room_name: "Room 5",
  ...over,
});

const grid = (slots: TimetableSlot[], warnings: ClassTimetable["warnings"] = []): ClassTimetable => ({
  school_class: { id: 10, name: "JSS1 A" },
  session: { id: 3, name: "2026/2027" },
  has_bell_schedule: true,
  status: "DRAFT",
  status_label: "Draft",
  published_at: null,
  filled: slots.length,
  lesson_periods: 10,
  warnings,
  days: [
    {
      day_of_week: 1,
      day_label: "Monday",
      cells: slots.map((s, i) => ({
        period: i + 1,
        period_label: `Period ${i + 1}`,
        kind: "LESSON",
        slot: s,
      })),
    },
  ],
});

const noRoom = slot(1, { room: null, room_name: null });
const noTeacher = slot(2, { teacher: null, subject_name: "English" });
const noDuty = slot(3, { subject_name: "Physics", teacher: { id: 21, name: "Tunde Bello" } });
const dutyWarning = {
  code: "TEACHER_HAS_NO_DUTY",
  detail: "Tunde Bello has no teaching duty for JSS1 A Physics.",
  slot_ids: [3],
};
const clash = { code: "TEACHER_DOUBLE_BOOKED", detail: "Ngozi Eze is double-booked.", slot_ids: [1] };

describe("publishCheckFor", () => {
  it("never says a lesson needs a room when rooms are optional", () => {
    const check = publishCheckFor(grid([noRoom, noTeacher]), {
      roomRequired: false,
      dutyMatch: "OFF",
    });
    expect(check.missing.map((m) => m.needs)).toEqual(["needs a teacher"]);
  });

  it("lists a missing room when the school requires one", () => {
    const both = slot(4, { teacher: null, room: null });
    const check = publishCheckFor(grid([noRoom, noTeacher, both]), {
      roomRequired: true,
      dutyMatch: "OFF",
    });
    expect(check.missing.map((m) => m.needs)).toEqual([
      "needs a room",
      "needs a teacher",
      "needs a teacher and a room",
    ]);
    expect(check.blocking).toBe(true);
  });

  it("lists a duty mismatch with its class, subject and teacher under WARN, without blocking", () => {
    const check = publishCheckFor(grid([noDuty], [dutyWarning]), {
      roomRequired: true,
      dutyMatch: "WARN",
    });
    expect(check.duty).toMatchObject([
      { className: "JSS1 A", subject: "Physics", teacher: "Tunde Bello" },
    ]);
    expect(check.dutySeverity).toBe("warning");
    expect(check.blocking).toBe(false);
  });

  it("blocks on a duty mismatch under REFUSE, and says nothing under OFF", () => {
    const g = grid([noDuty], [dutyWarning]);
    expect(publishCheckFor(g, { roomRequired: true, dutyMatch: "REFUSE" }).blocking).toBe(true);
    expect(publishCheckFor(g, { roomRequired: true, dutyMatch: "OFF" }).duty).toEqual([]);
  });

  it("blocks on a lesson left on a day the school no longer teaches", () => {
    const g = grid([noDuty]);
    g.days.push({
      day_of_week: 6,
      day_label: "Saturday",
      is_teaching_day: false,
      cells: [
        {
          period: 1,
          period_label: "Period 1",
          kind: "LESSON",
          slot: slot(7, { day_of_week: 6, subject_name: "Mathematics" }),
        },
      ],
    });
    const check = publishCheckFor(g, { roomRequired: true, dutyMatch: "OFF" });
    expect(check.offDay).toEqual([
      { slotId: 7, day: "Saturday", className: "JSS1 A", subject: "Mathematics" },
    ]);
    expect(check.blocking).toBe(true);
  });

  it("keeps duty warnings out of the clashes", () => {
    expect(splitWarnings([clash, dutyWarning])).toEqual({
      clashes: [clash],
      duty: [dutyWarning],
    });
  });
});

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe("PublishCheckPanel", () => {
  it("renders nothing for a week that is ready", () => {
    const check = publishCheckFor(grid([noDuty]), { roomRequired: true, dutyMatch: "WARN" });
    act(() => root.render(<PublishCheckPanel check={check} />));
    expect(container.textContent).toBe("");
  });

  it("names each duty mismatch and says publishing goes ahead under WARN", () => {
    const check = publishCheckFor(grid([noDuty], [dutyWarning]), {
      roomRequired: false,
      dutyMatch: "WARN",
    });
    act(() => root.render(<PublishCheckPanel check={check} />));
    expect(container.textContent).toContain("Before you publish");
    expect(container.textContent).toContain("JSS1 A · Physics · Tunde Bello");
    expect(container.textContent).toContain("Publishing still goes ahead");
  });

  it("tells the school to move or remove a lesson on a day no longer taught", () => {
    const g = grid([]);
    g.days.push({
      day_of_week: 6,
      day_label: "Saturday",
      is_teaching_day: false,
      cells: [
        {
          period: 1,
          period_label: "Period 1",
          kind: "LESSON",
          slot: slot(7, { day_of_week: 6, subject_name: "Mathematics" }),
        },
      ],
    });
    const check = publishCheckFor(g, { roomRequired: false, dutyMatch: "OFF" });
    act(() => root.render(<PublishCheckPanel check={check} />));
    expect(container.textContent).toContain("Not ready to publish");
    expect(container.textContent).toContain(
      "Saturday is not a teaching day: move or remove JSS1 A's Mathematics",
    );
  });

  it("says publishing is blocked under REFUSE", () => {
    const check = publishCheckFor(grid([noDuty], [dutyWarning]), {
      roomRequired: false,
      dutyMatch: "REFUSE",
    });
    act(() => root.render(<PublishCheckPanel check={check} />));
    expect(container.textContent).toContain("Not ready to publish");
    expect(container.textContent).toContain("publishing is blocked");
  });

  it("leads with the server's refusal and lists its rows when the grid cannot", () => {
    const check = publishCheckFor(grid([noDuty]), { roomRequired: false, dutyMatch: "OFF" });
    act(() =>
      root.render(
        <PublishCheckPanel
          check={check}
          refusal={{
            message: "1 lesson has no teacher yet.",
            items: ["Monday Period 4 - Biology has no teacher."],
          }}
        />,
      ),
    );
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      "1 lesson has no teacher yet.",
    );
    expect(container.textContent).toContain("Monday Period 4 - Biology has no teacher.");
  });
});

describe("DutyNote", () => {
  it("shows a WARN warning plainly, and that the lesson still saves", () => {
    act(() =>
      root.render(<DutyNote severity="warning" lines={[dutyWarning.detail]} />),
    );
    expect(container.querySelector('[role="status"]')?.textContent).toContain(
      "Tunde Bello has no teaching duty for JSS1 A Physics.",
    );
    expect(container.textContent).toContain("The lesson still saves");
  });

  it("shows a REFUSE refusal as an alert, with no promise that it saves", () => {
    act(() =>
      root.render(
        <DutyNote
          severity="blocking"
          lines={["Tunde Bello has no teaching duty for JSS1 A Physics."]}
        />,
      ),
    );
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(container.textContent).not.toContain("still saves");
  });
});

describe("invigilatorOptions", () => {
  it("names each person with their role", () => {
    expect(
      invigilatorOptions([
        { id: 1, name: "Ngozi Eze", role_label: "Teacher" },
        { id: 2, name: "Sola Ade", role_label: "" },
      ]),
    ).toEqual([
      { value: "1", label: "Ngozi Eze · Teacher" },
      { value: "2", label: "Sola Ade" },
    ]);
  });

  it("keeps the saved invigilator on offer after they leave the list", () => {
    expect(
      invigilatorOptions([{ id: 1, name: "Ngozi Eze", role_label: "Teacher" }], {
        id: 9,
        name: "Chika Obi",
      })[0],
    ).toEqual({ value: "9", label: "Chika Obi" });
  });
});

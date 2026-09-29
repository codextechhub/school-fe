import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { GridDay } from "@/redux/services/calendar/calendar-types";
import { TimetableGrid } from "./timetable-grid";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const days: GridDay[] = [
  {
    day_of_week: 1,
    day_label: "Monday",
    cells: [
      {
        period: 1,
        period_label: "Period 1",
        start_time: "08:00:00",
        end_time: "08:45:00",
        kind: "LESSON",
        slot: null,
      },
      {
        period: 2,
        period_label: "Morning break",
        start_time: "08:45:00",
        end_time: "09:00:00",
        kind: "BREAK",
        label: "Break",
      },
      {
        period: 3,
        period_label: "Period 2",
        start_time: "09:00:00",
        end_time: "09:45:00",
        kind: "LESSON",
        slot: {
          id: 9,
          school_class: 2,
          class_name: "JSS1 A",
          day_of_week: 1,
          period: 3,
          period_label: "Period 2",
          subject: 4,
          subject_name: "Mathematics",
          teacher: { id: 8, name: "Ngozi Eze" },
          room: 6,
          room_name: "Block A Room 2",
        },
      },
    ],
  },
];

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

describe("timetable grid", () => {
  it("opens empty and filled lesson cells but not non-teaching periods", () => {
    const onCellClick = vi.fn();
    act(() => {
      root.render(
        <TimetableGrid
          days={days}
          warnings={[]}
          variant="class"
          emptyLabel="Add"
          onCellClick={onCellClick}
        />,
      );
    });

    act(() =>
      container
        .querySelector<HTMLButtonElement>('[aria-label="Fill Period 1"]')
        ?.click(),
    );
    act(() =>
      container
        .querySelector<HTMLButtonElement>(
          '[aria-label="Mathematics, Period 2"]',
        )
        ?.click(),
    );

    expect(onCellClick).toHaveBeenCalledTimes(2);
    expect(container.textContent).toContain("Break");
    expect(container.querySelector('[aria-label="Fill Morning break"]')).toBeNull();
  });

  it("marks both the lesson and its clash without disabling editing", () => {
    act(() => {
      root.render(
        <TimetableGrid
          days={days}
          warnings={[
            {
              code: "TEACHER_DOUBLE_BOOKED",
              detail: "Ngozi Eze is already teaching another class.",
              slot_ids: [9, 12],
            },
          ]}
          variant="class"
          onCellClick={vi.fn()}
        />,
      );
    });

    const lesson = container.querySelector<HTMLButtonElement>(
      '[aria-label="Mathematics, Period 2"]',
    );
    expect(lesson).not.toBeNull();
    expect(lesson?.className).toContain("bg-error-text/5");
  });

  it("renders lesson cells as read-only when no click handler is provided", () => {
    act(() => {
      root.render(
        <TimetableGrid days={days} warnings={[]} variant="teacher" />,
      );
    });

    expect(container.querySelector('[aria-label="Fill Period 1"]')).toBeNull();
    expect(container.querySelector('button[aria-label="Mathematics, Period 2"]')).toBeNull();
  });

  it("opens a teacher's filled class without making free periods clickable", () => {
    const onCellClick = vi.fn();
    act(() => {
      root.render(
        <TimetableGrid
          days={days}
          warnings={[]}
          variant="teacher"
          emptyLabel="Free"
          onCellClick={onCellClick}
        />,
      );
    });

    expect(container.querySelector('[aria-label="Fill Period 1"]')).toBeNull();
    act(() =>
      container
        .querySelector<HTMLButtonElement>(
          '[aria-label^="Open JSS1 A timetable"]',
        )
        ?.click(),
    );
    expect(onCellClick).toHaveBeenCalledTimes(1);
  });
});

describe("a day the school no longer teaches", () => {
  const saturday: GridDay = {
    day_of_week: 6,
    day_label: "Saturday",
    is_teaching_day: false,
    cells: [
      { ...days[0].cells[0] },
      { ...days[0].cells[1] },
      {
        ...days[0].cells[2],
        slot: { ...days[0].cells[2].slot!, id: 11, day_of_week: 6 },
      },
    ],
  };

  it("mutes the column, says so, and offers only its lessons", () => {
    const onCellClick = vi.fn();
    act(() => {
      root.render(
        <TimetableGrid
          days={[...days, saturday]}
          variant="class"
          onCellClick={onCellClick}
          emptyLabel="Add"
        />,
      );
    });

    expect(container.querySelector('[role="note"]')?.textContent).toContain(
      "Not a teaching day: Saturday. Move or remove these lessons: publishing waits until they are gone",
    );
    const heads = [...container.querySelectorAll("th")].map((th) => th.textContent);
    expect(heads).toContain("SaturdayNot a teaching day");
    // Monday's empty cell is offered; Saturday's is not.
    expect(container.querySelectorAll('[aria-label="Fill Period 1"]')).toHaveLength(1);
    expect(container.textContent).toContain("Not taught");

    const lessons = container.querySelectorAll<HTMLButtonElement>(
      '[aria-label="Mathematics, Period 2"]',
    );
    expect(lessons).toHaveLength(2);
    act(() => lessons[1].click());
    expect(onCellClick).toHaveBeenCalledWith(saturday.cells[2], 1);
  });

  it("adds no note while every day is taught", () => {
    act(() => {
      root.render(<TimetableGrid days={days} variant="class" />);
    });
    expect(container.querySelector('[role="note"]')).toBeNull();
  });
});

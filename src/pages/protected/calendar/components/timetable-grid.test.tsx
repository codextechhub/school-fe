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
});

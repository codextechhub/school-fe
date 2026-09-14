import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Period } from "@/redux/services/calendar/calendar-types";
import {
  PeriodDirectory,
  SchoolDayPanel,
} from "./bell-schedule-view";
import { durationOf, formatClock } from "./bell-schedule-time";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const lesson: Period = {
  id: 1,
  label: "Period 1",
  order_index: 1,
  start_time: "08:00:00",
  end_time: "08:45:00",
  period_type: "LESSON",
  type_label: "Lesson",
  day_of_week: null,
  day_label: "Every day",
  branch: null,
  scope_label: "School-wide",
  is_active: true,
};

const schoolBreak: Period = {
  ...lesson,
  id: 2,
  label: "Morning break",
  order_index: 2,
  start_time: "08:45:00",
  end_time: "09:00:00",
  period_type: "BREAK",
  type_label: "Break",
};

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

describe("school day panel", () => {
  it("sizes period blocks from their actual durations", () => {
    expect(durationOf(lesson)).toBe(45);
    expect(durationOf(schoolBreak)).toBe(15);
    expect(formatClock("13:05:00")).toBe("1:05 pm");

    act(() => {
      root.render(
        <SchoolDayPanel
          day="all"
          periods={[lesson, schoolBreak]}
          ownDays={new Set([5])}
          label="The everyday schedule."
          canEdit
          onDayChange={vi.fn()}
          onEdit={vi.fn()}
        />,
      );
    });

    expect(
      container.querySelector<HTMLButtonElement>('[aria-label="Edit Period 1"]')
        ?.style.flexGrow,
    ).toBe("45");
    expect(
      container.querySelector<HTMLButtonElement>(
        '[aria-label="Edit Morning break"]',
      )?.style.flexGrow,
    ).toBe("15");
    expect(container.textContent).toContain("2 total periods");
    expect(container.querySelector('[aria-label="Has its own schedule"]')).not.toBeNull();
  });

  it("changes the selected weekday and opens a period from the timeline", () => {
    const onDayChange = vi.fn();
    const onEdit = vi.fn();
    act(() => {
      root.render(
        <SchoolDayPanel
          day="all"
          periods={[lesson]}
          ownDays={new Set()}
          label="The everyday schedule."
          canEdit
          onDayChange={onDayChange}
          onEdit={onEdit}
        />,
      );
    });

    const buttons = [...container.querySelectorAll("button")];
    act(() => buttons.find((button) => button.textContent === "Fri")?.click());
    act(() =>
      container
        .querySelector<HTMLButtonElement>('[aria-label="Edit Period 1"]')
        ?.click(),
    );

    expect(onDayChange).toHaveBeenCalledWith(5);
    expect(onEdit).toHaveBeenCalledWith(lesson);
  });
});

describe("period directory", () => {
  it("shows scheduling facts and opens an editable desktop row", () => {
    const onEdit = vi.fn();
    act(() => {
      root.render(
        <PeriodDirectory
          periods={[lesson]}
          note="Every period defined."
          multiBranch
          canEdit
          canDelete
          onEdit={onEdit}
          onDelete={vi.fn()}
        />,
      );
    });

    expect(container.textContent).toContain("Every period defined.");
    expect(container.textContent).toContain("8:00 am - 8:45 am");
    expect(container.textContent).toContain("School-wide");

    act(() =>
      container
        .querySelector<HTMLTableRowElement>('tr[aria-label="Edit Period 1"]')
        ?.click(),
    );
    expect(onEdit).toHaveBeenCalledOnce();
  });

  it("does not present read-only rows as controls", () => {
    act(() => {
      root.render(
        <PeriodDirectory
          periods={[lesson]}
          note="Every period defined."
          multiBranch={false}
          canEdit={false}
          canDelete={false}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />,
      );
    });

    expect(container.querySelector('tr[aria-label="Edit Period 1"]')).toBeNull();
  });
});

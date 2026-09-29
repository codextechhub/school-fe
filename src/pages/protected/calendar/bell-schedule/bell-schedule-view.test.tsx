import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Period } from "@/redux/services/calendar/calendar-types";
import {
  CopyResultNote,
  CopyScheduleOffer,
  PeriodDirectory,
  SchoolDayPanel,
} from "./bell-schedule-view";
import { weekdayChoices } from "@/lib/week";
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

describe("school day tabs", () => {
  const tabs = () =>
    [...container.querySelectorAll("button")].map((button) => button.textContent);

  it("shows Saturday when the school teaches it", () => {
    act(() => {
      root.render(
        <SchoolDayPanel
          day="all"
          periods={[lesson]}
          ownDays={new Set()}
          weekdays={weekdayChoices([1, 2, 3, 4, 5, 6], 1)}
          label="The everyday schedule."
          canEdit={false}
          onDayChange={vi.fn()}
          onEdit={vi.fn()}
        />,
      );
    });
    expect(tabs()).toEqual(["Every day", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
  });

  it("offers Monday to Friday when no teaching days are passed", () => {
    act(() => {
      root.render(
        <SchoolDayPanel
          day="all"
          periods={[lesson]}
          ownDays={new Set()}
          label="The everyday schedule."
          canEdit={false}
          onDayChange={vi.fn()}
          onEdit={vi.fn()}
        />,
      );
    });
    expect(tabs()).toEqual(["Every day", "Mon", "Tue", "Wed", "Thu", "Fri"]);
  });
});

describe("copy from an earlier year", () => {
  const source = { session: { id: 2, name: "2025/2026" }, periodCount: 9 };
  const offer = (props: Partial<React.ComponentProps<typeof CopyScheduleOffer>> = {}) => (
    <CopyScheduleOffer
      offer={{ kind: "offer", source }}
      scope="school"
      targetName="2026/2027"
      allLabel="All branches"
      copying={false}
      onCopy={vi.fn()}
      {...props}
    />
  );

  it("renders nothing without a year to copy from", () => {
    act(() => root.render(offer({ offer: null })));
    expect(container.textContent).toBe("");
  });

  it("says a school-wide copy fills every branch, and asks when pressed", () => {
    const onCopy = vi.fn();
    act(() => root.render(offer({ onCopy })));
    expect(container.textContent).toContain("2025/2026 has 9 periods across every branch");
    const button = [...container.querySelectorAll("button")].find(
      (b) => b.textContent === "Copy from 2025/2026",
    );
    act(() => button?.click());
    expect(onCopy).toHaveBeenCalledOnce();
  });

  it("says a branch-bound copy covers the reader's branch only", () => {
    act(() =>
      root.render(offer({ scope: "branches", offer: { kind: "offer", source: { ...source, periodCount: 1 } } })),
    );
    expect(container.textContent).toContain("2025/2026 has 1 period at your branch.");
    expect(container.textContent).toContain("shared periods are copied by a school-wide administrator");
  });

  it("points a reader looking at one branch to All branches, with no button", () => {
    act(() => root.render(offer({ offer: { kind: "switch-view", source } })));
    expect(container.textContent).toContain("offered under All branches");
    expect(container.querySelector("button")).toBeNull();
  });

  it("shows the server's refusal beside the button", () => {
    act(() =>
      root.render(
        offer({
          refusal:
            "2026/2027 already has periods, so nothing was copied. Copying fills an empty bell schedule: change 2026/2027's periods on the Bell schedule instead.",
        }),
      ),
    );
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "2026/2027 already has periods",
    );
  });
});

describe("after a copy", () => {
  it("shows the server's sentence and the periods it left out", () => {
    const onDismiss = vi.fn();
    act(() =>
      root.render(
        <CopyResultNote
          message="Copied 8 periods. 2 Saturday periods were left out because Saturday is not a teaching day."
          skipped={[
            { name: "Period 1", day: "Saturday" },
            { name: "Period 2", day: "Saturday" },
          ]}
          onDismiss={onDismiss}
        />,
      ),
    );
    expect(container.textContent).toContain("2 Saturday periods were left out");
    expect(container.textContent).toContain("Saturday · Period 2");
    const dismiss = [...container.querySelectorAll("button")].find((b) => b.textContent === "Dismiss");
    act(() => dismiss?.click());
    expect(onDismiss).toHaveBeenCalledOnce();
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

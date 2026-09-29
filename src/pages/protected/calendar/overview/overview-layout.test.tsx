import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  CalendarOverview,
  CalendarYear,
} from "@/redux/services/calendar/calendar-types";
import { CalendarOverviewLayout } from "./overview-layout";

// The school's word for a term is read from the store; these render without
// one, so the hook answers as a school that has set nothing.
vi.mock("@/hooks/use-school-words", async () => {
  const { resolveSchoolWords } = await import("@/lib/school-words");
  return { useSchoolWords: () => resolveSchoolWords({}) };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const overview: CalendarOverview & { session: NonNullable<CalendarOverview["session"]> } = {
  session: {
    id: 7,
    name: "2026/2027",
    start_date: "2026-09-01",
    end_date: "2027-07-30",
    status: "ACTIVE",
  },
  term: {
    id: 3,
    name: "First Term",
    start_date: "2026-09-01",
    end_date: "2026-12-18",
    days_elapsed: 42,
    days_total: 78,
    teaching_days_elapsed: 31,
    teaching_days_total: 68,
  },
  counts: {
    terms: 3,
    events_in_term: 12,
    classes_timetabled: 18,
    rooms: 24,
  },
  next_up: [
    {
      id: 15,
      name: "Mid-term Break",
      event_type: "MIDTERM_BREAK",
      type_label: "Break",
      start_date: "2026-10-19",
      end_date: "2026-10-23",
      days_away: 7,
    },
  ],
  alerts: [
    {
      code: "CLASS_HAS_NO_TIMETABLE",
      detail: "Four classes do not have any scheduled lessons.",
      ids: [1, 2, 3, 4],
    },
  ],
};

const year: CalendarYear = {
  session: { ...overview.session, read_only: false },
  on: "2026-10-12",
  terms: [
    {
      id: 3,
      name: "First Term",
      start_date: "2026-09-01",
      end_date: "2026-12-18",
      state: "ongoing",
    },
  ],
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

async function renderOverview(overrides?: {
  canSeeSessions?: boolean;
  canSeeTimetables?: boolean;
  canCreateEvent?: boolean;
}) {
  await act(async () => {
    root.render(
      <MemoryRouter>
        <CalendarOverviewLayout
          overview={overview}
          year={year}
          sessionName="2026/2027"
          canSeeSessions={overrides?.canSeeSessions ?? true}
          canSeeTimetables={overrides?.canSeeTimetables ?? true}
          canCreateEvent={overrides?.canCreateEvent ?? true}
        />
      </MemoryRouter>,
    );
  });
}

describe("calendar overview layout", () => {
  it("shows the approved today, count, agenda, and attention hierarchy", async () => {
    await renderOverview();

    expect(container.textContent).toContain("Monday, 12 October");
    expect(container.textContent).toContain("Day 31 of 68 teaching days");
    expect(container.textContent).toContain("Mid-term Break");
    expect(container.textContent).toContain("Classes with no timetable");
    expect(
      container.querySelector('a[href="/academic-calendar/events?action=new"]'),
    ).not.toBeNull();
  });

  it("keeps restricted destinations readable without linking to them", async () => {
    await renderOverview({
      canSeeSessions: false,
      canSeeTimetables: false,
      canCreateEvent: false,
    });

    expect(container.textContent).toContain("18Classes timetabled");
    expect(container.querySelector('a[href="/timetables/classes"]')).toBeNull();
    expect(container.querySelector('a[href="/timetables/rooms"]')).toBeNull();
    expect(container.textContent).not.toContain("Add event");
  });

  it("moves the mini-month without changing the school date", async () => {
    await renderOverview();
    const next = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Next month"]',
    );

    await act(async () => next?.click());

    expect(container.textContent).toContain("November 2026");
    expect(container.textContent).toContain("Monday, 12 October");
  });
});

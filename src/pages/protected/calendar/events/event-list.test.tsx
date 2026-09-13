import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CalendarEvent } from "@/redux/services/calendar/calendar-types";

import { EventList } from "./event-list";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const event: CalendarEvent = {
  id: 12,
  name: "Mid-term break",
  event_type: "MIDTERM_BREAK",
  type_label: "Mid-term break",
  start_date: "2026-10-05",
  end_date: "2026-10-09",
  closes_school: true,
  description: "Teaching pauses for the week.",
  term: null,
  branch: null,
  scope_label: "School-wide",
  audience: [{ type: "level", id: 3, name: "Primary 1" }],
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

function renderList(overrides?: {
  onOpen?: (event: CalendarEvent) => void;
  onPageChange?: (page: number) => void;
}) {
  const onOpen = overrides?.onOpen ?? vi.fn();
  const onPageChange = overrides?.onPageChange ?? vi.fn();

  act(() => {
    root.render(
      <MemoryRouter>
        <EventList
          events={[event]}
          multiBranch
          canEdit
          canDelete
          page={1}
          totalPages={3}
          onOpen={onOpen}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onPageChange={onPageChange}
        />
      </MemoryRouter>,
    );
  });

  return { onOpen, onPageChange };
}

describe("event list", () => {
  it("keeps event context visible in the clickable card", () => {
    renderList();

    expect(container.textContent).toContain("OCT");
    expect(container.textContent).toContain("Mid-term break");
    expect(container.textContent).toContain("School closed");
    expect(container.textContent).toContain("5 - 9 Oct 2026");
    expect(container.textContent).toContain("Outside every term");
    expect(container.textContent).toContain("Applies toSchool-wide");
    expect(container.textContent).toContain("Who it coversPrimary 1");
  });

  it("opens the event from the whole card", () => {
    const onOpen = vi.fn();
    renderList({ onOpen });

    act(() => {
      container
        .querySelector<HTMLElement>('[aria-label="View Mid-term break"]')
        ?.click();
    });

    expect(onOpen).toHaveBeenCalledWith(event);
  });

  it("uses the bounded pager for card pages", () => {
    const onPageChange = vi.fn();
    renderList({ onPageChange });

    act(() => {
      container
        .querySelector<HTMLButtonElement>('button[aria-label="Page 2"]')
        ?.click();
    });

    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});

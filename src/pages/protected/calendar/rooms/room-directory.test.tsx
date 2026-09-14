import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Room } from "@/redux/services/calendar/calendar-types";
import { RoomCard, RoomDirectory } from "./room-directory";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const room: Room = {
  id: 4,
  name: "Science Laboratory",
  code: "LAB-01",
  room_type: "LABORATORY",
  type_label: "Laboratory",
  branch: 2,
  branch_name: "Holy Cross College Main Branch",
  capacity: 36,
  is_active: true,
  usage: { lessons: 18, exam_papers: 4, label: "18 lessons · 4 exam papers" },
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

function renderCard(canEdit = true, onEdit = vi.fn()) {
  act(() => {
    root.render(
      <MemoryRouter>
        <RoomCard
          room={room}
          multiBranch
          canEdit={canEdit}
          canDelete={canEdit}
          onEdit={onEdit}
          onToggle={vi.fn()}
          onDelete={vi.fn()}
        />
      </MemoryRouter>,
    );
  });
  return onEdit;
}

describe("room card", () => {
  it("shows the room facts needed before scheduling", () => {
    renderCard();

    expect(container.textContent).toContain("Science Laboratory");
    expect(container.textContent).toContain("LAB-01");
    expect(container.textContent).toContain("Laboratory");
    expect(container.textContent).toContain("36 students");
    expect(container.textContent).toContain("Holy Cross College Main Branch");
    expect(container.textContent).toContain("18 lessons · 4 exam papers");
  });

  it("opens the editor from the whole card", () => {
    const onEdit = renderCard();

    act(() => {
      container
        .querySelector<HTMLElement>('[aria-label="Edit Science Laboratory"]')
        ?.click();
    });

    expect(onEdit).toHaveBeenCalledOnce();
  });

  it("does not present a read-only card as clickable", () => {
    renderCard(false);

    expect(
      container.querySelector('[aria-label="Edit Science Laboratory"]'),
    ).toBeNull();
  });

  it("keeps later card pages reachable", () => {
    const onPageChange = vi.fn();
    act(() => {
      root.render(
        <MemoryRouter>
          <RoomDirectory
            rooms={[room]}
            view="cards"
            multiBranch
            canEdit
            canDelete
            page={1}
            totalPages={3}
            onEdit={vi.fn()}
            onToggle={vi.fn()}
            onDelete={vi.fn()}
            onPageChange={onPageChange}
          />
        </MemoryRouter>,
      );
    });

    act(() => {
      container
        .querySelector<HTMLButtonElement>('button[aria-label="Page 2"]')
        ?.click();
    });

    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});

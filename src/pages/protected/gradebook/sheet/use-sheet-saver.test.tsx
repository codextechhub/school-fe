import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SheetComponent, SheetRow } from "@/redux/services/gradebook/gradebook-types";

/**
 * How the sheet's saver treats what a teacher types.
 *
 * Mrs Sanni types into Segun Okafor's Examination cell on SSS1 B English. A
 * clean mark goes to the server alone, and once it is stored the typed text
 * gives way to the stored value. A mark the server refuses keeps her text
 * where it is, with the server's message under it, so she can see what was
 * wrong and correct it. A mark that fails the same check here is never sent.
 */
const save = vi.fn();
const toastError = vi.fn();

vi.mock("@/redux/services/gradebook/gradebook-api", () => ({
  useSaveScoresMutation: () => [save],
}));
vi.mock("sonner", () => ({ toast: { error: (...args: unknown[]) => toastError(...args) } }));

import { useSheetSaver } from "./use-sheet-saver";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const EXAM: SheetComponent = { id: 10, name: "Examination", short_name: "EXAM", max_score: 60, is_exam: true };
const SEGUN: SheetRow = {
  student: { id: 422, name: "Segun Okafor", admission_number: "LV/2026/0025" },
  cells: [{ component: 10, mark: null, marker: null }],
};

let saver: ReturnType<typeof useSheetSaver>;
const onLocked = vi.fn();

function Harness({ expose }: { expose: (current: ReturnType<typeof useSheetSaver>) => void }) {
  const current = useSheetSaver({ classId: 87, subjectId: 42 }, onLocked);
  useEffect(() => expose(current));
  return null;
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  save.mockReset();
  toastError.mockReset();
  onLocked.mockReset();
  container = document.createElement("div");
  root = createRoot(container);
  act(() => root.render(<Harness expose={(current) => { saver = current; }} />));
});

afterEach(() => act(() => root.unmount()));

/** Let the save queue run to the end. */
const settle = () => act(async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
});

describe("useSheetSaver", () => {
  it("sends a clean mark alone and drops the typed text once it is stored", async () => {
    save.mockResolvedValue({ data: {} });
    act(() => saver.type(422, 10, "40"));
    expect(saver.drafts["422:10"]).toBe("40");
    act(() => saver.commit(SEGUN, EXAM));
    await settle();
    expect(save).toHaveBeenCalledWith({
      classId: 87, subjectId: 42, cells: [{ student: 422, component: 10, mark: 40, marker: null }],
    });
    expect(saver.drafts["422:10"]).toBeUndefined();
    expect(saver.saving).toBe(false);
  });

  it("never sends a mark that fails the check, and says why", async () => {
    act(() => saver.type(422, 10, "61"));
    act(() => saver.commit(SEGUN, EXAM));
    await settle();
    expect(save).not.toHaveBeenCalled();
    expect(saver.errors["422:10"]).toBe("Max 60");
    expect(saver.drafts["422:10"]).toBe("61");
  });

  it("keeps the typed text and shows the server's message when the cell is refused", async () => {
    save.mockResolvedValue({
      error: {
        status: 422,
        data: {
          error: {
            code: "CELLS_REFUSED",
            detail: { cells: [{ student: 422, component: 10, code: "OVER_MAX", message: "Max 50" }] },
          },
        },
      },
    });
    act(() => saver.type(422, 10, "55"));
    act(() => saver.commit(SEGUN, EXAM));
    await settle();
    expect(saver.errors["422:10"]).toBe("Max 50");
    expect(saver.drafts["422:10"]).toBe("55");
    expect(toastError).not.toHaveBeenCalled();
  });

  it("says so and re-reads the sheet when it locked while open", async () => {
    save.mockResolvedValue({
      error: { status: 409, data: { message: "This sheet has been submitted.", error: { code: "SHEET_LOCKED" } } },
    });
    act(() => saver.mark(422, 10, "ABS"));
    await settle();
    expect(toastError).toHaveBeenCalledWith("This sheet has been submitted.");
    expect(onLocked).toHaveBeenCalled();
  });

  it("does not send a cell whose text is what is already stored", async () => {
    const stored: SheetRow = { ...SEGUN, cells: [{ component: 10, mark: 40, marker: null }] };
    act(() => saver.type(422, 10, "40"));
    act(() => saver.commit(stored, EXAM));
    await settle();
    expect(save).not.toHaveBeenCalled();
    expect(saver.drafts["422:10"]).toBeUndefined();
  });
});

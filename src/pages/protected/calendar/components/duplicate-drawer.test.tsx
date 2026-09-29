import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { DuplicateSummary } from "@/redux/services/calendar/calendar-types";
import { DuplicateDutyNotice } from "./duplicate-drawer";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const summary: DuplicateSummary = {
  source_class: "JSS1 A",
  target_class: "JSS1 B",
  copied: 12,
  skipped: 0,
  replaced: 0,
  rows: [],
  skipped_rows: [],
  warnings: [
    {
      code: "TEACHER_HAS_NO_DUTY",
      detail: "Chioma Okafor has no teaching duty for JSS1 B Mathematics.",
      slot_ids: [],
    },
  ],
};

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe("DuplicateDutyNotice", () => {
  it("lists a copied teacher with no duty, as a warning, under WARN", () => {
    act(() =>
      root.render(
        <DuplicateDutyNotice summary={summary} dutyMatch="WARN" keepTeachers />,
      ),
    );
    expect(container.querySelector('[role="status"]')?.textContent).toContain(
      "Chioma Okafor has no teaching duty for JSS1 B Mathematics.",
    );
    expect(container.textContent).not.toContain("will be refused");
  });

  it("says the copy will be refused under REFUSE while teachers are kept", () => {
    act(() =>
      root.render(
        <DuplicateDutyNotice summary={summary} dutyMatch="REFUSE" keepTeachers />,
      ),
    );
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(container.textContent).toContain("this copy will be refused");
  });

  it("says nothing under OFF", () => {
    act(() =>
      root.render(
        <DuplicateDutyNotice summary={summary} dutyMatch="OFF" keepTeachers />,
      ),
    );
    expect(container.textContent).toBe("");
  });
});

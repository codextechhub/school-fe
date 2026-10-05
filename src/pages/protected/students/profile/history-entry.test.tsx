import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { HistoryEntry } from "@/redux/services/students/students-types";

import { HistoryEntryItem } from "./history-entry";

/**
 * The reason behind a move on the History tab.
 *
 * Bright Star's School Admin opens Tunde's History tab. His suspension was
 * recorded with the reason "Fighting in the hall", which the backend sends as
 * the entry's own `reason` field to a role allowed to read it. A role without
 * Read on it gets the same entry with the key left out, and so does every entry
 * that is not a move; neither may show a bare "Reason:" with nothing after it.
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const SUSPENDED: HistoryEntry = {
  kind: "status",
  text: "Status moved from Active to Suspended.",
  when: "2026-10-01T09:30:00Z",
  actor: "Mrs. Okafor",
};

describe("HistoryEntryItem", () => {
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

  async function render(entry: HistoryEntry) {
    await act(async () => {
      root.render(
        <ul>
          <HistoryEntryItem entry={entry} />
        </ul>,
      );
    });
  }

  it("shows the reason on a status move that carries one", async () => {
    await render({ ...SUSPENDED, reason: "Fighting in the hall" });

    expect(container.textContent).toContain("Status moved from Active to Suspended.");
    expect(container.textContent).toContain("Reason: Fighting in the hall");
  });

  it("shows the reason on any entry kind that carries one, such as an admission-stage move", async () => {
    await render({
      kind: "edit",
      text: "Admission stage moved from Interview to Offer.",
      when: "2026-09-01T09:30:00Z",
      actor: "Mr. Bello",
      reason: "Passed the entrance test",
    });

    expect(container.textContent).toContain("Reason: Passed the entrance test");
  });

  it("draws no reason line when the field is absent", async () => {
    await render(SUSPENDED);

    expect(container.textContent).toContain("Status moved from Active to Suspended.");
    expect(container.textContent).not.toContain("Reason");
    expect(container.querySelectorAll("p")).toHaveLength(2);
  });

  it("draws no reason line when the reason is null or blank", async () => {
    await render({ ...SUSPENDED, reason: null });
    expect(container.textContent).not.toContain("Reason");

    await render({ ...SUSPENDED, reason: "  " });
    expect(container.textContent).not.toContain("Reason");
    expect(container.querySelectorAll("p")).toHaveLength(2);
  });
});

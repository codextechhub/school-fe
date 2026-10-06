import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { SettingsAuditHistory, type SettingsAuditRow } from "./settings-layout";

/**
 * A settings screen's recent changes read in the screen's own words.
 *
 * Ada, the bursar at Lagoon View, raises the term collection target from 75% to
 * 80%. The panel says "Term collection target: 75% → 80%", the label and the
 * values the server wrote, and never the stored key `term_collection_target_pct`.
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const row = (over: Partial<SettingsAuditRow>): SettingsAuditRow => ({
  id: 1,
  message: "Updated 1 finance document setting(s).",
  actor: "ada@lagoonview.test",
  created_at: "2026-10-05T09:00:00Z",
  before: { term_collection_target_pct: 75 },
  after: { term_collection_target_pct: 80 },
  ...over,
});

describe("SettingsAuditHistory", () => {
  it("shows the server's label and values, never the field key", () => {
    act(() => root.render(<SettingsAuditHistory rows={[row({
      changes: [{ field: "term_collection_target_pct", label: "Term collection target", before: "75%", after: "80%" }],
    })]} />));
    expect(container.textContent).toContain("Term collection target");
    expect(container.textContent).toContain("75% → 80%");
    expect(container.textContent).not.toContain("term collection target pct");
    expect(container.textContent).not.toContain("term_collection_target_pct");
  });

  it("counts the changes of a row the server sent no words for", () => {
    act(() => root.render(<SettingsAuditHistory rows={[row({})]} />));
    expect(container.textContent).toContain("1 setting changed");
    expect(container.textContent).not.toContain("term collection target pct");
  });
});

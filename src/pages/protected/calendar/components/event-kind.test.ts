import { describe, expect, it } from "vitest";

import { termWordsFor } from "@/lib/school-words";
import { eventKindsIn } from "./event-kind";

/**
 * The type picker and filter name each kind in the school's word, as the
 * server's own row labels do.
 */
describe("eventKindsIn", () => {
  it("reads a mid-semester break at a semester school", () => {
    const labels = eventKindsIn(termWordsFor("SEMESTER")).map((k) => k.label);
    expect(labels).toContain("Mid-semester break");
    expect(labels).not.toContain("Mid-term break");
  });

  it("keeps the term labels at a term school", () => {
    expect(eventKindsIn(termWordsFor("TERM")).map((k) => k.label)).toContain("Mid-term break");
  });
});

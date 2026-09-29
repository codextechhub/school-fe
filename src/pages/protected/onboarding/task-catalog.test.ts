import { describe, expect, it } from "vitest";
import { taskMeta } from "./task-catalog";
import { termWordsFor } from "@/lib/school-words";

describe("taskMeta", () => {
  it("names the academic structure step's parts in the school's word", () => {
    expect(taskMeta("ACADEMIC_STRUCTURE").description).toContain("Sessions, terms,");
    expect(
      taskMeta("ACADEMIC_STRUCTURE", termWordsFor("SEMESTER")).description,
    ).toContain("Sessions, semesters,");
  });

  it("marks academic structure as the step nobody can verify", () => {
    const meta = taskMeta("ACADEMIC_STRUCTURE");
    expect(meta.attested).toBe(true);
  });

  it("does not claim the platform-verified steps are self-attested", () => {
    for (const key of [
      "DEFAULT_ROLES",
      "SCHOOL_METADATA",
      "INITIAL_DATA",
      "STAFF_INVITATIONS",
    ]) {
      expect(taskMeta(key).attested).toBeUndefined();
    }
  });

  it("describes every key the catalogue ships, not the fallback", () => {
    // Without this, a key removed from the backend keeps passing every other
    // test in this file by quietly falling through to the generic card.
    const fallback = taskMeta("SOME_KEY_THAT_WILL_NEVER_EXIST").description;
    for (const key of [
      "DEFAULT_ROLES",
      "SCHOOL_METADATA",
      "ACADEMIC_STRUCTURE",
      "INITIAL_DATA",
      "STAFF_INVITATIONS",
    ]) {
      expect(taskMeta(key).description).not.toBe(fallback);
    }
  });

  it("still returns a usable card for a catalog key this build has never seen", () => {
    // The catalog is a server constant: a step added there ships before this
    // file knows about it, and the school must still get a readable card.
    const meta = taskMeta("SOME_FUTURE_STEP");
    expect(meta.description.length).toBeGreaterThan(0);
    expect(meta.icon).toBeTruthy();
  });
});

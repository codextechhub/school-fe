import { describe, expect, it } from "vitest";

import { teachingRemovalCopy } from "./removal-copy";

describe("teaching removal confirmation", () => {
  const base = {
    name: "Chinedu Okafor",
    className: "JSS1 A",
    subjectName: "Mathematics",
  };

  it("names the teacher, the class and the subject", () => {
    expect(teachingRemovalCopy({ ...base, part: "ASSISTANT" }).title).toBe(
      "Remove Chinedu Okafor from JSS1 A Mathematics?",
    );
  });

  it("warns that nobody enters results when the main teacher goes", () => {
    const { body } = teachingRemovalCopy({ ...base, part: "LEAD" });
    expect(body).toContain("They stop teaching it.");
    expect(body).toContain(
      "nobody will enter its results until another teacher is made main",
    );
  });

  it("says results are unaffected when somebody assisting goes", () => {
    const { body } = teachingRemovalCopy({ ...base, part: "ASSISTANT" });
    expect(body).toContain("Who enters its results does not change.");
    expect(body).not.toContain("nobody will enter");
  });
});

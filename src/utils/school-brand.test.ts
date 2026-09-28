import { describe, expect, it } from "vitest";
import { schoolNameUrl } from "./school-brand";

describe("schoolNameUrl", () => {
  it("uses the known school slug at the API origin", () => {
    expect(schoolNameUrl("  Bright-Star  ")).toBe(
      "http://test.local/v1/i/public/schools/bright-star/name/",
    );
  });

  it("does not ask for a name without a school address", () => {
    expect(schoolNameUrl(" ")).toBe("");
  });
});

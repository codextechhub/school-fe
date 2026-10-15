import { describe, expect, it } from "vitest";

import {
  bandRanges,
  checkScale,
  checkStructure,
  checkTemplates,
  templateBandLabel,
  type BandDraft,
  type ComponentDraft,
} from "./checks";

const component = (name: string, short: string, max: string, is_exam = false): ComponentDraft => ({
  name, short_name: short, max_score: max, is_exam,
});
const band = (min: string, grade: string, is_fail = false): BandDraft => ({
  min_score: min, grade, remark: "", is_fail,
});

describe("checkStructure", () => {
  it("passes two continuous assessments and an examination that total 100", () => {
    expect(checkStructure([
      component("1st CA", "CA1", "20"), component("2nd CA", "CA2", "20"), component("Examination", "EXAM", "60", true),
    ])).toEqual({ ok: true, message: "The components total 100." });
  });

  it("says what the components total when it is not 100", () => {
    expect(checkStructure([component("CA", "CA", "30"), component("Exam", "EXAM", "60", true)]).message)
      .toBe("The components total 90. They must total 100.");
  });

  it("refuses two examinations, two components with one name, and a maximum out of range", () => {
    expect(checkStructure([component("A", "A", "50", true), component("B", "B", "50", true)]).ok).toBe(false);
    expect(checkStructure([component("CA", "CA", "40"), component("ca", "C2", "60")]).ok).toBe(false);
    expect(checkStructure([component("CA", "CA", "0"), component("Exam", "E", "100")]).ok).toBe(false);
    expect(checkStructure([component("CA", "CA", "40.5"), component("Exam", "E", "59.5")]).ok).toBe(false);
  });
});

describe("checkScale", () => {
  it("passes A to F starting at 0 with a pass band", () => {
    expect(checkScale([band("70", "A"), band("50", "C"), band("40", "D"), band("0", "F", true)]).ok).toBe(true);
  });

  it("names the marks nothing covers when the lowest band is not 0", () => {
    expect(checkScale([band("70", "A"), band("40", "D")]).message)
      .toBe("Nothing covers marks below 40. The lowest band must start at 0.");
  });

  it("refuses two bands starting at one mark, and a scale that is all fail", () => {
    expect(checkScale([band("50", "C"), band("50", "D"), band("0", "F", true)]).message)
      .toBe("Two bands start at 50. Each needs its own lowest mark.");
    expect(checkScale([band("0", "F", true)]).message).toBe("At least one band must be a pass.");
  });
});

describe("bandRanges", () => {
  it("runs each band from its floor up to the next band's, the highest to 100", () => {
    expect(bandRanges([70, 60, 0])).toEqual(["70 – 100", "60 – 69", "0 – 59"]);
  });
});

describe("checkTemplates and templateBandLabel", () => {
  it("needs one template at 0 and no two at one average", () => {
    expect(checkTemplates([{ band_min: "70", text: "Excellent." }]).ok).toBe(false);
    expect(checkTemplates([{ band_min: "0", text: "See me." }, { band_min: "0", text: "Again." }]).ok).toBe(false);
    expect(checkTemplates([{ band_min: "70", text: "Excellent." }, { band_min: "0", text: "See me." }]).ok).toBe(true);
  });

  it("words each band the way the principal reads it", () => {
    const floors = [70, 55, 40, 0];
    expect(templateBandLabel(70, floors)).toBe("70% and above");
    expect(templateBandLabel(55, floors)).toBe("55% to 69%");
    expect(templateBandLabel(0, floors)).toBe("Below 40%");
  });
});

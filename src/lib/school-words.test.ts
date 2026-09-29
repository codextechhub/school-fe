import { describe, expect, it } from "vitest";

import {
  armsFieldText,
  defaultTermNames,
  resolveSchoolWords,
  termWordFromStructure,
  termWordsFor,
} from "./school-words";
import type { AcademicRules } from "@/redux/services/academics/academics-types";

/**
 * Greenfield Academy runs two semesters and generates Gold and Silver arms;
 * Bright Star School has never touched its academic settings.
 */
const GREENFIELD: AcademicRules = {
  term_word: "SEMESTER",
  term_word_options: [
    { value: "TERM", label: "Term" },
    { value: "SEMESTER", label: "Semester" },
  ],
  term_names: ["Harmattan Semester", "Rain Semester"],
  default_arms: ["Gold", "Silver"],
};

describe("termWordsFor", () => {
  it("gives the four forms of each word", () => {
    expect(termWordsFor("SEMESTER")).toEqual({
      termWord: "SEMESTER",
      term: "semester",
      Term: "Semester",
      terms: "semesters",
      Terms: "Semesters",
    });
    expect(termWordsFor("TERM").Terms).toBe("Terms");
  });

  it("reads an unknown value as Term rather than printing nothing", () => {
    expect(termWordsFor("QUARTER" as never).Term).toBe("Term");
  });
});

describe("termWordFromStructure", () => {
  it("reads two semesters as Semester and everything else as Term", () => {
    expect(termWordFromStructure("2_SEMESTERS")).toBe("SEMESTER");
    expect(termWordFromStructure("3_TERMS")).toBe("TERM");
    expect(termWordFromStructure(undefined)).toBe("TERM");
  });
});

describe("defaultTermNames", () => {
  it("starts three terms or two semesters", () => {
    expect(defaultTermNames("TERM")).toEqual(["First Term", "Second Term", "Third Term"]);
    expect(defaultTermNames("SEMESTER")).toEqual(["First Semester", "Second Semester"]);
  });
});

describe("resolveSchoolWords", () => {
  it("uses the school's own rules once they have answered", () => {
    const words = resolveSchoolWords({ rules: GREENFIELD, termStructure: "3_TERMS" });
    expect(words.Term).toBe("Semester");
    expect(words.termNames).toEqual(["Harmattan Semester", "Rain Semester"]);
    expect(words.defaultArms).toEqual(["Gold", "Silver"]);
    expect(words.settled).toBe(true);
  });

  it("falls back to the profile's term structure before the rules answer", () => {
    const words = resolveSchoolWords({ rules: undefined, termStructure: "2_SEMESTERS" });
    expect(words.terms).toBe("semesters");
    expect(words.termNames).toEqual(["First Semester", "Second Semester"]);
    expect(words.defaultArms).toEqual(["A", "B", "C"]);
    expect(words.settled).toBe(false);
  });

  it("says Term when nothing is known", () => {
    const words = resolveSchoolWords({});
    expect(words.Term).toBe("Term");
    expect(words.termNames).toEqual(["First Term", "Second Term", "Third Term"]);
  });

  it("keeps the defaults when the rules carry empty lists", () => {
    const words = resolveSchoolWords({
      rules: { ...GREENFIELD, term_names: ["  "], default_arms: [] },
    });
    expect(words.termNames).toEqual(["First Semester", "Second Semester"]);
    expect(words.defaultArms).toEqual(["A", "B", "C"]);
  });
});

describe("armsFieldText", () => {
  it("writes the arms as the generate-arms field reads them", () => {
    expect(armsFieldText(["A", "B", "C"])).toBe("A, B, C");
    expect(armsFieldText(["Gold", " Silver ", ""])).toBe("Gold, Silver");
  });
});

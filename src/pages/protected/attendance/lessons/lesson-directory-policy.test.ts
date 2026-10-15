import { describe, expect, it } from "vitest";

import { lessonDirectoryFieldPolicy } from "./lesson-directory-policy";

describe("lesson directory Field Access", () => {
  it("shows readable queue and preview fields", () => {
    expect(lessonDirectoryFieldPolicy({
      statusHidden: false,
      countsHidden: false,
      markHidden: false,
      morningMarkHidden: false,
      submittedAtHidden: false,
    })).toEqual({
      showStatus: true,
      showCounts: true,
      showMark: true,
      showMorningMark: true,
      showSubmittedAt: true,
    });
  });

  it("removes every hidden field from the queue and preview", () => {
    expect(Object.values(lessonDirectoryFieldPolicy({
      statusHidden: true,
      countsHidden: true,
      markHidden: true,
      morningMarkHidden: true,
      submittedAtHidden: true,
    }))).toEqual([false, false, false, false, false]);
  });
});

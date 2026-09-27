import { describe, expect, it } from "vitest";

import { P, resolvePermissionKey } from "@/permissions";

import { canDiscoverGuide, type GuideReader } from "./discovery";
import { GUIDE_REGISTRY } from "./registry";

const byId = (id: string) => {
  const guide = GUIDE_REGISTRY.find((candidate) => candidate.id === id);
  if (!guide) throw new Error(`Missing guide fixture: ${id}`);
  return guide;
};

const reader = (codes: Parameters<typeof resolvePermissionKey>[0][], plan?: string[]): GuideReader => ({
  permissions: codes.map(resolvePermissionKey),
  hasCapability: (key) => !key || !plan || plan.includes(key),
});

describe("guide discovery", () => {
  it("shows a guide open to every signed-in reader without any key", () => {
    expect(canDiscoverGuide(byId("school.getting-started.basics"), reader([]))).toBe(true);
  });

  it("hides a guide from a reader whose role lacks its key", () => {
    const exams = byId("school.timetables.schedule-exams");
    expect(canDiscoverGuide(exams, reader([]))).toBe(false);
    // Exams read on their own key; the lesson grid's key does not reach them.
    expect(canDiscoverGuide(exams, reader([P.BROWSE_TIMETABLES]))).toBe(false);
    expect(canDiscoverGuide(exams, reader([P.BROWSE_EXAMS]))).toBe(true);
  });

  it("hides a guide whose every screen is outside the school's plan", () => {
    const exams = byId("school.timetables.schedule-exams");
    expect(canDiscoverGuide(exams, reader([P.BROWSE_EXAMS], ["calendar", "calendar_plus"]))).toBe(false);
    expect(canDiscoverGuide(exams, reader([P.BROWSE_EXAMS], ["calendar_advanced"]))).toBe(true);
  });

  it("keeps a guide that is about core screens whatever the plan", () => {
    expect(canDiscoverGuide(byId("school.getting-started.basics"), reader([], []))).toBe(true);
  });
});

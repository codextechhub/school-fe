import { describe, expect, it } from "vitest";

import type { AcademicSession } from "@/redux/services/academics/academics-types";
import type { Period } from "@/redux/services/calendar/calendar-types";
import {
  copyOfferFor,
  copyScopeFor,
  earlierSessions,
  periodsInScope,
  viewCoversScope,
} from "./bell-copy";

const session = (id: number, name: string, start: string): AcademicSession => ({
  id,
  name,
  start_date: start,
  end_date: start,
  status: "ARCHIVED",
  activated_at: null,
  archived_at: null,
  terms: [],
  term_count: 0,
});

const y2024 = session(1, "2024/2025", "2024-09-02");
const y2025 = session(2, "2025/2026", "2025-09-08");
const y2026 = session(3, "2026/2027", "2026-09-07");
const y2027 = session(4, "2027/2028", "2027-09-06");

describe("earlierSessions", () => {
  it("lists the years before this one, most recent first", () => {
    expect(earlierSessions([y2024, y2027, y2026, y2025], y2026).map((s) => s.name)).toEqual([
      "2025/2026",
      "2024/2025",
    ]);
  });

  it("has nothing before the first year, or without a year", () => {
    expect(earlierSessions([y2024, y2025], y2024)).toEqual([]);
    expect(earlierSessions([y2024, y2025], null)).toEqual([]);
  });
});

describe("copyScopeFor and periodsInScope", () => {
  const period = (id: number, branch: number | null | undefined): Period => ({
    id,
    label: `Period ${id}`,
    order_index: id,
    start_time: "08:00:00",
    end_time: "08:40:00",
    period_type: "LESSON",
    type_label: "Lesson",
    day_of_week: null,
    day_label: "Every day",
    is_active: true,
    ...(branch === undefined ? {} : { branch }),
  });
  const shared = period(1, null);
  const ikeja = period(2, 7);

  it("copies every period for a school-wide reader and at a one-branch school", () => {
    expect(copyScopeFor({ applies: true, wholeSchool: true })).toBe("school");
    expect(copyScopeFor({ applies: false, wholeSchool: false })).toBe("single");
    expect(periodsInScope([shared, ikeja], "school")).toHaveLength(2);
    expect(periodsInScope([period(3, undefined)], "single")).toHaveLength(1);
  });

  it("copies only a branch-bound reader's own branches, never the shared periods", () => {
    expect(copyScopeFor({ applies: true, wholeSchool: false })).toBe("branches");
    expect(periodsInScope([shared, ikeja], "branches")).toEqual([ikeja]);
  });

  it("covers the copy's reach only under All branches, or for a pinned reader", () => {
    expect(viewCoversScope({ scope: "school", branch: "all", pinned: false })).toBe(true);
    expect(viewCoversScope({ scope: "school", branch: 7, pinned: false })).toBe(false);
    expect(viewCoversScope({ scope: "branches", branch: 7, pinned: true })).toBe(true);
    expect(viewCoversScope({ scope: "branches", branch: 7, pinned: false })).toBe(false);
  });
});

describe("copyOfferFor", () => {
  const source = { session: { id: 2, name: "2025/2026" }, periodCount: 9 };
  const base = {
    canCreate: true,
    loading: false,
    coversScope: true,
    targetInScope: 0,
    viewEmpty: true,
    source,
  };

  it("offers the copy while the reach holds no periods this year", () => {
    expect(copyOfferFor(base)).toEqual({ kind: "offer", source });
  });

  it("hides it once the reach has periods anywhere", () => {
    expect(copyOfferFor({ ...base, targetInScope: 3, viewEmpty: false })).toBeNull();
  });

  it("points a school-wide reader looking at one branch to All branches instead", () => {
    expect(copyOfferFor({ ...base, coversScope: false })).toEqual({
      kind: "switch-view",
      source,
    });
    expect(copyOfferFor({ ...base, coversScope: false, viewEmpty: false })).toBeNull();
  });

  it("offers a branch-bound reader the copy though shared periods exist", () => {
    // Their branches are empty; the school's shared periods are not theirs to copy.
    expect(copyOfferFor({ ...base, targetInScope: 0, viewEmpty: false })).toEqual({
      kind: "offer",
      source,
    });
  });

  it("hides it from a reader who may not add periods, while loading, or with no source", () => {
    expect(copyOfferFor({ ...base, canCreate: false })).toBeNull();
    expect(copyOfferFor({ ...base, loading: true })).toBeNull();
    expect(copyOfferFor({ ...base, source: null })).toBeNull();
  });
});

/**
 * The walkthrough engine against a sample tour, and the real registry against
 * the engine's own validation.
 *
 * The sample stands in for a drawer flow: a list, a button that opens a form,
 * the form, and an optional panel routed around with a branch step. Testing it
 * here keeps these checks about the engine, so they hold whichever tours the
 * registry happens to carry.
 */
import { describe, expect, it } from "vitest";

import { GUIDE_REGISTRY } from "../registry";
import { WALKTHROUGH_REGISTRY } from "./registry";
import {
  followingContentStep,
  followingStepRoute,
  isOnStepRoute,
  isFollowingStepReady,
  loadWalkthroughProgress,
  resumableContentStep,
  saveWalkthroughProgress,
  validateWalkthroughs,
  walkthroughCompletionRoute,
  walkthroughStepRoute,
  walkthroughStorageKey,
} from "./engine";
import type { Walkthrough } from "./types";

const sample: Walkthrough = {
  id: "walkthrough.sample.enrol",
  guideId: "school.getting-started.basics",
  route: "/students",
  permissions: [],
  prerequisites: [],
  version: 3,
  steps: [
    { id: "welcome", title: "Welcome", body: "Start.", advance: "next" },
    { id: "summary-branch", kind: "branch", target: "sample.summary", whenPresent: "summary", whenMissing: "list" },
    { id: "summary", target: "sample.summary", title: "Summary", body: "Counts.", advance: "manual" },
    { id: "list", target: "sample.list", title: "List", body: "Rows.", advance: "manual" },
    { id: "open-form", target: "sample.new", title: "Open", body: "Select New.", advance: "target-click" },
    { id: "form", target: "sample.form", title: "Form", body: "Fill it in.", advance: "manual" },
    { id: "elsewhere", route: "/students/classes", target: "sample.classes", title: "Classes", body: "Place them.", advance: "manual" },
    { id: "complete", title: "Done", body: "Finished.", advance: "next" },
  ],
};

const memoryStorage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  };
};

describe("walkthrough engine", () => {
  it("keeps direct and proxy-session progress separate", () => {
    expect(walkthroughStorageKey("42:direct", sample.id)).not.toBe(
      walkthroughStorageKey("42:proxy-9", sample.id),
    );
  });

  it("discards stored progress when the walkthrough version changes", () => {
    const storage = memoryStorage();
    saveWalkthroughProgress(storage, "42:direct", {
      walkthroughId: sample.id,
      guideId: sample.guideId,
      version: sample.version,
      currentStepId: "list",
      completedStepIds: ["welcome"],
    });
    expect(loadWalkthroughProgress(storage, "42:direct", sample)?.currentStepId).toBe("list");
    expect(loadWalkthroughProgress(storage, "42:direct", { ...sample, version: sample.version + 1 })).toBeNull();
  });

  it("branches around an optional target that is not on screen", () => {
    expect(followingContentStep(sample, "welcome", () => true)?.id).toBe("summary");
    expect(followingContentStep(sample, "welcome", () => false)?.id).toBe("list");
  });

  it("rewinds saved form progress to the button that opens the form", () => {
    const present = new Set(["sample.new"]);
    expect(resumableContentStep(sample, "form", (target) => present.has(target))?.id).toBe("open-form");
    present.add("sample.form");
    expect(resumableContentStep(sample, "form", (target) => present.has(target))?.id).toBe("form");
  });

  it("waits for the form a target-click step opens before advancing", () => {
    const present = new Set<string>();
    expect(isFollowingStepReady(sample, "open-form", (target) => present.has(target))).toBe(false);
    present.add("sample.form");
    expect(isFollowingStepReady(sample, "open-form", (target) => present.has(target))).toBe(true);
  });

  it("carries a step's route forward to the steps after it", () => {
    expect(walkthroughStepRoute(sample, "form")).toBe("/students");
    expect(walkthroughStepRoute(sample, "elsewhere")).toBe("/students/classes");
    expect(walkthroughStepRoute(sample, "complete")).toBe("/students/classes");
  });

  it("treats a pattern route as any record of that kind", () => {
    const withProfile: Walkthrough = {
      ...sample,
      steps: [
        { id: "row", target: "sample.row", title: "Row", body: "Open one.", advance: "target-click" },
        { id: "profile", route: "/students/:id", target: "sample.tabs", title: "Tabs", body: "Read.", advance: "manual" },
      ],
    };
    expect(isOnStepRoute(withProfile, "profile", "/students/1042")).toBe(true);
    expect(isOnStepRoute(withProfile, "profile", "/students")).toBe(false);
    expect(isOnStepRoute(withProfile, "row", "/students")).toBe(true);
    expect(followingStepRoute(withProfile, "row")).toBe("/students/:id");
    expect(followingStepRoute(withProfile, "profile")).toBeUndefined();
  });

  it("refuses a walkthrough that would start on a record page", () => {
    expect(validateWalkthroughs([{ ...sample, route: "/students/:id" }], new Set([sample.guideId])))
      .toContain(`Start route names a record for ${sample.id}`);
  });

  it("returns a finished walkthrough to the guide that launched it", () => {
    const guide = GUIDE_REGISTRY.find((item) => item.id === sample.guideId)!;
    expect(walkthroughCompletionRoute(sample, GUIDE_REGISTRY)).toBe(`/support/guides/${guide.slug}`);
    expect(walkthroughCompletionRoute({ ...sample, guideId: "school.missing" }, GUIDE_REGISTRY)).toBe("/support/guides");
  });

  it("reports broken guide, route, version and branch contracts", () => {
    expect(validateWalkthroughs([{
      ...sample,
      guideId: "school.missing",
      version: 0,
      route: "students",
      steps: [{
        id: "broken-branch",
        kind: "branch",
        target: "missing.target",
        whenPresent: "nowhere",
        whenMissing: "nowhere-else",
      }],
    }], new Set())).toEqual([
      `Missing guide for ${sample.id}`,
      `Invalid route for ${sample.id}`,
      `Invalid version for ${sample.id}`,
      `Invalid branch in ${sample.id}:broken-branch`,
    ]);
  });

  it("rejects step searches and routes that are not well formed", () => {
    const issues = validateWalkthroughs([{
      ...sample,
      steps: [
        { id: "bad-search", title: "x", body: "x", search: "tab=all", advance: "manual" },
        { id: "bad-route", title: "x", body: "x", route: "students/classes", advance: "manual" },
      ],
    }], new Set([sample.guideId]));
    expect(issues).toContain(`Invalid search in ${sample.id}:bad-search`);
    expect(issues).toContain(`Invalid step route in ${sample.id}:bad-route`);
  });
});

describe("the walkthrough registry", () => {
  it("passes validation against the guide registry", () => {
    expect(validateWalkthroughs(
      WALKTHROUGH_REGISTRY,
      new Set(GUIDE_REGISTRY.map((guide) => guide.id)),
    )).toEqual([]);
  });

  it("is launched by the guide it names", () => {
    const unlinked = WALKTHROUGH_REGISTRY
      .filter((walkthrough) => GUIDE_REGISTRY.find((guide) => guide.id === walkthrough.guideId)?.walkthroughId !== walkthrough.id)
      .map((walkthrough) => walkthrough.id);
    expect(unlinked, "walkthroughs whose guide does not set walkthroughId to them").toEqual([]);
  });

  it("holds every target-click step until the UI it opens is ready", () => {
    for (const walkthrough of WALKTHROUGH_REGISTRY as readonly Walkthrough[]) {
      for (const step of walkthrough.steps) {
        if (step.kind === "branch" || step.advance !== "target-click") continue;
        expect(isFollowingStepReady(walkthrough, step.id, () => false), `${walkthrough.id}:${step.id}`).toBe(false);
      }
    }
  });
});

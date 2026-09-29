import { afterEach, describe, expect, it } from "vitest";

import {
  activeDisplayPrefs,
  bindDisplayStore,
  selectDisplayBranch,
  type DisplayState,
} from "./school-display";

const display = {
  time_zone: "Africa/Lagos",
  date_format: "YYYY_MM_DD",
  clock: "H24",
  branch_zones: { "7": "Africa/Nairobi" },
};

const stateWith = (overrides: Partial<DisplayState> = {}): DisplayState => ({
  auth: { tenant: { display }, branch_reach: { whole_tenant: true, branch_ids: [] } },
  academicsLens: { branch: "all" },
  ...overrides,
});

afterEach(() => bindDisplayStore(() => ({})));

describe("selectDisplayBranch", () => {
  it("follows the lens when it names one branch", () => {
    expect(selectDisplayBranch(stateWith({ academicsLens: { branch: 7 } }))).toBe(7);
  });

  it("uses a reader's only branch when the lens is on all", () => {
    const state = stateWith({
      auth: { tenant: { display }, branch_reach: { whole_tenant: false, branch_ids: [7] } },
    });
    expect(selectDisplayBranch(state)).toBe(7);
  });

  it("is the whole school otherwise", () => {
    expect(selectDisplayBranch(stateWith())).toBeNull();
    const two = stateWith({
      auth: { tenant: { display }, branch_reach: { whole_tenant: false, branch_ids: [7, 8] } },
    });
    expect(selectDisplayBranch(two)).toBeNull();
  });
});

describe("activeDisplayPrefs", () => {
  it("answers with the defaults before a store is bound", () => {
    expect(activeDisplayPrefs()).toEqual({
      timeZone: "Africa/Lagos",
      dateFormat: "D_MMM_YYYY",
      clock: "H12",
    });
  });

  it("reads the live session, following the lens unless told otherwise", () => {
    let state = stateWith();
    bindDisplayStore(() => state);
    expect(activeDisplayPrefs()).toEqual({
      timeZone: "Africa/Lagos",
      dateFormat: "YYYY_MM_DD",
      clock: "H24",
    });

    state = stateWith({ academicsLens: { branch: 7 } });
    expect(activeDisplayPrefs().timeZone).toBe("Africa/Nairobi");
    expect(activeDisplayPrefs(null).timeZone).toBe("Africa/Lagos");
    expect(activeDisplayPrefs(7).timeZone).toBe("Africa/Nairobi");
  });
});

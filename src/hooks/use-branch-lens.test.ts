import { describe, expect, it } from "vitest";
import { resolveBranchLens } from "./use-branch-lens";

/**
 * Holy Cross runs two branches. Chukwuemeka is the bursar at Main Branch only;
 * Ngozi works at both; the proprietor works school-wide.
 */
const MAIN = { id: 19, name: "Holy Cross College Main Branch" };
const ANNEX = { id: 31, name: "Holy Cross College Annex" };
const BRANCHES = [MAIN, ANNEX];

const resolve = (overrides: Partial<Parameters<typeof resolveBranchLens>[0]>) =>
  resolveBranchLens({
    branches: BRANCHES,
    reach: { whole_tenant: true, branch_ids: [] },
    homeBranchId: null,
    lens: "all",
    loading: false,
    ...overrides,
  });

describe("the branch picker", () => {
  it("is not offered to a reader who works in one branch of a two-branch school", () => {
    const lens = resolve({ reach: { whole_tenant: false, branch_ids: [MAIN.id] } });

    expect(lens.canChoose).toBe(false);
    expect(lens.pinnedBranch).toBe(MAIN.id);
    expect(lens.branch).toBe(MAIN.id);
    // The school still has branches, so screens keep their scope labels.
    expect(lens.applies).toBe(true);
  });

  it("offers a reader exactly the branches they work in", () => {
    const three = [...BRANCHES, { id: 40, name: "Holy Cross Lekki" }];
    const lens = resolve({
      branches: three,
      reach: { whole_tenant: false, branch_ids: [MAIN.id, ANNEX.id] },
    });

    expect(lens.canChoose).toBe(true);
    expect(lens.choices.map((b) => b.id)).toEqual([MAIN.id, ANNEX.id]);
    expect(lens.allLabel).toBe("All my branches");
    expect(lens.pinnedBranch).toBeNull();
  });

  it("offers a whole-school reader every branch", () => {
    const lens = resolve({});

    expect(lens.canChoose).toBe(true);
    expect(lens.choices).toEqual(BRANCHES);
    expect(lens.allLabel).toBe("All branches");
  });

  it("is not offered at a single-branch school", () => {
    const lens = resolve({ branches: [MAIN] });

    expect(lens.canChoose).toBe(false);
    expect(lens.applies).toBe(false);
    expect(lens.pinnedBranch).toBeNull();
  });

  it("falls back to the home posting until the session carries a reach", () => {
    const lens = resolve({ reach: null, homeBranchId: MAIN.id });

    expect(lens.canChoose).toBe(false);
    expect(lens.pinnedBranch).toBe(MAIN.id);
  });

  it("drops a lens that names a branch the reader may no longer choose", () => {
    const lens = resolve({
      branches: [...BRANCHES, { id: 40, name: "Holy Cross Lekki" }],
      reach: { whole_tenant: false, branch_ids: [MAIN.id, ANNEX.id] },
      lens: 40,
    });

    expect(lens.branch).toBe("all");
  });

  it("keeps the lens while the branch list is still loading", () => {
    expect(resolve({ branches: [], lens: ANNEX.id, loading: true }).branch).toBe(ANNEX.id);
  });
});

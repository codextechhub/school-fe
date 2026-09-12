import { describe, expect, it } from "vitest";

import {
  initialPanelState,
  panelOpenReducer,
  type PanelAction,
} from "./panel-open-state";

function run(...actions: PanelAction[]) {
  return actions.reduce(panelOpenReducer, initialPanelState());
}

describe("panelOpenReducer", () => {
  it("starts minimized", () => {
    expect(initialPanelState()).toEqual({
      expanded: false,
      sawBlocking: false,
    });
  });

  it("opens when blocking work first appears", () => {
    expect(run({ type: "data", hasBlocking: true })).toEqual({
      expanded: true,
      sawBlocking: true,
    });
  });

  it("does not reopen minimized work during repeated refreshes", () => {
    expect(
      run(
        { type: "data", hasBlocking: true },
        { type: "close" },
        { type: "data", hasBlocking: true },
        { type: "data", hasBlocking: true },
      ),
    ).toEqual({ expanded: false, sawBlocking: true });
  });

  it("reopens when blocking work clears and later returns", () => {
    expect(
      run(
        { type: "data", hasBlocking: true },
        { type: "close" },
        { type: "data", hasBlocking: false },
        { type: "data", hasBlocking: true },
      ),
    ).toEqual({ expanded: true, sawBlocking: true });
  });

  it("preserves an explicit maximized state without blocking work", () => {
    expect(
      run(
        { type: "data", hasBlocking: false },
        { type: "open" },
        { type: "data", hasBlocking: false },
      ),
    ).toEqual({ expanded: true, sawBlocking: false });
  });
});

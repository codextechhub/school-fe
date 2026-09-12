/**
 * Keeps the pinned state of Today's Focus separate from temporary hover expansion.
 *
 * Blocking work opens the panel when it first appears, but repeated dashboard
 * refreshes do not override a reader who has minimized it. The same blocker
 * must clear and return before it counts as a new reason to open the panel.
 */
export interface PanelState {
  expanded: boolean;
  sawBlocking: boolean;
}

export type PanelAction =
  | { type: "data"; hasBlocking: boolean }
  | { type: "open" }
  | { type: "close" };

export function initialPanelState(): PanelState {
  return { expanded: false, sawBlocking: false };
}

export function panelOpenReducer(
  state: PanelState,
  action: PanelAction,
): PanelState {
  switch (action.type) {
    case "data": {
      const firstBlockingFrame = action.hasBlocking && !state.sawBlocking;
      return {
        expanded: firstBlockingFrame ? true : state.expanded,
        sawBlocking: action.hasBlocking,
      };
    }
    case "open":
      return { ...state, expanded: true };
    case "close":
      return { ...state, expanded: false };
    default:
      return state;
  }
}

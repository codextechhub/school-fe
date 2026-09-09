import { type PayloadAction, createSelector, createSlice } from "@reduxjs/toolkit";
import type { RootStateType } from "@/redux/store";

// ─────────────────────────────────────────────────────────────────────────────
// The two header lenses: which branch you are looking at, and which year.
//
// They live in the store rather than in each screen's state because they are
// read by the header (the pills), by every academics query (the branch filter)
// and by the tree (the session label). A copy per screen would drift the moment
// somebody navigated, and the pill would then describe a filter that was no
// longer being applied.
//
// Not persisted. Academic navigation state is rebuilt from the current route;
// A lens restored from last week would silently narrow a list to a branch the
// reader had forgotten they picked.
// ─────────────────────────────────────────────────────────────────────────────

/** `"all"` is not a branch id - it means "do not narrow". */
export type BranchLens = number | "all";

interface LensState {
  branch: BranchLens;
  /**
   * The session the header pill names. Null until the overview or the session
   * list has told us which year is active - there is no sensible guess, and
   * guessing would label the tree with a year the school does not run.
   */
  sessionId: number | null;
  sessionName: string | null;
}

const initialState: LensState = {
  branch: "all",
  sessionId: null,
  sessionName: null,
};

const lensSlice = createSlice({
  name: "academicsLens",
  initialState,
  reducers: {
    reset: () => initialState,
    setBranchLens: (state, action: PayloadAction<BranchLens>) => {
      state.branch = action.payload;
    },
    setSessionLens: (
      state,
      action: PayloadAction<{ id: number; name: string } | null>,
    ) => {
      state.sessionId = action.payload?.id ?? null;
      state.sessionName = action.payload?.name ?? null;
    },
  },
});

export const { reset: resetLens, setBranchLens, setSessionLens } = lensSlice.actions;
export const lensSliceReducer = lensSlice.reducer;

export const selectBranchLens = (state: RootStateType): BranchLens =>
  state.academicsLens.branch;

/**
 * Memoised, because it builds an OBJECT.
 *
 * An inline selector returning a fresh `{ id, name }` is a new reference on
 * every call, so `useAppSelector` sees a change every render and re-renders
 * forever. Redux says so out loud in development - "returned a different
 * result when called with the same parameters" - and the churn is not
 * cosmetic: it left the guardians list showing skeletons over data that had
 * already arrived, because the render never settled long enough to commit the
 * loaded state.
 *
 * createSelector keeps the last result while `sessionId` and `sessionName` are
 * unchanged, so the reference is stable and the subscribers stop.
 */
export const selectSessionLens = createSelector(
  [
    (state: RootStateType) => state.academicsLens.sessionId,
    (state: RootStateType) => state.academicsLens.sessionName,
  ],
  (id, name) => ({ id, name }),
);

import { useCallback, useContext, useSyncExternalStore } from "react";
import { ReactReduxContext } from "react-redux";

import { bindFormatters, resolveDisplayPrefs, type DateFormatters } from "@/lib/dates";
import {
  selectDisplayBranch,
  selectSchoolDisplay,
  type DisplayState,
} from "@/lib/school-display";

const noSubscription = () => () => {};

/**
 * The school's date, time and clock choices, with every formatter bound to
 * them, for a component.
 *
 * Which zone applies:
 * - `branchId` a number: that branch's own zone if it keeps one, else the
 *   school's. Pass the record's `branch_id` when a screen shows one record.
 * - `branchId` null: the school's zone, for something school-wide.
 * - `branchId` omitted: follows the branch lens, so a list narrowed to one
 *   branch reads in that branch's zone and the whole-school view in the
 *   school's.
 *
 * Reads the session's tenant, which the login and `/me` keep current, and
 * re-renders when a setting changes. The returned object is the same one for
 * the same choices, so it is safe in a dependency array.
 *
 * The store is reached through react-redux's context rather than
 * `useAppSelector`, so a shared control (the date picker) rendered with no
 * store, as in a unit test, formats with the defaults instead of throwing.
 */
export function useSchoolDisplay(branchId?: number | string | null): DateFormatters {
  const store = useContext(ReactReduxContext)?.store;
  const subscribe = useCallback(
    (onChange: () => void) => (store ? store.subscribe(onChange) : noSubscription()),
    [store],
  );
  const read = () => {
    const state = (store?.getState() ?? {}) as DisplayState;
    const branch = branchId === undefined ? selectDisplayBranch(state) : branchId;
    return resolveDisplayPrefs(selectSchoolDisplay(state), branch);
  };
  return bindFormatters(useSyncExternalStore(subscribe, read, read));
}

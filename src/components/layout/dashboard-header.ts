/**
 * The runtime channel for the header title.
 *
 * DashboardLayout is an eager LAYOUT ROUTE: it renders once above the lazy page
 * chunks, so a page cannot pass it a title as a prop. Routes declare a static
 * one in `handle.title`, which covers this app's own screens because each of
 * them is one route with one name.
 *
 * It does not cover the finance and procurement areas. Those are dozens of
 * screens under two route parents, and the parent declares "Finance" for all of
 * them: without this the header read "Finance" on the dashboard, on Chart of
 * Accounts, on AR Invoices and on every other screen in the area, so the one
 * piece of chrome that says where you are said nothing. @xvs/finance already
 * computes the right name from its own nav and calls `useDashboardTitle` with
 * it; this is the end of that wire.
 *
 * An override is stamped with the location key it was set under and ignored the
 * moment the location changes, so a title cannot bleed into the next screen
 * even if a page forgets to clean up.
 */

import { createContext, useContext, useEffect, useRef } from "react";

/**
 * Where the header's back affordance goes when a route declares one: `true`
 * walks the history, a path string navigates there.
 *
 * A named destination is not the same as history-back. A reader who arrived at
 * a batch from the notification bell has no import list behind them, so walking
 * the history returns them to whatever they were reading before, while the
 * screen's own parent is the list of imports.
 */
export type BackSpec = true | string;

/** A runtime override, valid only for the location it was set under. */
export type HeaderOverride = {
  key: string;
  title?: string;
  back?: () => void;
};

/**
 * The override wins while the caller is still on the location that set it.
 * Once `locationKey` moves on the override is dead and the route's own handle
 * takes over immediately, with no stale-title flash in between.
 */
export function resolveHeaderTitle(
  handleTitle: string | undefined,
  override: HeaderOverride | null,
  locationKey: string,
): string | undefined {
  const live = override && override.key === locationKey ? override : null;
  return live?.title ?? handleTitle;
}

export type DashboardHeaderApi = {
  setTitle: (title?: string) => void;
  setBack: (back?: () => void) => void;
};

// Outside the layout (unit tests, isolated renders) the setters are inert
// rather than throwing, so a page component stays mountable on its own.
const INERT: DashboardHeaderApi = { setTitle: () => {}, setBack: () => {} };

export const DashboardHeaderContext = createContext<DashboardHeaderApi | null>(null);

export function useDashboardHeader(): DashboardHeaderApi {
  return useContext(DashboardHeaderContext) ?? INERT;
}

/**
 * Name the header from page state. Pass `undefined` while the data a title
 * depends on is still loading, and the route's `handle.title` shows through.
 */
export function useDashboardTitle(title?: string): void {
  const { setTitle } = useDashboardHeader();
  useEffect(() => {
    setTitle(title);
    return () => setTitle(undefined);
  }, [setTitle, title]);
}

/**
 * Resolve the back affordance the header renders, override before route handle.
 *
 * Same location rule as the title: an override set on one screen is dead the
 * moment the reader moves, so a closure cannot survive into the next page and
 * send them somewhere that screen knows nothing about.
 */
export function resolveHeaderBack(
  handleBack: BackSpec | undefined,
  override: HeaderOverride | null,
  locationKey: string,
): BackSpec | (() => void) | undefined {
  const live = override && override.key === locationKey ? override : null;
  return live?.back ?? handleBack;
}

/**
 * Send the header's back affordance somewhere only this screen can work out.
 *
 * Static destinations belong in the route's `handle.back`; this is for the ones
 * that close over state, such as returning to the list a drawer was opened
 * from. The handler is read through a ref at click time, so an inline arrow
 * function registers once rather than on every render.
 */
export function useDashboardBack(handler?: () => void): void {
  const { setBack } = useDashboardHeader();
  const latest = useRef(handler);
  useEffect(() => {
    latest.current = handler;
  });

  const enabled = Boolean(handler);
  useEffect(() => {
    if (!enabled) return;
    setBack(() => latest.current?.());
    return () => setBack(undefined);
  }, [setBack, enabled]);
}

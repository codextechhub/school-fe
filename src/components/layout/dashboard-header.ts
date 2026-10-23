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
 * Accounts, on Invoices and on every other screen in the area, so the one
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
  /** Hide (or restore) the app header bar below `lg`, for the current location. */
  setHiddenOnPhone: (hidden: boolean) => void;
};

// Outside the layout (unit tests, isolated renders) the setters are inert
// rather than throwing, so a page component stays mountable on its own.
const INERT: DashboardHeaderApi = {
  setTitle: () => {},
  setBack: () => {},
  setHiddenOnPhone: () => {},
};

/**
 * The round icon button in the app header: search, notifications, support.
 *
 * One class for all of them, outlined with the same thin ring as the account
 * avatar beside them, so the row reads as one set and a new button cannot
 * arrive looking different. The ring is drawn outside the box and takes no
 * space from it.
 */
export const headerIconButtonClass =
  "grid size-8.5 shrink-0 place-content-center rounded-full bg-gray-04 text-gray-01 ring-1 ring-white-02 transition-colors hover:bg-pry-01 hover:text-primary hover:ring-primary/25";

/**
 * The classes that take the app header bar off the screen on a phone.
 *
 * The bar is hidden only below `lg`, where a screen is a single pane that
 * brings its own header and its own way back. From `lg` up the bar stays, so a
 * two-pane screen keeps the page title, the search box and the account menu.
 */
export function appHeaderPhoneClass(hiddenKey: string | null, locationKey: string): string {
  return hiddenKey === locationKey ? "max-lg:hidden" : "";
}

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

/**
 * Hide the app header bar on a phone while this screen says so.
 *
 * For a screen whose single-pane layout supplies its own top bar with a back
 * arrow, such as an open conversation: the screen's header becomes the top of
 * the page, as in a chat app. The request is stamped with the location it was
 * made under, so it dies the moment the reader navigates and the bar returns on
 * the next screen even if this one forgets to clear it. The bar is never hidden
 * from `lg` up.
 */
export function useHeaderHiddenOnPhone(hidden: boolean): void {
  const { setHiddenOnPhone } = useDashboardHeader();
  useEffect(() => {
    setHiddenOnPhone(hidden);
    return () => setHiddenOnPhone(false);
  }, [setHiddenOnPhone, hidden]);
}

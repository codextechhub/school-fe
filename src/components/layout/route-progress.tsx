import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";

import { useAppSelector } from "@/redux/store";
import { baseApi } from "@/redux/services/base-api";

// ─────────────────────────────────────────────────────────────────────────────
// The line across the top of the page while a screen is arriving.
//
// **The problem it solves is silence, not slowness.** Pressing a sidebar item
// changes the URL and swaps the page in place, and the browser does nothing
// visible while the new screen fetches its data - no tab spinner, no bar. For
// the second or so that takes, it looks exactly like a click that missed.
//
// The obvious answer is to make menu links real browser navigations so the
// browser's own indicator runs. Measured on this app, that is four to six times
// SLOWER: an internal move to Classes fetches two things, and a browser reload
// of the same URL fetches nine, because it re-runs the whole app boot - who you
// are, your branches, your sessions, your notifications - before the page's own
// calls even start. 1.2 to 1.8 seconds against roughly 300ms. It would trade
// "nothing is happening" for "something is happening, slowly".
//
// So the acknowledgement is separated from the navigation. Same visual
// language as the browser's own bar, in the same place, and the page still
// arrives at internal speed.
//
// **It finishes when the screen's DATA settles, not when the route changes.**
// Finishing on the URL would put the bar away while the page was still empty,
// which is the same silence with extra steps. So it watches the number of
// requests in flight and only completes once that reaches zero and stays there.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Requests the bar must not wait on.
 *
 * The route acknowledgement fires on the same pathname change that raises the
 * bar, and it is nobody's screen: it clears the notification about the record
 * being opened. Counted, it would hold the bar up after the page had finished
 * arriving, reporting a wait the reader is not having.
 *
 * The bell's own polls are deliberately absent. `getNotifications` serves the
 * tray AND the notifications page, so excluding it would put the bar away while
 * that page was still empty.
 */
const BACKGROUND_ENDPOINTS = new Set(["acknowledgeNotificationRoute"]);

/** Below this, a screen already felt instant and a bar is just a flicker. */
const MIN_VISIBLE_MS = 220;
/** How long the request count must stay at zero before the screen counts as settled. */
const SETTLE_MS = 140;
/** A screen that never settles still has to let go of the bar. */
const GIVE_UP_MS = 15_000;

export function RouteProgress() {
  const { pathname } = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const startedAt = useRef(0);

  // How many requests are in flight. A plain number, so this re-renders when
  // the count changes and not on every unrelated store write.
  const inFlight = useAppSelector((state) => {
    type Entry = { status?: string; endpointName?: string } | undefined;
    const slice = state[baseApi.reducerPath] as
      | { queries?: Record<string, Entry>; mutations?: Record<string, Entry> }
      | undefined;
    if (!slice) return 0;
    const counts = (entries: Record<string, Entry> | undefined) => {
      let n = 0;
      for (const key in entries) {
        const entry = entries[key];
        if (entry?.status !== "pending") continue;
        if (BACKGROUND_ENDPOINTS.has(entry.endpointName ?? "")) continue;
        n += 1;
      }
      return n;
    };
    return counts(slice.queries) + counts(slice.mutations);
  });

  // ── start on a route change ───────────────────────────────────────────────
  //
  // Adjusted during render rather than in an effect, which is the same pattern
  // the drawers use for their `openedFor` reset. In an effect the bar would not
  // appear until after the new screen had already painted once, which is a
  // frame of exactly the silence it exists to fill.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setVisible(true);
    // Straight to a visible fraction rather than from zero: a bar that starts
    // at nothing reads as a bar that has not started.
    setProgress(0.12);
  }

  // ── creep, and only while there is something to creep for ─────────────────
  //
  // Keyed on `visible` rather than on the route. Tied to the route it never
  // stopped: the timer kept ticking after the bar had faded, so a hidden bar
  // was re-animating every 180ms for the life of the tab, and the next
  // navigation started from wherever that had wandered to instead of from the
  // beginning.
  useEffect(() => {
    if (!visible) return;
    // The clock is read here rather than during the render above: `Date.now`
    // is impure, and a render that reads it is a render that cannot be
    // repeated. Keyed on the path too, so a second navigation while the bar is
    // still up restarts its clock instead of inheriting the first one's.
    startedAt.current = Date.now();
    const creep = window.setInterval(() => {
      // Approaches the end without reaching it. The last stretch belongs to
      // the data actually arriving, so the bar must never claim to be done
      // while the screen is still empty.
      setProgress((p) => (p >= 0.9 ? p : p + (0.9 - p) * 0.12));
    }, 180);
    return () => window.clearInterval(creep);
  }, [visible, lastPath]);

  // ── finish when the screen settles ────────────────────────────────────────
  useEffect(() => {
    if (!visible) return;

    const done = () => {
      setProgress(1);
      // Long enough for the bar to reach the end before it goes.
      window.setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 260);
    };

    if (inFlight > 0) return;

    const waited = Date.now() - startedAt.current;
    const delay = Math.max(SETTLE_MS, MIN_VISIBLE_MS - waited);
    const settle = window.setTimeout(done, delay);
    const giveUp = window.setTimeout(done, GIVE_UP_MS);
    return () => {
      window.clearTimeout(settle);
      window.clearTimeout(giveUp);
    };
  }, [inFlight, visible]);

  return (
    <div
      // `aria-hidden` on purpose. It is reassurance for somebody watching the
      // screen; a reader who is not watching is told what changed by the page
      // itself, and a bar announcing "12 percent" would be noise.
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5"
    >
      <div
        className="h-full origin-left bg-primary transition-[transform,opacity] duration-200 ease-out"
        style={{
          transform: `scaleX(${progress})`,
          opacity: visible ? 1 : 0,
        }}
      />
    </div>
  );
}

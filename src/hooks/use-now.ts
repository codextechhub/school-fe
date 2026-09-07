import { useSyncExternalStore } from "react";

/**
 * Reading Date.now() directly during render is impure - the React Compiler may
 * memoise the value into stale UI. useSyncExternalStore is the sanctioned way
 * to read a changing external value (here: the wall clock) during render.
 *
 * The snapshot is quantised to the tick interval so it stays referentially
 * stable between ticks (getSnapshot must return the same value until the
 * store "changes"). A single shared interval serves all subscribers and stops
 * when the last one unmounts.
 */
const TICK_MS = 30_000;

const subscribers = new Set<() => void>();
let interval: ReturnType<typeof setInterval> | null = null;

const subscribe = (cb: () => void) => {
  subscribers.add(cb);
  if (!interval) {
    interval = setInterval(() => subscribers.forEach((s) => s()), TICK_MS);
  }
  return () => {
    subscribers.delete(cb);
    if (subscribers.size === 0 && interval) {
      clearInterval(interval);
      interval = null;
    }
  };
};

const getSnapshot = () => Math.floor(Date.now() / TICK_MS) * TICK_MS;

/**
 * Current time in ms, quantised to 30-second ticks. Use instead of calling
 * Date.now() in render bodies or useMemo callbacks - it is pure from React's
 * point of view and re-renders subscribers when the tick advances, so
 * time-based filters ("last hour", countdowns) stay live instead of freezing
 * at whatever instant the memo last ran.
 */
export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot);
}

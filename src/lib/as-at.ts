import { createContext, useCallback, useContext } from "react";
import { useSearchParams } from "react-router";

/**
 * Reading a record "as at" an earlier day.
 *
 * A profile page keeps the chosen day in its address as `?as_at=YYYY-MM-DD`,
 * so a past view is a link a colleague can open and see the same thing. Every
 * read behind the page passes the day to the API, which answers each one as it
 * stood at the end of that day, in the same shape as the live read. No day, or
 * today, is the live record.
 *
 * The API refuses a day before the record's history starts (the response names
 * that day as `history_starts`), so the page offers nothing earlier.
 */

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** What a past read says about the day it answers for. */
export interface AsAtMeta {
  date: string;
  history_starts: string;
  /** The photograph held that day has been replaced since, so it is not shown. */
  photo_retired?: boolean;
}

/** A record id, optionally with the day it is read as at. */
export type RecordArg = number | { id: number; asAt?: string };

/** The id and the day a {@link RecordArg} names. */
export function recordArgParts(arg: RecordArg): { id: number; asAt?: string } {
  return typeof arg === "number" ? { id: arg } : arg;
}

/** A GET of one profile read, carrying `?as_at=` when a day is chosen. */
export function recordQuery(url: (id: number) => string, arg: RecordArg) {
  const { id, asAt } = recordArgParts(arg);
  return { url: url(id), method: "GET" as const, params: asAt ? { as_at: asAt } : undefined };
}

/** Today's date, as the API and the picker spell it. */
export function todayIso(): string {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

/**
 * The day in the page's `?as_at=`, and a setter that writes or clears it.
 *
 * A malformed value, today and a future day all read as the live record, so a
 * hand-edited address never puts the page into a state the API would refuse.
 */
export function useAsAtParam(): [string | undefined, (day?: string) => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get("as_at") ?? "";
  const asAt = ISO_DAY.test(raw) && raw < todayIso() ? raw : undefined;
  const setAsAt = useCallback(
    (day?: string) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (day && day < todayIso()) next.set("as_at", day);
          else next.delete("as_at");
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );
  return [asAt, setAsAt];
}

/** The day a profile is being read as at, for the tabs inside it. */
export const AsAtContext = createContext<string | undefined>(undefined);

/** The day the surrounding profile is read as at, or undefined when it is live. */
export function useAsAt(): string | undefined {
  return useContext(AsAtContext);
}

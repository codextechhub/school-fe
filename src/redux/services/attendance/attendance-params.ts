/**
 * Every query param the attendance API is sent, built in one place.
 *
 * Kept apart from attendance-api.ts so the rules can be asserted without the
 * store, and because they are the rules a screen must not be trusted to
 * remember:
 *
 *   1. **"all" is dropped, not sent.** The server's default is every branch the
 *      caller can see, and `branch=all` would be read as a branch reference and
 *      answered with a 404.
 *   2. **An omitted date is today at the school.** The server works today out
 *      in the school's own time zone, which is the day a register belongs to,
 *      so a screen showing today sends no date at all rather than the device's.
 */
import type { DayArgs } from "./attendance-types";

export type Params = Record<string, string | number>;

export function dayParams(args: DayArgs = {}): Params {
  const { date, branch } = args;
  return {
    ...(date ? { date } : {}),
    ...(branch !== undefined && branch !== "all" ? { branch } : {}),
  };
}

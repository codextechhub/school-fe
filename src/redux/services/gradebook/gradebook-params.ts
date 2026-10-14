/**
 * Every term-scoped query param the gradebook API is sent, built in one place.
 *
 * Kept apart from the endpoints so the rules can be asserted without the
 * store, and because they are the rules a screen must not be trusted to
 * remember:
 *
 *   1. **"all" is dropped, not sent.** The server's default is every branch the
 *      caller can see, and `branch=all` would be read as a branch reference and
 *      answered with a 404.
 *   2. **An omitted term is the current one.** The server picks the school's
 *      current term by its own clock, so a screen showing this term sends no
 *      term at all rather than guessing one from the device's date.
 */
import type { TermArgs } from "./gradebook-types";

export type Params = Record<string, string | number>;

export function termParams(args: TermArgs = {}): Params {
  const { term, branch } = args;
  return {
    ...(term !== undefined ? { term } : {}),
    ...(branch !== undefined && branch !== "all" ? { branch } : {}),
  };
}

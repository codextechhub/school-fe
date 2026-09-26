/**
 * `gray-03` and `gray-04` are surface tints, never ink.
 *
 * They are near-white (`#F7F7F7`, `#F9F9F8`) and exist to fill a card, a chip
 * or a track. Their names sit in the same numbered scale as the text greys,
 * though, so they read like a lighter step of `gray-02` and get reached for as
 * an icon or text colour - where they land on a white box and vanish. A
 * calendar icon, a dropdown arrow and a "Not on file" value have all gone
 * invisible this way.
 *
 * This fails on any `text-gray-03` or `text-gray-04` in the app's source and
 * names the file and line. Muted text and icons want `gray-05`; a deliberately
 * faint mark wants `gray-02`. Fills and strokes are left alone, because a track
 * or background drawn in a tint is what the tint is for.
 */
import { describe, expect, it } from "vitest";

const INK_ON_A_TINT = /\btext-gray-0[34]\b/;

const sources = import.meta.glob<string>(
  ["/src/**/*.{ts,tsx}", "!/src/**/*.test.{ts,tsx}"],
  { query: "?raw", import: "default", eager: true },
);

describe("surface tints", () => {
  it("are never used as a text or icon colour", () => {
    const offenders = Object.entries(sources).flatMap(([file, text]) =>
      text
        .split("\n")
        .flatMap((line, i) => (INK_ON_A_TINT.test(line) ? [`${file}:${i + 1}`] : [])),
    );
    expect(offenders).toEqual([]);
  });
});

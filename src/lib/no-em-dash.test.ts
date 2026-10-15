/**
 * The app writes no em dash (U+2014), in code, comments, tests or copy.
 *
 * It is a house rule of the product's writing, and it reaches screen text in
 * the places nobody reads as prose: an empty table cell, a missing figure, a
 * fallback in a template string. An empty value is a plain hyphen (`-`), as
 * `formatDate` gives it; a sentence takes a comma, a colon or parentheses.
 *
 * This fails on any em dash in the app's source, tests included, and names
 * the file and line. The character is spelt as an escape here so this file
 * does not trip itself.
 */
import { describe, expect, it } from "vitest";

const EM_DASH = "—";

const sources = import.meta.glob<string>(["/src/**/*.{ts,tsx,css}"], {
  query: "?raw",
  import: "default",
  eager: true,
});

describe("em dashes", () => {
  it("appear nowhere in the app's source", () => {
    const offenders = Object.entries(sources).flatMap(([file, text]) =>
      text.split("\n").flatMap((line, i) => (line.includes(EM_DASH) ? [`${file}:${i + 1}`] : [])),
    );
    expect(offenders).toEqual([]);
  });
});

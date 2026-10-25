import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { SearchSelect, type SearchSelectOption } from "./search-select";

/**
 * A searchable select whose options come from a server search.
 *
 * Lagoon View's administrator opens JSS1 A's class teacher. Kunle Adebayo holds
 * it, but the first results the directory sends do not include him, so the box
 * must still read his name. She searches, picks Hauwa Sanni, and searches again:
 * Hauwa is no longer among the results, and the box must still read Hauwa.
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const KUNLE = { value: "133", label: "Kunle Adebayo - Class Teacher" };
const HAUWA = { value: "152", label: "Hauwa Sanni - English Teacher" };
const BUKKY = { value: "153", label: "Bukky Alabi - Teacher" };

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

function draw(options: SearchSelectOption[], value: string, selectedLabel?: string) {
  act(() =>
    root.render(
      <SearchSelect
        id="teacher"
        options={options}
        value={value}
        selectedLabel={selectedLabel}
        onSearchChange={() => {}}
      />,
    ),
  );
}

const input = () => host.querySelector<HTMLInputElement>("#teacher")!;

describe("SearchSelect fed by a server search", () => {
  it("names the current holder before any result includes them", () => {
    draw([BUKKY], KUNLE.value, "Kunle Adebayo");
    expect(input().value).toBe("Kunle Adebayo");
  });

  it("keeps the chosen name once the results move on without it", () => {
    draw([HAUWA, BUKKY], HAUWA.value);
    expect(input().value).toBe(HAUWA.label);

    draw([BUKKY], HAUWA.value);
    expect(input().value).toBe(HAUWA.label);
  });

  it("prefers the name it has seen over the fallback label", () => {
    draw([KUNLE], KUNLE.value, "Kunle Adebayo");
    draw([BUKKY], KUNLE.value, "Kunle Adebayo");
    expect(input().value).toBe(KUNLE.label);
  });

  it("reads empty for nobody", () => {
    draw([HAUWA], "");
    expect(input().value).toBe("");
  });
});

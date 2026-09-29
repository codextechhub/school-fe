import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Field } from "./entity-drawer";

/** The drawer field names its control for a screen reader, and reads its error with it. */
describe("Field", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("points its label at the one control inside it", () => {
    act(() => root.render(<Field label="Class name"><input /></Field>));
    const label = container.querySelector("label")!;
    const input = container.querySelector("input")!;
    expect(input.id).not.toBe("");
    expect(label.htmlFor).toBe(input.id);
  });

  it("keeps a control's own id, and announces the error with it", () => {
    act(() => root.render(<Field label="Code" error="Give it a code."><input id="code" /></Field>));
    const input = container.querySelector("input")!;
    expect(input.id).toBe("code");
    expect(container.querySelector("label")!.htmlFor).toBe("code");
    expect(input.getAttribute("aria-describedby")).toBe("code-error");
    expect(container.querySelector("#code-error")!.textContent).toBe("Give it a code.");
  });

  it("leaves a group of controls with a heading label only", () => {
    act(() => root.render(<Field label="Scope"><button>One</button><button>Two</button></Field>));
    expect(container.querySelector("label")!.htmlFor).toBe("");
  });
});
